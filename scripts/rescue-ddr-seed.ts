import {BusLanesPipelineSolver,BusLanesSolver} from '@tscircuit/bus-lanes-solver';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isRamRef} from '../design/ram-placement';
import placement from '../design/ram-placement.json';
import {auditDdrGeometry} from '../design/ddr-compliance';
const file=resolve('output/ddr-compliance/rescue-internals.mjs');
writeFileSync(file,readFileSync('node_modules/@tscircuit/bus-lanes-solver/dist/index.js','utf8')+'\nexport {rematchTrappedSignalDogbones,VectorScene,fixedCopper,routeCopper};\n');
const {rematchTrappedSignalDogbones,VectorScene,fixedCopper,routeCopper}=await import(pathToFileURL(file).href);
const original:any=JSON.parse(readFileSync('output/ddr-current.srj.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const sc=new Map(cj.filter(e=>e.type==='source_component').map(e=>[e.source_component_id,e.name]));
const comps=new Set(cj.filter(e=>e.type==='pcb_component'&&isRamRef(sc.get(e.source_component_id)??'')).map(e=>e.pcb_component_id));
const ports=new Set(cj.filter(e=>e.type==='pcb_port'&&comps.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
const pose=JSON.parse(process.env.DDR_POSE??'{"x":-10,"y":-32,"rotation":270}');
const input=structuredClone(original);input.allowedLayers=['inner1','inner2'];input.traces=[];
input.obstacles=input.obstacles.filter((o:any)=>!o.isCopperPour&&!o.circuitJsonMetadata?.pcb_via_id&&!(o.layers.length===1&&o.layers[0]==='bottom'&&o.circuitJsonMetadata?.pcb_smtpad_id));
const angle=(pose.rotation-placement.rotation)*Math.PI/180;
const move=(p:any)=>{const x=p.x-placement.x,y=p.y-placement.y;p.x=pose.x+x*Math.cos(angle)-y*Math.sin(angle);p.y=pose.y+x*Math.sin(angle)+y*Math.cos(angle);};
for(const o of input.obstacles)if(comps.has(o.componentId)){move(o.center);if((pose.rotation-placement.rotation)%180)[o.width,o.height]=[o.height,o.width];}
for(const c of input.connections)for(const p of c.pointsToConnect)if(ports.has(p.pcb_port_id))move(p);
const preliminary={...input,buses:[]};
const solver:any=new BusLanesPipelineSolver(preliminary,{maxSearchIterations:300000,maxLaneIterations:10000,smoothTuning:true});
let best:any=process.env.DDR_REUSE_PARTIAL==='1'?JSON.parse(readFileSync('output/ddr-compliance/rescue-partial.json','utf8')):null, nextLog=Date.now()+15000;
if(best&&JSON.stringify(best.pose)!==JSON.stringify(pose))throw Error('Cached partial placement does not match requested placement');
const deadline=Date.now()+120000;
while(!best?.routes || best.routes.length<46){
 if(solver.solved||solver.failed||Date.now()>=deadline)break;
 solver.step();
 if(solver.iterations%100===0&&solver.child?.traces.length>=40){
  const child=solver.child,layerInput=child.input;
  const copper=[...fixedCopper(layerInput),...child.traces.flatMap(routeCopper)];
  let clean=child.traces.filter((t:any)=>new VectorScene(layerInput,layerInput.connections.find((c:any)=>c.name===t.connection_name),.1,copper).pathVisible(t.route));
  for(const pair of input.differentialPairs)if(pair.connectionNames.filter((n:string)=>clean.some((t:any)=>t.connection_name===n)).length===1)clean=clean.filter((t:any)=>!pair.connectionNames.includes(t.connection_name));
  if(clean.length>(best?.routes.length??0)){best=structuredClone({layerInput,routes:clean,escapes:solver.escapes});console.log(JSON.stringify({cleanPartial:clean.length,raw:child.traces.length,missing:input.connections.filter((c:any)=>!clean.some((t:any)=>t.connection_name===c.name)).map((c:any)=>names[c.name])}));}
  if(best?.routes.length>=46)break;
 }
 if(Date.now()>nextLog){console.log(JSON.stringify({phase:solver.phase,best:best?.routes.length??0,iterations:solver.iterations}));nextLog=Date.now()+15000;}
}
if(!best)throw Error('No collision-free partial seed available');
writeFileSync('output/ddr-compliance/rescue-partial.json',JSON.stringify({pose,...best}));
const missing=input.connections.filter((c:any)=>!best.routes.some((t:any)=>t.connection_name===c.name)).map((c:any)=>c.name);
const pending={...best.layerInput,connections:best.layerInput.connections.filter((c:any)=>missing.includes(c.name)),buses:[],differentialPairs:input.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>missing.includes(n)))};
const terminalLayers=new Map<string,string[]>(missing.map((n:string)=>[n,['inner1','inner2']]));
const generator=rematchTrappedSignalDogbones(preliminary,pending,best.routes,best.escapes,terminalLayers);
let step:any;const rematchEnd=Date.now()+60000;do{step=generator.next()}while(!step.done&&Date.now()<rematchEnd);
if(!step.done)throw Error('Escape rescue timed out');
const fixed={...pending,connections:step.value.connections,traces:[...best.routes,...step.value.escapes]};
if(process.env.DDR_FORCE_LAYER){
 const layer=process.env.DDR_FORCE_LAYER;
 for(const c of fixed.connections){c.allowedLayers=[layer];terminalLayers.set(c.name,[layer]);for(const p of c.pointsToConnect){p.layer=layer;delete p.layers;}}
 for(const t of fixed.traces)if(missing.includes(t.connection_name))for(const p of t.route){if(p.route_type==='wire'&&p.layer!=='top')p.layer=layer;if(p.route_type==='via')p.to_layer=layer;}
}
const finish=new BusLanesSolver(fixed,{maxSearchIterations:200000,maxLaneIterations:30000,smoothTuning:true},terminalLayers);
const finishEnd=Date.now()+90000;
while(!finish.solved&&!finish.failed&&Date.now()<finishEnd)finish.step();
console.log(JSON.stringify({rescueSolved:finish.solved,failed:finish.failed,error:finish.error,remaining:missing.map((n:string)=>names[n])}));
if(finish.solved){
 const routes=[...best.routes,...finish.traces].map((lane:any)=>{
  const ends=step.value.escapes.filter((e:any)=>e.connection_name===lane.connection_name);
  const before=ends.find((e:any)=>Math.hypot(e.route.at(-1).x-lane.route[0].x,e.route.at(-1).y-lane.route[0].y)<1e-5);
  const after=ends.find((e:any)=>e!==before);
  if(!before||!after)throw Error('Missing escape');
  const layer=lane.route[0].layer;
  const adapt=(route:any[])=>route.map(p=>p.route_type==='via'?{...p,to_layer:layer}:p.route_type==='wire'&&p.layer!=='top'?{...p,layer}:p);
  const a=adapt(before.route),b=adapt(after.route).toReversed().map(p=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
  return {...lane,route:[...a.slice(0,-1),...lane.route,...b.slice(1)]};
 });
 const audit=auditDdrGeometry(input,routes,names);
 writeFileSync('output/ddr-compliance/rescued.seed.routes.json',JSON.stringify(routes));writeFileSync('output/ddr-compliance/rescued.seed.srj.json',JSON.stringify(input));
 writeFileSync('output/ddr-compliance/rescued.json',JSON.stringify({pose,audit},null,2));
 console.log(JSON.stringify({groups:audit.groups,failures:audit.failures}));
}
