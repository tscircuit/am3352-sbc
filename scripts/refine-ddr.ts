import {BusLanesSolver,type SimpleRouteJson} from "@tscircuit/bus-lanes-solver";
import {readFile,writeFile} from "node:fs/promises";
const stem=process.argv[2]??"output/ram-seeds/pairs-2";
const input:any=JSON.parse(await readFile(`${stem}.srj.json`,"utf8"));
const original:any=JSON.parse(await readFile("output/ddr.srj.json","utf8"));
const traces:any[]=JSON.parse(await readFile(`${stem}.routes.json`,"utf8"));
input.buses=original.buses.filter((b:any)=>b.connectionNames.length>1);
const escapes:any[]=[];
const lanes=traces.map(t=>{
 const start=t.route.findIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");
 const end=t.route.findLastIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");
 const route=t.route.slice(start,end+1);
 escapes.push({...t,pcb_trace_id:t.pcb_trace_id+"_a",route:t.route.slice(0,start+1)},{...t,pcb_trace_id:t.pcb_trace_id+"_b",route:t.route.slice(end)});
 const c=input.connections.find((c:any)=>c.name===t.connection_name);c.pointsToConnect=[route[0],route.at(-1)];
 return {...t,route,coupledSection:t.coupledSection?.map((n:number)=>n-start),curvedSegments:t.curvedSegments?.map((n:number)=>n-start)};
});
input.traces=[...input.traces??[],...escapes];
const solver=BusLanesSolver.forRefinement(input as SimpleRouteJson,lanes,{maxSearchIterations:150000,maxLaneIterations:10000,smoothTuning:process.env.REFINE_SMOOTH!=="0"});
const started=Date.now();
while(!solver.solved&&!solver.failed&&Date.now()-started<120000)solver.step();
await writeFile(`${stem}.refinement.json`,JSON.stringify({solved:solver.solved,failed:solver.failed,error:solver.error,phase:solver.phase,stats:solver.stats},null,2));
console.log({solved:solver.solved,error:solver.error,phase:solver.phase});
if(solver.solved){
 const complete=solver.traces.map(t=>{
  const before=escapes.find(e=>e.pcb_trace_id===t.pcb_trace_id+"_a");
  const after=escapes.find(e=>e.pcb_trace_id===t.pcb_trace_id+"_b");
  return {...t,route:[...before.route.slice(0,-1),...t.route,...after.route.slice(1)]};
 });
 await writeFile(`${stem}.matched.routes.json`,JSON.stringify(complete,null,2));
}
