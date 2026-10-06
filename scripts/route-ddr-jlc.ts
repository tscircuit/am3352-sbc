import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {BusLanesPipelineSolver,exteriorPairSpacingReports,type SimpleRouteJson} from '@tscircuit/bus-lanes-solver';
import {compactRoutingInput} from '../design/compact-routing-input';
import {auditDdrGeometry,assertDdrConstraints} from '../design/ddr-compliance';
import {optimizeBytePins} from './optimize-ddr-byte-pins';
import placement from '../design/ram-placement.json';
const original:SimpleRouteJson=compactRoutingInput(JSON.parse(readFileSync('output/ddr-current.srj.json','utf8')));
const cj:any[]=JSON.parse(readFileSync('output/ddr-current.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const refs=Object.fromEntries(cj.filter(e=>e.type==='source_component').map(e=>[e.source_component_id,e.name]));
const chips=cj.filter(e=>e.type==='pcb_component'&&['U1','U3'].includes(refs[e.source_component_id]));
const chipIds=chips.map(c=>c.pcb_component_id),ram=chips.find(c=>refs[c.source_component_id]==='U3').pcb_component_id;
const ramPorts=new Set(cj.filter(e=>e.type==='pcb_port'&&e.pcb_component_id===ram).map(e=>e.pcb_port_id));
const poses=JSON.parse(process.env.DDR_SEEDS??'[{"x":-10,"y":-32,"rotation":270},{"x":0,"y":-16,"rotation":270},{"x":18,"y":-18,"rotation":0}]');
mkdirSync('output/ddr-jlc',{recursive:true});
for(const [index,pose] of poses.entries()){
 const input=structuredClone(original);
 input.obstacles=input.obstacles.filter(o=>chipIds.includes(o.componentId));input.traces=[];
 input.allowedLayers=['inner1','inner2'];input.buses=input.buses!.filter(b=>b.connectionNames.length>1);
 const angle=(pose.rotation-placement.rotation)*Math.PI/180;
 const move=(p:any)=>{const x=p.x-placement.x,y=p.y-placement.y;p.x=pose.x+x*Math.cos(angle)-y*Math.sin(angle);p.y=pose.y+x*Math.sin(angle)+y*Math.cos(angle)};
 for(const o of input.obstacles)if(o.componentId===ram){move(o.center);if((pose.rotation-placement.rotation)%180)[o.width,o.height]=[o.height,o.width];}
 for(const c of input.connections)for(const p of c.pointsToConnect)if(ramPorts.has(p.pcb_port_id))move(p);
 const swizzled=process.env.DDR_SWIZZLE==='1';
 const ramDqMap=swizzled?optimizeBytePins(input,names,true):undefined;
 const paired=new Set(input.differentialPairs!.flatMap(p=>p.connectionNames));
 input.minTraceWidth=.1;
 for(const c of input.connections){c.nominalTraceWidth=paired.has(c.name)?.1:.14;c.width=c.nominalTraceWidth}
 for(const p of input.differentialPairs!)p.traceGap=.18;
 assertDdrConstraints(input,names);
 const limits=auditDdrGeometry(input,[],names).groups;
 for(const b of input.buses!){const limit=limits.find(g=>g.name===(b.name??b.busId))!;b.minLength=limit.minimumMm;b.maxLength=limit.maximumMm;}
 const solver=new BusLanesPipelineSolver(input,{maxSearchIterations:2000000,maxLaneIterations:1000000});
 const start=performance.now();let logAt=start+15000;
 while(!solver.solved&&!solver.failed&&performance.now()-start<Number(process.env.DDR_BUDGET_MS??120000)){solver.step();if(performance.now()>logAt){console.log(JSON.stringify({index,pose,swizzled,phase:solver.phase,seconds:(performance.now()-start)/1000}));logAt+=15000}}
 solver.tryFinalAcceptance();
 const geometry=solver.solved?auditDdrGeometry(input,solver.traces,names):null;
 const coupling=solver.solved?exteriorPairSpacingReports(input,solver.traces):[];
 const result={index,pose,swizzled,ramDqMap,solverVersion:'0.0.19',singleEndedWidthMm:.14,pairWidthMm:.1,pairGapMm:.18,solved:solver.solved,phase:solver.phase,error:solver.error,seconds:(performance.now()-start)/1000,geometry,coupling,requiresFullBoardIntegration:true};
 const stem=`output/ddr-jlc/${swizzled?'swizzled':'natural'}-${index}`;
 writeFileSync(`${stem}.json`,JSON.stringify(result,null,2));writeFileSync(`${stem}.srj.json`,JSON.stringify(input));writeFileSync(`${stem}.routes.json`,JSON.stringify(solver.traces));
 console.log(JSON.stringify({...result,geometry:geometry?{pass:geometry.pass,failures:geometry.failures}:null}));
 if(geometry?.pass&&coupling.every(c=>c.applicable&&c.matched))process.exit(0);
 Bun.gc(true);
}
process.exitCode=2;
