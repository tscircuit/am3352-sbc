import { readFileSync, writeFileSync } from "node:fs";
import { BusLanesPipelineSolver, pairLengthReports, exteriorPairSpacingReports } from "@tscircuit/bus-lanes-solver";
import { compactRoutingInput } from "../design/compact-routing-input";
const input=compactRoutingInput(JSON.parse(readFileSync("output/peripheral-escaped.srj.json","utf8")));
const native=JSON.parse(readFileSync("output/peripheral-signal-first.srj.json","utf8"));
const escapes=JSON.parse(readFileSync("output/peripheral-signal-escapes.json","utf8")).escapes;
const solver=new BusLanesPipelineSolver(input,{fanout:"none",maxSearchIterations:1000000,maxLaneIterations:500000});
const start=performance.now();let logAt=start+15000;
while(!solver.solved&&!solver.failed&&performance.now()-start<180000){
  solver.step();
  if(performance.now()>logAt){console.log(JSON.stringify({phase:solver.phase,iterations:solver.iterations,seconds:(performance.now()-start)/1000}));logAt+=15000;}
}
solver.tryFinalAcceptance();
const near=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const traces=solver.solved?solver.traces.map(lane=>{
  const own=escapes.filter((t:any)=>t.connection_name===lane.connection_name);
  const prefix=own.find((t:any)=>near(t.route.at(-1),lane.route[0]));
  const suffix=own.find((t:any)=>near(t.route.at(-1),lane.route.at(-1)));
  if(!prefix||!suffix)throw Error("Missing signal escape");
  const reverse=suffix.route.toReversed().map((p:any)=>p.route_type==="via"?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
  const offset=prefix.route.length-1;
  return {...lane,coupledSection:lane.coupledSection?.map(i=>i+offset) as [number,number] | undefined,curvedSegments:lane.curvedSegments?.map(i=>i+offset),route:[...prefix.route.slice(0,-1),...lane.route,...reverse.slice(1)]};
}):[];
const report={solved:solver.solved,failed:solver.failed,error:solver.error,phase:solver.phase,seconds:(performance.now()-start)/1000,traces:traces.length,pairs:solver.solved?pairLengthReports(native,traces):[],coupling:solver.solved?exteriorPairSpacingReports(native,traces):[],requiresNativeBoardAudit:true};
writeFileSync("output/peripheral-routed.report.json",JSON.stringify(report,null,2));
writeFileSync("output/peripheral-routed.traces.json",JSON.stringify(traces));
console.log(JSON.stringify(report));
if(!solver.solved)process.exitCode=1;
