import { BusLanesSolver, type SimpleRouteJson, type Trace } from "@tscircuit/bus-lanes-solver";
import {readFileSync,writeFileSync} from "node:fs";
import {assertDdrConstraints,auditDdrGeometry} from "../design/ddr-compliance";
import placement from "../design/ram-placement.json";
const original:SimpleRouteJson=JSON.parse(readFileSync("output/ddr-current.srj.json","utf8"));
const cj:any[]=JSON.parse(readFileSync("output/board-ddr.circuit.json","utf8"));
const names=Object.fromEntries(cj.filter(e=>e.type==="source_trace").map(e=>[e.source_trace_id,e.name]));
assertDdrConstraints(original,names);
const input=structuredClone(original);
input.allowedLayers=["inner1","inner2"];
input.buses=input.buses?.filter(b=>b.connectionNames.length>1);
input.obstacles=input.obstacles.filter((o:any)=>!o.isCopperPour);
const fixedPower=process.argv.includes("--fixed-power");
if(!fixedPower){input.traces=[];input.obstacles=input.obstacles.filter((o:any)=>!o.circuitJsonMetadata?.pcb_via_id&&!(o.layers.length===1&&o.layers[0]==="bottom"&&o.circuitJsonMetadata?.pcb_smtpad_id));}
const originals=cj.filter(e=>e.type==="pcb_trace"&&input.connections.some(c=>c.name===e.source_trace_id)).map(t=>({...t,connection_name:t.source_trace_id}));
const escapes=new Map<string,{before:any[];after:any[]}>();
const lanes=originals.map(t=>{
 const a=t.route.findIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");
 const b=t.route.findLastIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");
 const before=t.route.slice(0,a+1),after=t.route.slice(b);
 escapes.set(t.connection_name,{before,after});
 input.traces??=[];
 input.traces.push({...t,pcb_trace_id:t.pcb_trace_id+"_before",route:before},{...t,pcb_trace_id:t.pcb_trace_id+"_after",route:after});
 for(const p of t.route.filter((p:any)=>p.route_type==="via"))input.obstacles.push({type:"rect",shape:"circle",center:{x:p.x,y:p.y},width:.3,height:.3,layers:["top","inner1","inner2","bottom"],connectedTo:[t.connection_name]});
 const route=t.route.slice(a,b+1);
 const connection=input.connections.find(c=>c.name===t.connection_name)!;
 connection.pointsToConnect=[{...route[0],pcb_port_id:undefined},{...route.at(-1),pcb_port_id:undefined}];
 return {...t,route,coupledSection:t.coupledSection?.map((n:number)=>n-a),curvedSegments:t.curvedSegments?.map((n:number)=>n-a)};
});
const refinement=process.argv.includes("--refine");
const options={maxSearchIterations:300000,maxLaneIterations:50000,smoothTuning:process.env.DDR_SMOOTH!=="0"};
const solver=refinement?BusLanesSolver.forRefinement(input,lanes,options):new BusLanesSolver(input,options);
const start=Date.now(),limit=Number(process.env.DDR_SEED_MS??180000);let nextLog=start+15000;
while(!solver.solved&&!solver.failed&&Date.now()-start<limit){solver.step();if(Date.now()>nextLog){console.log(JSON.stringify({elapsedMs:Date.now()-start,phase:solver.phase,stats:{...(solver.stats as any),busLengths:undefined,pairLengths:undefined,traceLengthsMm:undefined}}));nextLog=Date.now()+15000;}}
const routes:Trace[]=solver.traces.map(t=>{
 const escape=t.connection_name ? escapes.get(t.connection_name) : undefined;
 if(!escape)throw new Error("Solver returned an unknown DDR connection");
 return {...t,route:[...escape.before.slice(0,-1),...t.route,...escape.after.slice(1)]};
});
const audit=solver.solved?auditDdrGeometry(original,routes,names):null;
const result={...placement,solverVersion:"0.0.11",solved:solver.solved,failed:solver.failed,error:solver.error,phase:solver.phase,elapsedMs:Date.now()-start,routeCount:routes.length,geometricTimingPassed:audit?.pass??false,fixedPower,refinement,stats:solver.stats,audit};
const stem=`output/ddr-compliance/fixed-escapes-${refinement?'refine':'route'}-${fixedPower?'power':'bare'}-${options.smoothTuning?'smooth':'angled'}`;
writeFileSync(`${stem}.json`,JSON.stringify(result,null,2));
if(solver.solved){writeFileSync(`${stem}.srj.json`,JSON.stringify(original));writeFileSync(`${stem}.routes.json`,JSON.stringify(routes));}
console.log(JSON.stringify({...result,stats:undefined}));
