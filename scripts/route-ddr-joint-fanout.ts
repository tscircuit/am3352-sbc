import {readFileSync,writeFileSync} from 'node:fs';
import {BusLanesPipelineSolver,exteriorPairSpacingReports,type SimpleRouteJson,type Trace} from '@tscircuit/bus-lanes-solver';
import {compactRoutingInput} from '../design/compact-routing-input';
import {auditDdrGeometry,assertDdrConstraints} from '../design/ddr-compliance';
const runName=process.env.JOINT_RUN_NAME??'ddr-joint';
const singleWidth=Number(process.env.DDR_SINGLE_WIDTH??.14),pairWidth=Number(process.env.DDR_PAIR_WIDTH??.1),pairGap=Number(process.env.DDR_PAIR_GAP??.18);
const baselineLayers=new Map(JSON.parse(readFileSync('output/ddr-audit.json','utf8')).measurements.map((m:any)=>[m.name,m.innerLayers[0]]));
const input:SimpleRouteJson=compactRoutingInput(JSON.parse(readFileSync('output/ddr-current.srj.json','utf8')));
const cj:any[]=JSON.parse(readFileSync('output/ddr-current.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const joint=JSON.parse(readFileSync('output/joint-bga-escapes.json','utf8'));
if(!joint.complete)throw Error('Cannot route without complete BGA fanout reservation');
const full=structuredClone(input),escapes:Trace[]=joint.traces;
const paired=new Set(input.differentialPairs!.flatMap(p=>p.connectionNames));
input.traces=escapes;input.obstacles=input.obstacles.filter(o=>!(o as any).isCopperPour&&o.layers[0]!=='bottom'&&!(o as any).circuitJsonMetadata?.pcb_via_id);
input.buses=input.buses!.filter(b=>b.connectionNames.length>1);input.allowedLayers=['inner1','inner2'];input.minTraceWidth=Math.min(.1,singleWidth,pairWidth);
for(const c of input.connections){
 const bus=input.buses.find(b=>b.connectionNames.includes(c.name));const layer=(process.env.DDR_BASELINE_LAYERS==='1'?baselineLayers.get(names[c.name]):undefined) as string|undefined ?? (bus?.name==='DDR_BYTE1'?'inner2':'inner1');
 c.width=paired.has(c.name)?pairWidth:singleWidth;c.nominalTraceWidth=c.width;
 c.pointsToConnect=c.pointsToConnect.map(p=>{
  const escape=escapes.find(t=>t.connection_name===p.pcb_port_id);if(!escape)throw Error('Missing reserved DDR terminal');
  escape.connection_name=c.name;escape.source_trace_id=c.source_trace_id;
  for(const v of escape.route)if(v.route_type==='via')v.to_layer=layer;
  const last=escape.route.at(-1)!;if(last.route_type!=='wire')throw Error('No handoff');last.layer=layer;last.width=c.width!;
  return {...p,x:last.x,y:last.y,layer};
 });
 if(bus)bus.allowedLayers=['inner1','inner2'];
}
for(const p of input.differentialPairs!)p.traceGap=pairGap;
for(const p of full.differentialPairs!)p.traceGap=pairGap;
assertDdrConstraints(input,names);
const limits=auditDdrGeometry(full,[],names).groups;
for(const b of input.buses!){const limit=limits.find(g=>g.name===(b.name??b.busId))!;b.minLength=limit.minimumMm;b.maxLength=limit.maximumMm;}
writeFileSync(`output/${runName}.srj.json`,JSON.stringify(input));
const solver=new BusLanesPipelineSolver(input,{fanout:'none',maxSearchIterations:2000000,maxLaneIterations:1000000});
const start=performance.now();let logAt=start+15000;
while(!solver.solved&&!solver.failed&&performance.now()-start<300000){solver.step();if(performance.now()>logAt){console.log(JSON.stringify({phase:solver.phase,seconds:(performance.now()-start)/1000}));logAt+=15000}}
solver.tryFinalAcceptance();
const near=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-7;
const traces:Trace[]=solver.solved?solver.traces.map(lane=>{
 const own=escapes.filter(t=>t.connection_name===lane.connection_name),prefix=own.find(t=>near(t.route.at(-1),lane.route[0]))!,suffix=own.find(t=>near(t.route.at(-1),lane.route.at(-1)))!;
 const reverse=suffix.route.toReversed().map(p=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
 const offset=prefix.route.length-1;
 return {...lane,route:[...prefix.route.slice(0,-1),...lane.route,...reverse.slice(1)],coupledSection:lane.coupledSection?.map(i=>i+offset) as [number,number]|undefined,curvedSegments:lane.curvedSegments?.map(i=>i+offset)};
}):[];
const geometry=traces.length?auditDdrGeometry(full,traces,names):null;
const coupling=traces.length?exteriorPairSpacingReports(full,traces):[];
const report={singleWidth,pairWidth,pairGap,baselineLayers:process.env.DDR_BASELINE_LAYERS==='1',budgetMs:300000,status:solver.solved?'solved':solver.failed?'solver_failed':'budget_exhausted',solved:solver.solved,error:solver.error,phase:solver.phase,seconds:(performance.now()-start)/1000,fanoutReservedTerminals:joint.terminals,traces:traces.length,geometry,coupling,requiresNativeIntegration:true};
writeFileSync(`output/${runName}.report.json`,JSON.stringify(report,null,2));writeFileSync(`output/${runName}.traces.json`,JSON.stringify(traces));console.log(JSON.stringify(report));
if(!solver.solved||!geometry?.pass||coupling.some(c=>!c.applicable||!c.matched))process.exitCode=1;
