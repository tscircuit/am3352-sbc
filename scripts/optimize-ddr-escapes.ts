/** Candidate-only joint escape and carrier optimization. */
import {BusLanesSolver} from '@tscircuit/bus-lanes-solver';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {auditDdrGeometry} from '../design/ddr-compliance';
import {ddrTimingGroups} from '../design/ddr-rules';
const modulePath=resolve('output/ddr-compliance/escape-internals.mjs');
writeFileSync(modulePath,readFileSync('node_modules/@tscircuit/bus-lanes-solver/dist/index.js','utf8')+'\nexport {routeAlternateSignalDogbones};\n');
const {routeAlternateSignalDogbones}=await import(pathToFileURL(modulePath).href);
const stem=process.argv[2]??'output/ddr-compliance/ripup-57.shortened';
const input=JSON.parse(readFileSync(stem+'.srj.json','utf8'));
let routes:any[]=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const sets:number[][]=JSON.parse(process.env.DDR_ESCAPE_SETS??'[[40,11],[40,3],[40,29],[29,11],[39,11],[31,41]]');
const length=(t:any)=>t.route.slice(1).reduce((s:number,p:any,i:number)=>s+(p.route_type==='wire'&&t.route[i].route_type==='wire'&&p.layer===t.route[i].layer?Math.hypot(p.x-t.route[i].x,p.y-t.route[i].y):0),0);
const audit=()=>auditDdrGeometry(input,routes,names);
const objective=(rs:any[])=>{
 const a=auditDdrGeometry(input,rs,names);
 return a.measurements.reduce((sum,m)=>{const groupName=ddrTimingGroups.find(g=>g.signals.includes(m.name))?.name;const group=a.groups.find(g=>g.name===groupName);return sum+Math.max(0,m.lengthMm-(group?.maximumMm??Infinity))*100+m.lengthMm;},0);
};
const events:any[]=[];
for(const ids of sets){
 const selected=ids.map(n=>'source_trace_'+n);
 if(input.differentialPairs.some((p:any)=>p.connectionNames.some((n:string)=>selected.includes(n))))throw Error('This optimizer only handles ordinary signals');
 for(let attempt=0;attempt<4;attempt++)for(let mask=0;mask<2**selected.length;mask++){
  const retained=routes.filter(t=>!selected.includes(t.connection_name));
  const local={...input,buses:[],differentialPairs:[],connections:input.connections.filter((c:any)=>selected.includes(c.name)),traces:retained};
  const targetLayers=new Map(selected.map((n,i)=>[n,mask&(1<<i)?'inner2':'inner1']));
  const start=Date.now();
  try{
   const escape=routeAlternateSignalDogbones(local,{targetLayers,viaDiameter:.3,viaHoleDiameter:.15,traceWidth:.1,clearance:.1,allowBlindAndBuriedVias:false},attempt);
   const carrier={...local,connections:escape.connections,traces:[...retained,...escape.traces]};
   const solver=new BusLanesSolver(carrier,{maxSearchIterations:20000,maxLaneIterations:5000,smoothTuning:false});
   const deadline=Date.now()+Number(process.env.DDR_ESCAPE_MS??1500);
   while(!solver.solved&&!solver.failed&&Date.now()<deadline)solver.step();
   if(!solver.solved){console.log(JSON.stringify({ids,attempt,mask,solved:false,error:solver.error,elapsedMs:Date.now()-start}));continue;}
   const complete=solver.traces.map((t:any)=>{
    const ends=escape.traces.filter((e:any)=>e.connection_name===t.connection_name);
    const a=ends.find((e:any)=>Math.hypot(e.route.at(-1).x-t.route[0].x,e.route.at(-1).y-t.route[0].y)<1e-5);
    const b=ends.find((e:any)=>e!==a);if(!a||!b)throw Error('Missing escape');
    return {...t,route:[...a.route.slice(0,-1),...t.route,...b.route.toReversed().slice(1).map((p:any)=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p)]};
   });
   const candidate=[...retained,...complete];
   const gain=objective(routes)-objective(candidate);
   if(gain>.01){const event={ids,attempt,mask,gain,lengths:complete.map((t:any)=>({name:names[t.connection_name],length:length(t)}))};events.push(event);routes=candidate;console.log(JSON.stringify({acceptedImprovement:event}));}
  }catch(e){console.log(JSON.stringify({ids,attempt,mask,error:String(e),elapsedMs:Date.now()-start}));}
 }
 writeFileSync(stem+'.escapes.routes.json',JSON.stringify(routes));writeFileSync(stem+'.escapes.srj.json',JSON.stringify(input));writeFileSync(stem+'.escapes.json',JSON.stringify({events,audit:audit()},null,2));
 console.log(JSON.stringify({completedSet:ids,groups:audit().groups}));
}
