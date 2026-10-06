import {readFileSync,writeFileSync} from 'node:fs';
import {BusLanesPipelineSolver,busLengthReports,type SimpleRouteJson,type Trace} from '@tscircuit/bus-lanes-solver';
import {compactRoutingInput} from '../design/compact-routing-input';
const input:SimpleRouteJson=compactRoutingInput(JSON.parse(readFileSync('output/lcd-escaped.srj.json','utf8')));
input.buses=[{name:'LCD_PARALLEL',busId:'LCD_PARALLEL',connectionNames:input.connections.map(c=>c.name),allowedLayers:['inner2'],maxLengthSkew:1}];
const escapes:Trace[]=JSON.parse(readFileSync('output/lcd-signal-escapes.json','utf8')).escapes;
const solver=new BusLanesPipelineSolver(input,{fanout:'none',maxSearchIterations:2000000,maxLaneIterations:1000000});
const start=performance.now();let logAt=start+15000;
while(!solver.solved&&!solver.failed&&performance.now()-start<180000){solver.step();if(performance.now()>logAt){console.log(JSON.stringify({phase:solver.phase,seconds:(performance.now()-start)/1000}));logAt+=15000}}
solver.tryFinalAcceptance();
const near=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const traces:Trace[]=solver.solved?solver.traces.map(lane=>{
 const own=escapes.filter(t=>t.connection_name===lane.connection_name);
 const prefix=own.find(t=>near(t.route.at(-1)!,lane.route[0]))!,suffix=own.find(t=>near(t.route.at(-1)!,lane.route.at(-1)!))!;
 const reverse=suffix.route.toReversed().map(p=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
 return {...lane,route:[...prefix.route.slice(0,-1),...lane.route,...reverse.slice(1)],curvedSegments:lane.curvedSegments?.map(i=>i+prefix.route.length-1)};
}):[];
const report={solved:solver.solved,error:solver.error,phase:solver.phase,seconds:(performance.now()-start)/1000,routed:traces.length,expected:20,buses:solver.solved?busLengthReports(input,solver.traces):[],requiresNativeAudit:true};
writeFileSync('output/lcd-routed.report.json',JSON.stringify(report,null,2));writeFileSync('output/lcd-routed.traces.json',JSON.stringify(traces));console.log(JSON.stringify(report));
if(!solver.solved)process.exitCode=1;
