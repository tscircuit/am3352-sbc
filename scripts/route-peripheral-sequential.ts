import {readFileSync,writeFileSync} from 'node:fs';
import {BusLanesPipelineSolver,pairLengthReports,exteriorPairSpacingReports,type SimpleRouteJson,type Trace} from '@tscircuit/bus-lanes-solver';
import {compactRoutingInput} from '../design/compact-routing-input';
const native:SimpleRouteJson=JSON.parse(readFileSync('output/peripheral-signal-first.srj.json','utf8'));
const input:SimpleRouteJson=compactRoutingInput(JSON.parse(readFileSync('output/peripheral-escaped.srj.json','utf8')));
const escapes:Trace[]=JSON.parse(readFileSync('output/peripheral-signal-escapes.json','utf8')).escapes;
const completed:Trace[]=[],results:any[]=[];
for(const [index,pair] of input.differentialPairs!.slice(0,Number(process.env.PAIR_COUNT??12)).entries()){
 // TFP410 -> ESD on inner1; ESD -> socket on inner2. USB stays on inner2.
 const layer=index>=4&&index%2===0?'inner1':'inner2';
 for(const c of input.connections.filter(c=>pair.connectionNames.includes(c.name)))for(const p of c.pointsToConnect)p.layer=layer;
 for(const t of [...(input.traces??[]),...escapes].filter(t=>pair.connectionNames.includes(t.connection_name!))){
  const p=t.route.at(-1)!;if(p.route_type==='wire')p.layer=layer;
  for(const v of t.route)if(v.route_type==='via')v.to_layer=layer;
 }
 const part={...input,traces:[...(input.traces??[]),...completed],connections:input.connections.filter(c=>pair.connectionNames.includes(c.name)),differentialPairs:[pair]};
 const solver=new BusLanesPipelineSolver(part,{fanout:'none',maxLaneIterations:250000,maxSearchIterations:500000});
 const start=performance.now();let logAt=start+15000;
 while(!solver.solved&&!solver.failed&&performance.now()-start<45000){solver.step();if(performance.now()>logAt){console.log(JSON.stringify({index,phase:solver.phase,seconds:(performance.now()-start)/1000}));logAt+=15000;}}
 solver.tryFinalAcceptance();
 const result={index,layer,names:pair.connectionNames,solved:solver.solved,error:solver.error,phase:solver.phase,seconds:(performance.now()-start)/1000};
 console.log(JSON.stringify(result));results.push(result);
 if(solver.solved)completed.push(...solver.traces);
 writeFileSync('output/peripheral-sequential.progress.json',JSON.stringify({results,completed},null,2));
}
const near=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const traces=completed.map(lane=>{
 const own=escapes.filter(t=>t.connection_name===lane.connection_name);
 const prefix=own.find(t=>near(t.route.at(-1),lane.route[0]))!;
 const suffix=own.find(t=>near(t.route.at(-1),lane.route.at(-1)))!;
 const reverse=suffix.route.toReversed().map(p=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
 const offset=prefix.route.length-1;
 return {...lane,coupledSection:lane.coupledSection?.map(i=>i+offset) as [number,number] | undefined,curvedSegments:lane.curvedSegments?.map(i=>i+offset),route:[...prefix.route.slice(0,-1),...lane.route,...reverse.slice(1)]};
});
const report={results,routed:traces.length,expected:input.connections.length,pairs:pairLengthReports(native,traces),coupling:exteriorPairSpacingReports(native,traces),requiresNativeBoardAudit:true,requiresDecouplerRelocation:true,requiresPowerRegeneration:true};
writeFileSync('output/peripheral-sequential.report.json',JSON.stringify(report,null,2));
writeFileSync('output/peripheral-sequential.traces.json',JSON.stringify(traces));
if(traces.length!==input.connections.length)process.exitCode=1;
