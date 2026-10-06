import type { SimpleRouteJson } from "@tscircuit/bus-lanes-solver";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertDdrConstraints, auditDdrGeometry } from "../design/ddr-compliance";
import placement from "../design/ram-placement.json";
import { isRamRef } from "../design/ram-placement";
import { optimizeBytePins } from './optimize-ddr-byte-pins';

// Optional isolated published package for release evaluation; board dependencies
// and accepted copper are not changed by an exploratory routing run.
const solverRoot=resolve(process.env.DDR_SOLVER_PACKAGE??"node_modules/@tscircuit/bus-lanes-solver");
const {BusLanesPipelineSolver}=await import(pathToFileURL(resolve(solverRoot,"dist/index.js")).href);
const solverVersion=JSON.parse(readFileSync(resolve(solverRoot,"package.json"),"utf8")).version;
const original:any=JSON.parse(readFileSync("output/ddr-current.srj.json","utf8"));
const cj:any[]=JSON.parse(readFileSync("output/ddr-current.circuit.json","utf8"));
const names=Object.fromEntries(cj.filter(e=>e.type==="source_trace").map(e=>[e.source_trace_id,e.name]));
const sourceComponents=new Map(cj.filter(e=>e.type==="source_component").map(e=>[e.source_component_id,e.name]));
const ramComponents=new Set(cj.filter(e=>e.type==="pcb_component"&&isRamRef(sourceComponents.get(e.source_component_id)??"")).map(e=>e.pcb_component_id));
const ramPorts=new Set(cj.filter(e=>e.type==="pcb_port"&&ramComponents.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
const ddrChips=new Set(cj.filter(e=>e.type==='pcb_component'&&['U1','U3'].includes(sourceComponents.get(e.source_component_id)??'')).map(e=>e.pcb_component_id));
const bgaPorts=new Set(cj.filter(e=>e.type==='pcb_port'&&ddrChips.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
const keepBgaPower=process.env.DDR_BGA_POWER==='1';
const fullPower=process.argv.includes("--fixed-power");
const seeds=process.env.DDR_SEEDS?JSON.parse(process.env.DDR_SEEDS):[
  placement,
  ...[270,0,90,180].flatMap(rotation=>[-18,-22,-26].flatMap(y=>[0,-4,4].map(x=>({x,y,rotation})))),
];
const prefix=process.env.DDR_RUN_NAME??(fullPower?"fixed-power":"placement");
const limitMs=Number(process.env.DDR_SEED_MS??30000);
const maxIterations=Number(process.env.DDR_ITERATIONS??100000);
const startIndex=Number(process.env.DDR_START??0), stride=Number(process.env.DDR_STRIDE??1);
mkdirSync("output/ddr-compliance",{recursive:true});
let foundTimingCandidate = false;
for(let i=startIndex;i<seeds.length;i+=stride){
  const seed=seeds[i];
  if(fullPower&&JSON.stringify(seed)!==JSON.stringify(placement))throw Error("Fixed power requires the unchanged placement");
  const input:any=structuredClone(original);
  const bgaPower=(input.traces??[]).filter((t:any)=>t.connectsTo?.some((p:string)=>bgaPorts.has(p)));
  const ramPower=bgaPower.filter((t:any)=>t.connectsTo?.some((p:string)=>ramPorts.has(p)));
  const touches=(o:any,traces:any[])=>traces.some(t=>t.route.some((p:any)=>Math.hypot(p.x-o.center.x,p.y-o.center.y)<1e-6));
  const ramPowerVias=new Set(input.obstacles.filter((o:any)=>o.circuitJsonMetadata?.pcb_via_id&&touches(o,ramPower)));
  const traceWidthMm=Number(process.env.DDR_TRACE_WIDTH_MM??input.minTraceWidth);
  if(!Number.isFinite(traceWidthMm)||traceWidthMm<.09||traceWidthMm>.1)throw Error('Exploratory DDR width must be 0.09–0.10 mm');
  input.minTraceWidth=traceWidthMm;input.nominalTraceWidth=traceWidthMm;
  for(const c of input.connections){c.width=traceWidthMm;c.nominalTraceWidth=traceWidthMm;}
  input.allowedLayers=["inner1","inner2"];
  input.buses=input.buses.filter((b:any)=>b.connectionNames.length>1);
  if(process.env.DDR_LAYER_ASSIGNMENT){
    const layers=JSON.parse(process.env.DDR_LAYER_ASSIGNMENT);
    for(let g=0;g<input.buses.length;g++)input.buses[g].preferredLayer=layers[g];
  }
  input.obstacles=input.obstacles.filter((o:any)=>!o.isCopperPour&&(fullPower||((!o.circuitJsonMetadata?.pcb_via_id||(keepBgaPower&&touches(o,bgaPower)))&&!(o.layers.length===1&&o.layers[0]==="bottom"&&o.circuitJsonMetadata?.pcb_smtpad_id))));
  if(!fullPower)input.traces=keepBgaPower?bgaPower:[];
  // DDR-first placement exploration: supporting/peripheral parts are movable.
  // Preserve both BGA pad fields and board obstacles; require full integration later.
  if(process.env.DDR_ONLY==='1'){
    if(fullPower)throw Error('DDR-only search cannot preserve fixed power copper');
    input.obstacles=input.obstacles.filter((o:any)=>!o.componentId||ddrChips.has(o.componentId));
  }
  const angle=(seed.rotation-placement.rotation)*Math.PI/180;
  const move=(p:any)=>{const x=p.x-placement.x,y=p.y-placement.y;p.x=seed.x+x*Math.cos(angle)-y*Math.sin(angle);p.y=seed.y+x*Math.sin(angle)+y*Math.cos(angle);};
  for(const o of input.obstacles)if(ramComponents.has(o.componentId)){move(o.center);if((seed.rotation-placement.rotation)%180)[o.width,o.height]=[o.height,o.width];if(o.points)for(const p of o.points)move(p);}
  if(keepBgaPower&&!fullPower){
    for(const t of ramPower)for(const p of t.route)move(p);
    for(const o of input.obstacles)if(ramPowerVias.has(o))move(o.center);
  }
  for(const c of input.connections)for(const p of c.pointsToConnect)if(ramPorts.has(p.pcb_port_id))move(p);
  const ramDqMap=process.env.DDR_SWIZZLE==='1'?optimizeBytePins(input,names,true):undefined;
  // This search has no pairs-only/geometry-only mode: constraints cannot be dropped.
  assertDdrConstraints(input,names);
  if(process.env.DDR_REVERSE==="1")for(const c of input.connections)c.pointsToConnect.reverse();
  const solver=new BusLanesPipelineSolver(input as SimpleRouteJson,{maxSearchIterations:maxIterations,maxLaneIterations:maxIterations,smoothTuning:process.env.DDR_SMOOTH!=="0"});
  const start=Date.now();let nextLog=start+15000;
  try{while(!solver.solved&&!solver.failed&&Date.now()-start<limitMs){
    solver.step();
    if(Date.now()>nextLog){console.log(JSON.stringify({seed:i,...seed,elapsedMs:Date.now()-start,phase:solver.phase,iterations:solver.iterations,stats:{...(solver.stats as any),busLengths:undefined,pairLengths:undefined,traceLengthsMm:undefined}}));nextLog=Date.now()+15000;}
  }}catch(e){solver.failed=true;solver.error=String(e);}
  // A complete accepted route can survive a deadline during optimization.
  // Audit the restored result, never a mutable optimization candidate.
  if(!solver.solved&&!solver.failed)solver.tryFinalAcceptance();
  const audit=solver.solved?auditDdrGeometry(input,solver.traces,names):null;
  const result={solverVersion,seed:i,...seed,ramDqMap,traceWidthMm,requiresStackupVerification:true,solved:solver.solved,failed:solver.failed,timedOut:!solver.solved&&!solver.failed,elapsedMs:Date.now()-start,phase:solver.phase,error:solver.error,routeCount:solver.traces.length,geometricTimingPassed:audit?.pass??false,fixedPower:fullPower,fixedBgaPower:keepBgaPower,fixedPowerTraces:input.traces.length,requiresPowerRegeneration:!fullPower,requiresPeripheralReplacement:process.env.DDR_ONLY==='1',buses:input.buses.map((b:any)=>({name:b.name,members:b.connectionNames.length,maxLengthSkew:b.maxLengthSkew})),stats:solver.stats,audit};
  const stem=`output/ddr-compliance/${prefix}-${i}`;
  writeFileSync(`${stem}.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({...result,stats:undefined,audit:audit?{pass:audit.pass,failures:audit.failures}:null}));
  // Retain the exact input and available output even when a search fails or
  // exhausts its time budget. Partial output is never eligible for acceptance.
  writeFileSync(`${stem}.srj.json`,JSON.stringify(input));writeFileSync(`${stem}.routes.json`,JSON.stringify(solver.traces));
  if(audit?.pass){foundTimingCandidate=true;console.log(`ACCEPTABLE TIMING CANDIDATE: ${stem}; native integration still required`);break;}
  // Release generator-held search graphs before trying another RAM pose.
  if(!solver.solved&&!solver.failed)solver.tryFinalAcceptance();
  Bun.gc(true);
}
// A completed search is not a successful DDR route. Native integration remains
// a separate gate even when this geometric checkpoint succeeds.
if(!foundTimingCandidate)process.exitCode=2;
