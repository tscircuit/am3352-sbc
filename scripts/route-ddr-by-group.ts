/** DDR groups get their escapes only when routed, leaving room for earlier
 * groups. A local bus_lanes extension supplies absolute physical length floors.
 * The original TI acceptance gate remains authoritative; no active cache edits.
 */
import {readFileSync,writeFileSync}from'node:fs';
import{resolve}from'node:path';import{pathToFileURL}from'node:url';
import{compactRoutingInput}from'../design/compact-routing-input';
import{auditDdrGeometry,assertDdrConstraints}from'../design/ddr-compliance';
import{isRamRef}from'../design/ram-placement';import placement from'../design/ram-placement.json';
const originalSource=readFileSync('node_modules/@tscircuit/bus-lanes-solver/dist/index.js','utf8');
const marker='  const constraints = lengthConstraints(input);';
if(originalSource.split(marker).length!==2)throw Error('Unsupported solver source: cannot safely add absolute targets');
const extension=`  for (const [name, floor] of Object.entries(input.minimumRouteLengthsMm ?? {})) {
    if (targets.has(name) && input.buses?.some(bus => bus.connectionNames.includes(name))) {
      if (!Number.isFinite(floor) || floor < 0) throw Error('Invalid absolute length floor');
      targets.set(name, Math.max(targets.get(name), floor));
    }
  }
`;
const moduleFile=resolve('output/ddr-compliance/absolute-target-router.mjs');
writeFileSync(moduleFile,originalSource.replace(marker,extension+marker)+'\nexport {routeAlternateSignalDogbones};\n');
const{BusLanesPipelineSolver,BusLanesSolver,routeAlternateSignalDogbones}=await import(pathToFileURL(moduleFile).href);
const original:any=compactRoutingInput(JSON.parse(readFileSync('output/ddr-current.srj.json','utf8')));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const sc=new Map(cj.filter(e=>e.type==='source_component').map(e=>[e.source_component_id,e.name]));
const ramComps=new Set(cj.filter(e=>e.type==='pcb_component'&&isRamRef(sc.get(e.source_component_id)??'')).map(e=>e.pcb_component_id));
const ramPorts=new Set(cj.filter(e=>e.type==='pcb_port'&&ramComps.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
const chips=new Set(cj.filter(e=>e.type==='pcb_component'&&['U1','U3'].includes(sc.get(e.source_component_id)??'')).map(e=>e.pcb_component_id));
const poses=JSON.parse(process.env.DDR_SEEDS??'[{"x":-18,"y":-22,"rotation":270},{"x":0,"y":-16,"rotation":270},{"x":18,"y":-18,"rotation":0}]');
for(const [seed,pose] of poses.entries()){
 const full=structuredClone(original);full.traces=[];full.allowBlindAndBuriedVias=process.env.DDR_BLIND_VIAS==='1';full.allowedLayers=['inner1','inner2'];full.buses=full.buses.filter((b:any)=>b.connectionNames.length>1);
 full.obstacles=full.obstacles.filter((o:any)=>!o.isCopperPour&&!o.circuitJsonMetadata?.pcb_via_id&&(!o.componentId||chips.has(o.componentId)));
 const angle=(pose.rotation-placement.rotation)*Math.PI/180;
 const move=(p:any)=>{const x=p.x-placement.x,y=p.y-placement.y;p.x=pose.x+x*Math.cos(angle)-y*Math.sin(angle);p.y=pose.y+x*Math.sin(angle)+y*Math.cos(angle);};
 for(const o of full.obstacles)if(ramComps.has(o.componentId)){move(o.center);if((pose.rotation-placement.rotation)%180)[o.width,o.height]=[o.height,o.width];}
 for(const c of full.connections)for(const p of c.pointsToConnect)if(ramPorts.has(p.pcb_port_id))move(p);
 assertDdrConstraints(full,names);
 const limits=auditDdrGeometry(full,[],names).groups;
 const groups=[...full.buses,{name:'DDR_RESET_LAYER',connectionNames:full.connections.filter((c:any)=>!full.buses.some((b:any)=>b.connectionNames.includes(c.name))).map((c:any)=>c.name)}];
 const routes:any[]=[],results:any[]=[];
 const reserved=process.env.DDR_RESERVE_ESCAPES==='1';
 const layerChoices=JSON.parse(process.env.DDR_GROUP_LAYERS??'["inner1","inner2","inner1","inner2"]');
 let fanout:any;
 if(reserved){
  const targets=new Map(groups.flatMap((g:any,i:number)=>g.connectionNames.map((n:string)=>[n,layerChoices[i]])));
  try{fanout=routeAlternateSignalDogbones(full,{targetLayers:targets,viaDiameter:.3,viaHoleDiameter:.15,traceWidth:.1,clearance:.1,allowBlindAndBuriedVias:full.allowBlindAndBuriedVias},Number(process.env.DDR_ESCAPE_MODE??0));}
  catch(e){console.log(JSON.stringify({seed,phase:'reserve_escapes',error:String(e)}));continue;}
 }
 const order:number[]=JSON.parse(process.env.DDR_GROUP_ORDER??'[0,1,2,3]');
 for(const index of order){
  const group=groups[index];
  const preferredLayer=layerChoices[index];
  const floor=index===2?limits[index].nominalMm:index<2?limits[index].maximumMm!-.3:0;
  const local={...full,connections:full.connections.filter((c:any)=>group.connectionNames.includes(c.name)),buses:index<3?[{...group,preferredLayer}]:[],differentialPairs:full.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>group.connectionNames.includes(n))),traces:[...routes],minimumRouteLengthsMm:Object.fromEntries(group.connectionNames.map((n:string)=>[n,floor]))};
  if(reserved){local.connections=fanout.connections.filter((c:any)=>group.connectionNames.includes(c.name));local.traces=[...fanout.traces,...routes];}
  const Solver=reserved?BusLanesSolver:BusLanesPipelineSolver;
  const solver=new Solver(local,{maxSearchIterations:100000,maxLaneIterations:20000,smoothTuning:true});
  const start=Date.now(),deadline=start+Number(process.env.DDR_STAGE_MS??60000);let nextLog=start+15000;
  while(!solver.solved&&!solver.failed&&Date.now()<deadline){solver.step();if(Date.now()>nextLog){console.log(JSON.stringify({seed,group:group.name,phase:solver.phase,elapsedMs:Date.now()-start}));nextLog=Date.now()+15000;}}
  const stageRoutes=solver.solved?solver.traces.map((t:any)=>{
   if(!reserved)return t;
   const ends=fanout.traces.filter((e:any)=>e.connection_name===t.connection_name);
   const begin=ends.find((e:any)=>Math.hypot(e.route.at(-1).x-t.route[0].x,e.route.at(-1).y-t.route[0].y)<1e-5);
   const end=ends.find((e:any)=>e!==begin);
   if(!begin||!end)throw Error('Cannot reconnect pad escapes');
   const reverse=end.route.toReversed().map((p:any)=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
   return {...t,source_trace_id:t.connection_name,route:[...begin.route.slice(0,-1),...t.route,...reverse.slice(1)],coupledSection:t.coupledSection?.map((i:number)=>i+begin.route.length-1),curvedSegments:t.curvedSegments?.map((i:number)=>i+begin.route.length-1)};
  }):[];
  const stageAudit=solver.solved?auditDdrGeometry(full,[...routes,...stageRoutes],names):null;
  const groupPass=index<3?stageAudit?.groups[index].pass:solver.solved;
  const result={group:group.name,solved:solver.solved,failed:solver.failed,error:solver.error,phase:solver.phase,elapsedMs:Date.now()-start,absoluteFloorMm:floor,groupTimingPassed:!!groupPass,groupAudit:stageAudit?.groups[index]};results.push(result);console.log(JSON.stringify({seed,...result}));
  if(solver.solved&&!groupPass)writeFileSync(`output/ddr-compliance/${process.env.DDR_RUN_NAME??'group-first'}-${seed}-rejected-stage-${index}.json`,JSON.stringify({routes:stageRoutes,audit:stageAudit},null,2));
  if(!solver.solved||!groupPass)break;
  routes.push(...stageRoutes);
 }
 const audit=auditDdrGeometry(full,routes,names);
 const stem=`output/ddr-compliance/${process.env.DDR_RUN_NAME??'group-first'}-${seed}`;
 writeFileSync(stem+'.json',JSON.stringify({...pose,results,routeCount:routes.length,solved:routes.length===47,geometricTimingPassed:audit.pass,solver:'bus_lanes 0.0.11 with absolute target extension',audit},null,2));
 writeFileSync(stem+'.srj.json',JSON.stringify(full));writeFileSync(stem+'.routes.json',JSON.stringify(routes));
 if(audit.pass)break;
}
