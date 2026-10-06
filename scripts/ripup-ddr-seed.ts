/** Experimental connectivity repair. Never installs candidates in the board.
 * Complete physical paths must pass auditDdrGeometry and native DRC separately.
 */
import { BusLanesSolver } from '@tscircuit/bus-lanes-solver';
import { readFileSync, writeFileSync } from 'node:fs';
import { auditDdrGeometry, assertDdrConstraints } from '../design/ddr-compliance';
const partial=JSON.parse(readFileSync('output/ddr-compliance/rescue-partial.json','utf8'));
const current=JSON.parse(readFileSync('output/ddr-current.srj.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const full={...partial.layerInput,buses:current.buses,traces:[],connections:partial.layerInput.connections.map((c:any)=>{
 const source=current.connections.find((s:any)=>s.name===c.name);
 return {...c,pointsToConnect:partial.escapes.filter((e:any)=>e.connection_name===c.name).map((e:any,i:number)=>({...source.pointsToConnect[i],...e.route[0]}))};
})};
assertDdrConstraints(full,names);
const present=new Set(partial.routes.map((t:any)=>t.connection_name));
const missing:string[]=full.connections.filter((c:any)=>!present.has(c.name)).map((c:any)=>c.name);
const singles=partial.routes.filter((t:any)=>!full.differentialPairs.some((p:any)=>p.connectionNames.includes(t.connection_name)));
const sets:string[][]=process.env.DDR_RIPUP_SETS?JSON.parse(process.env.DDR_RIPUP_SETS).map((group:(string|number)[])=>group.map(n=>typeof n==='number'?'source_trace_'+n:n)):singles.map((t:any)=>[t.connection_name]);
for(const group of sets)for(const name of group)if(!full.connections.some((c:any)=>c.name===name))throw Error(`Unknown rip-up signal: ${name}`);
const limitMs=Number(process.env.DDR_RIPUP_MS??2500);
let count=0;
for(const remove of sets){
 const pendingNames=[...new Set([...missing,...remove])];
 for(const p of full.differentialPairs)if(p.connectionNames.some((n:string)=>pendingNames.includes(n)))for(const n of p.connectionNames)if(!pendingNames.includes(n))pendingNames.push(n);
 for(let mask=0;mask<2**missing.length;mask++){
  const missingLayers=new Map(missing.map((n,i)=>[n,mask&(1<<i)?'inner2':'inner1']));
  const layer=[...missingLayers.values()].join('/');
  const input=structuredClone(partial.layerInput);
  input.buses=[];
  input.connections=input.connections.filter((c:any)=>pendingNames.includes(c.name));
  input.differentialPairs=input.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>pendingNames.includes(n)));
  for(const c of input.connections)if(missing.includes(c.name))for(const p of c.pointsToConnect)p.layer=missingLayers.get(c.name);
  const retained=partial.routes.filter((t:any)=>!pendingNames.includes(t.connection_name));
  const escapes=structuredClone(partial.escapes);
  for(const t of escapes)if(missing.includes(t.connection_name))for(const p of t.route){if(p.route_type==='via')p.to_layer=missingLayers.get(t.connection_name);else if(p.layer!=='top')p.layer=missingLayers.get(t.connection_name);}
  input.traces=[...retained,...escapes];
  const options={maxSearchIterations:50000,maxLaneIterations:10000,smoothTuning:true};
  const solver=new BusLanesSolver(input,options,new Map<string,string[]>(pendingNames.map(n=>[n,['inner1','inner2']])));
  const start=Date.now();
  while(!solver.solved&&!solver.failed&&Date.now()-start<limitMs)solver.step();
  const result:any={...partial.pose,pose:partial.pose,solverVersion:'0.0.11',removed:pendingNames.map(n=>names[n]),layer,solved:solver.solved,failed:solver.failed,error:solver.error,elapsedMs:Date.now()-start};
  if(solver.solved){
   const lanes=[...retained,...solver.traces];
   const routes=lanes.map((lane:any)=>{
    const ends=escapes.filter((e:any)=>e.connection_name===lane.connection_name);
    const before=ends.find((e:any)=>Math.hypot(e.route.at(-1).x-lane.route[0].x,e.route.at(-1).y-lane.route[0].y)<1e-5);
    const after=ends.find((e:any)=>e!==before);if(!before||!after)throw Error('Missing pad escape');
    const actualLayer=lane.route[0].layer;
    const adapt=(r:any[])=>r.map(p=>p.route_type==='via'?{...p,to_layer:actualLayer}:p.layer!=='top'?{...p,layer:actualLayer}:p);
    const a=adapt(before.route),b=adapt(after.route).toReversed().map(p=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
    return {...lane,route:[...a.slice(0,-1),...lane.route,...b.slice(1)],coupledSection:lane.coupledSection?.map((i:number)=>i+a.length-1),curvedSegments:lane.curvedSegments?.map((i:number)=>i+a.length-1)};
   });
   result.audit=auditDdrGeometry(full,routes,names);
   result.routeCount=routes.length;result.geometricTimingPassed=result.audit.pass;
   const stem=`output/ddr-compliance/${process.env.DDR_RIPUP_NAME??'ripup'}-${count}`;
   writeFileSync(stem+'.routes.json',JSON.stringify(routes));writeFileSync(stem+'.srj.json',JSON.stringify(full));
   const carrierInput=structuredClone({...partial.layerInput,buses:current.buses,traces:[]});
   for(const t of routes){
    const a=t.route.findIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top'),b=t.route.findLastIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top');
    carrierInput.connections.find((c:any)=>c.name===t.connection_name).pointsToConnect=[t.route[a],t.route[b]];
    carrierInput.traces.push({...t,pcb_trace_id:t.pcb_trace_id+'_before',route:t.route.slice(0,a+1)},{...t,pcb_trace_id:t.pcb_trace_id+'_after',route:t.route.slice(b)});
   }
   writeFileSync(stem+'.carrier.json',JSON.stringify({input:carrierInput,lanes}));
   writeFileSync(stem+'.json',JSON.stringify(result,null,2));
   console.log(JSON.stringify(result));
   process.exit(0);
  }
  console.log(JSON.stringify(result));count++;
 }
}
