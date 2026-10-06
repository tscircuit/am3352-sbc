/** Route timing groups around proven strobe/clock corridors, DDR first. */
import {BusLanesSolver} from '@tscircuit/bus-lanes-solver';
import{readFileSync,writeFileSync}from'node:fs';
import{compactRoutingInput}from'../design/compact-routing-input';
import{auditDdrGeometry,assertDdrConstraints}from'../design/ddr-compliance';
const stem=process.argv[2]??'output/ram-seeds/pairs-2';
const required=JSON.parse(readFileSync('output/ddr-current.srj.json','utf8'));
const full:any=compactRoutingInput(JSON.parse(readFileSync(stem+'.srj.json','utf8')));
full.buses=required.buses.filter((b:any)=>b.connectionNames.length>1);full.traces=[];
const original:any[]=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
assertDdrConstraints(full,names);
const input=structuredClone(full),escapes:any[]=[],lanes:any[]=[];
for(const t of original){
 const a=t.route.findIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top'),b=t.route.findLastIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top');
 escapes.push({...t,pcb_trace_id:t.pcb_trace_id+'_before',route:t.route.slice(0,a+1)},{...t,pcb_trace_id:t.pcb_trace_id+'_after',route:t.route.slice(b)});
 const route=t.route.slice(a,b+1);input.connections.find((c:any)=>c.name===t.connection_name).pointsToConnect=[route[0],route.at(-1)];
 lanes.push({...t,route,coupledSection:t.coupledSection?.map((i:number)=>i-a),curvedSegments:t.curvedSegments?.map((i:number)=>i-a)});
}
const completed:any[]=[],results:any[]=[];
const groups=[...full.buses,{name:'RESET',connectionNames:full.connections.filter((c:any)=>!full.buses.some((b:any)=>b.connectionNames.includes(c.name))).map((c:any)=>c.name)}];
for(const group of groups){
 const pairs=full.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>group.connectionNames.includes(n)));
 const preserved=lanes.filter(t=>pairs.some((p:any)=>p.connectionNames.includes(t.connection_name)));
 const layer=preserved[0]?.route[0].layer??'inner2';
 for(const t of escapes)if(group.connectionNames.includes(t.connection_name))for(const p of t.route){if(p.route_type==='via'){if(p.from_layer!=='top')p.from_layer=layer;if(p.to_layer!=='top')p.to_layer=layer;}else if(p.layer!=='top')p.layer=layer;}
 const local=structuredClone({...input,connections:input.connections.filter((c:any)=>group.connectionNames.includes(c.name)),buses:group.maxLengthSkew!==undefined?[group]:[],differentialPairs:pairs,traces:[...escapes,...completed]});
 for(const c of local.connections)for(const p of c.pointsToConnect)p.layer=layer;
 const solver:any=new BusLanesSolver(local,{maxSearchIterations:100000,maxLaneIterations:20000,smoothTuning:true,denseSearch:false});
 solver.step();if(solver.failed)throw Error(solver.error);
 if(preserved.length){solver.traces=structuredClone(preserved);solver.pairIndex=pairs.length;solver.phase='coupled_pairs';}
 const start=Date.now(),deadline=start+Number(process.env.DDR_STAGE_MS??60000);let nextLog=start+15000;
 while(!solver.solved&&!solver.failed&&Date.now()<deadline){solver.step();if(Date.now()>nextLog){console.log(JSON.stringify({group:group.name,phase:solver.phase,partial:solver.traces.length,elapsedMs:Date.now()-start}));nextLog=Date.now()+15000;}}
 results.push({group:group.name,layer,solved:solver.solved,failed:solver.failed,error:solver.error,phase:solver.phase,elapsedMs:Date.now()-start});console.log(JSON.stringify(results.at(-1)));
 if(!solver.solved)break;completed.push(...solver.traces);
}
let audit:any=null;
if(completed.length===full.connections.length){
 const routes=completed.map(t=>{const a=escapes.find(e=>e.pcb_trace_id===t.pcb_trace_id+'_before').route,b=escapes.find(e=>e.pcb_trace_id===t.pcb_trace_id+'_after').route;return {...t,route:[...a.slice(0,-1),...t.route,...b.slice(1)],coupledSection:t.coupledSection?.map((i:number)=>i+a.length-1),curvedSegments:t.curvedSegments?.map((i:number)=>i+a.length-1)};});
 audit=auditDdrGeometry(full,routes,names);writeFileSync(stem+'.pair-corridors.routes.json',JSON.stringify(routes));writeFileSync(stem+'.pair-corridors.srj.json',JSON.stringify(full));
}
writeFileSync(stem+'.pair-corridors.json',JSON.stringify({results,routeCount:completed.length,audit,accepted:false},null,2));
