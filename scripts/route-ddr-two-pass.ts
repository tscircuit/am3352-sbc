import { BusLanesPipelineSolver, BusLanesSolver, type SimpleRouteJson } from "@tscircuit/bus-lanes-solver";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { assertDdrConstraints, auditDdrGeometry } from "../design/ddr-compliance";
import placement from "../design/ram-placement.json";
import { isRamRef } from "../design/ram-placement";

const original:any=JSON.parse(readFileSync("output/ddr-current.srj.json","utf8"));
const cj:any[]=JSON.parse(readFileSync("output/board-ddr.circuit.json","utf8"));
const names=Object.fromEntries(cj.filter(e=>e.type==="source_trace").map(e=>[e.source_trace_id,e.name]));
const sourceComponents=new Map(cj.filter(e=>e.type==="source_component").map(e=>[e.source_component_id,e.name]));
const ramComponents=new Set(cj.filter(e=>e.type==="pcb_component"&&isRamRef(sourceComponents.get(e.source_component_id)??"")).map(e=>e.pcb_component_id));
const ramPorts=new Set(cj.filter(e=>e.type==="pcb_port"&&ramComponents.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
const fullPower=process.argv.includes("--fixed-power");
const seeds=process.env.DDR_SEEDS?JSON.parse(process.env.DDR_SEEDS):[
  placement,
  ...[270,0,90,180].flatMap(rotation=>[-18,-22,-26].flatMap(y=>[0,-4,4].map(x=>({x,y,rotation})))),
];
const prefix=process.env.DDR_RUN_NAME??"two-pass";
const limitMs=Number(process.env.DDR_SEED_MS??30000);
const maxIterations=Number(process.env.DDR_ITERATIONS??100000);
const startIndex=Number(process.env.DDR_START??0), stride=Number(process.env.DDR_STRIDE??1);
mkdirSync("output/ddr-compliance",{recursive:true});
for(let i=startIndex;i<seeds.length;i+=stride){
  const seed=seeds[i];
  if(fullPower&&JSON.stringify(seed)!==JSON.stringify(placement))throw Error("Fixed power requires the unchanged placement");
  const input:any=structuredClone(original);
  input.allowedLayers=["inner1","inner2"];
  input.buses=input.buses.filter((b:any)=>b.connectionNames.length>1);
  if(process.env.DDR_LAYER_ASSIGNMENT){
    const layers=JSON.parse(process.env.DDR_LAYER_ASSIGNMENT);
    for(let g=0;g<input.buses.length;g++)input.buses[g].preferredLayer=layers[g];
  }
  input.obstacles=input.obstacles.filter((o:any)=>!o.isCopperPour&&(fullPower||(!o.circuitJsonMetadata?.pcb_via_id&&!(o.layers.length===1&&o.layers[0]==="bottom"&&o.circuitJsonMetadata?.pcb_smtpad_id))));
  if(!fullPower)input.traces=[];
  const angle=(seed.rotation-placement.rotation)*Math.PI/180;
  const move=(p:any)=>{const x=p.x-placement.x,y=p.y-placement.y;p.x=seed.x+x*Math.cos(angle)-y*Math.sin(angle);p.y=seed.y+x*Math.sin(angle)+y*Math.cos(angle);};
  for(const o of input.obstacles)if(ramComponents.has(o.componentId)){move(o.center);if((seed.rotation-placement.rotation)%180)[o.width,o.height]=[o.height,o.width];if(o.points)for(const p of o.points)move(p);}
  for(const c of input.connections)for(const p of c.pointsToConnect)if(ramPorts.has(p.pcb_port_id))move(p);
  // First validate the complete required constraint set. The intermediate
  // connectivity seed is never accepted without final timing verification.
  assertDdrConstraints(input,names);
  if(process.env.DDR_REVERSE==="1")for(const c of input.connections)c.pointsToConnect.reverse();
  const seedInput={...input,buses:[]};
  const solver=new BusLanesPipelineSolver(seedInput as SimpleRouteJson,{maxSearchIterations:maxIterations,maxLaneIterations:maxIterations,smoothTuning:process.env.DDR_SMOOTH!=="0"});
  const start=Date.now();let nextLog=start+15000;
  try{while(!solver.solved&&!solver.failed&&Date.now()-start<limitMs){
    solver.step();
    if(Date.now()>nextLog){console.log(JSON.stringify({seed:i,...seed,elapsedMs:Date.now()-start,phase:solver.phase,iterations:solver.iterations,stats:{...(solver.stats as any),busLengths:undefined,pairLengths:undefined,traceLengthsMm:undefined}}));nextLog=Date.now()+15000;}
  }}catch(e){solver.failed=true;solver.error=String(e);}
  let audit=solver.solved?auditDdrGeometry(input,solver.traces,names):null;
  let finalRoutes=solver.traces;
  let refinement:any=null;
  const intermediateStem=`output/ddr-compliance/${prefix}-${i}`;
  if(solver.solved){
   writeFileSync(intermediateStem+'.seed.srj.json',JSON.stringify(seedInput));
   writeFileSync(intermediateStem+'.seed.routes.json',JSON.stringify(solver.traces));
   // Refinement can add length, so reject oversized seeds before expensive tuning.
   const lengthsWithinCeilings=audit!.groups.every((g:any)=>g.maxLengthMm<=g.maximumMm+1e-7);
   if(lengthsWithinCeilings){
    const refineInput=structuredClone(input);const escapes:any[]=[];
    const lanes=solver.traces.map((t:any)=>{
     const a=t.route.findIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");
     const b=t.route.findLastIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");
     const before={...t,pcb_trace_id:t.pcb_trace_id+"_before",route:t.route.slice(0,a+1)};
     const after={...t,pcb_trace_id:t.pcb_trace_id+"_after",route:t.route.slice(b)};
     escapes.push(before,after);
     const route=t.route.slice(a,b+1);
     const connection=refineInput.connections.find((c:any)=>c.name===t.connection_name);
     connection.pointsToConnect=[route[0],route.at(-1)];
     return {...t,route,coupledSection:t.coupledSection?.map((n:number)=>n-a),curvedSegments:t.curvedSegments?.map((n:number)=>n-a)};
    });
    refineInput.traces=[...(refineInput.traces??[]),...escapes];
    const matcher=BusLanesSolver.forRefinement(refineInput,lanes,{maxSearchIterations:150000,maxLaneIterations:10000,smoothTuning:true});
    const deadline=Date.now()+120000;
    while(!matcher.solved&&!matcher.failed&&Date.now()<deadline)matcher.step();
    refinement={solved:matcher.solved,failed:matcher.failed,error:matcher.error,phase:matcher.phase};
    if(matcher.solved){
     finalRoutes=matcher.traces.map(t=>({...t,route:[...escapes.find(e=>e.pcb_trace_id===t.pcb_trace_id+"_before").route.slice(0,-1),...t.route,...escapes.find(e=>e.pcb_trace_id===t.pcb_trace_id+"_after").route.slice(1)]}));
     audit=auditDdrGeometry(input,finalRoutes,names);
    }
   }else refinement={skipped:"Seed exceeds absolute-length ceilings; adding meanders cannot repair it"};
  }
  const result={seed:i,...seed,preliminaryConnectivitySolved:solver.solved,refinement,solved:!!audit?.pass,failed:solver.failed,elapsedMs:Date.now()-start,phase:solver.phase,error:solver.error,routeCount:solver.traces.length,geometricTimingPassed:audit?.pass??false,fixedPower:fullPower,buses:input.buses.map((b:any)=>({name:b.name,members:b.connectionNames.length,maxLengthSkew:b.maxLengthSkew})),stats:solver.stats,audit};
  const stem=`output/ddr-compliance/${prefix}-${i}`;
  writeFileSync(`${stem}.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({...result,stats:undefined,audit:audit?{pass:audit.pass,failures:audit.failures}:null}));
  if(audit?.pass){writeFileSync(`${stem}.srj.json`,JSON.stringify(input));writeFileSync(`${stem}.routes.json`,JSON.stringify(finalRoutes));}
  if(audit?.pass){console.log(`ACCEPTABLE TIMING CANDIDATE: ${stem}; native integration still required`);break;}
}
