import {BusLanesSolver,type SimpleRouteJson,type Trace} from "@tscircuit/bus-lanes-solver";
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {assertDdrConstraints,auditDdrGeometry} from "../design/ddr-compliance";
import {ddrTimingGroups,ddrPairs} from "../design/ddr-rules";
import placement from "../design/ram-placement.json";
import {isRamRef} from "../design/ram-placement";
import {optimizeBytePins} from "./optimize-ddr-byte-pins";
// Expose the installed, unchanged local-escape helper for this experiment.
// Timing buses are retained; only carrier assignment is supplied explicitly.
const solverVersion=JSON.parse(readFileSync('node_modules/@tscircuit/bus-lanes-solver/package.json','utf8')).version;
const bundle=readFileSync('node_modules/@tscircuit/bus-lanes-solver/dist/index.js','utf8');
const internals=resolve(`output/ddr-compliance/router-internals-${solverVersion}.mjs`);
writeFileSync(internals,bundle+'\nexport {routeAlternateSignalDogbones};\n');
const {routeAlternateSignalDogbones}=await import(pathToFileURL(internals).href);
const original:any=JSON.parse(readFileSync('output/ddr-current.srj.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const sc=new Map(cj.filter(e=>e.type==='source_component').map(e=>[e.source_component_id,e.name]));
const ramComponents=new Set(cj.filter(e=>e.type==='pcb_component'&&isRamRef(sc.get(e.source_component_id)??'')).map(e=>e.pcb_component_id));
const ramPorts=new Set(cj.filter(e=>e.type==='pcb_port'&&ramComponents.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
const seeds=JSON.parse(process.env.DDR_SEEDS??'[{"x":0,"y":-16,"rotation":270},{"x":0,"y":-22,"rotation":270}]');
const modes=JSON.parse(process.env.DDR_PARTITION_MODES??'[0,1,2,3]');
for(let si=0;si<seeds.length;si++)for(const mode of modes){
 const seed=seeds[si],input:any=structuredClone(original);
 input.traces=[];input.allowedLayers=['inner1','inner2'];
 input.buses=input.buses.filter((b:any)=>b.connectionNames.length>1);
 input.obstacles=input.obstacles.filter((o:any)=>!o.isCopperPour&&!o.circuitJsonMetadata?.pcb_via_id&&!(o.layers.length===1&&o.layers[0]==='bottom'&&o.circuitJsonMetadata?.pcb_smtpad_id));
 const a=(seed.rotation-placement.rotation)*Math.PI/180;
 const move=(p:any)=>{const x=p.x-placement.x,y=p.y-placement.y;p.x=seed.x+x*Math.cos(a)-y*Math.sin(a);p.y=seed.y+x*Math.sin(a)+y*Math.cos(a)};
 for(const o of input.obstacles)if(ramComponents.has(o.componentId)){move(o.center);if((seed.rotation-placement.rotation)%180)[o.width,o.height]=[o.height,o.width];}
 for(const c of input.connections)for(const p of c.pointsToConnect)if(ramPorts.has(p.pcb_port_id))move(p);
 if(process.env.DDR_ONLY==='1'){const chips=new Set(cj.filter(e=>e.type==='pcb_component'&&['U1','U3'].includes(sc.get(e.source_component_id)??'')).map(e=>e.pcb_component_id));input.obstacles=input.obstacles.filter((o:any)=>!o.componentId||chips.has(o.componentId));}
 const ramDqMap=process.env.DDR_SWIZZLE==='1'?optimizeBytePins(input,names):undefined;
 assertDdrConstraints(input,names);
 const groups:string[][]=ddrPairs.map(p=>input.connections.filter((c:any)=>p.signals.includes(names[c.name])).map((c:any)=>c.name));
 for(const c of input.connections)if(!groups.some(g=>g.includes(c.name)))groups.push([c.name]);
 const orient=(p:any,q:any,r:any)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const crosses=(c:any,d:any)=>{const [p,q]=c.pointsToConnect,[r,s]=d.pointsToConnect;return orient(p,q,r)*orient(p,q,s)<-1e-8&&orient(r,s,p)*orient(r,s,q)<-1e-8;};
 const edges:number[][]=groups.map(()=>groups.map(()=>0));
 for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)for(const n of groups[i])for(const m of groups[j])if(crosses(input.connections.find((c:any)=>c.name===n),input.connections.find((c:any)=>c.name===m)))edges[i][j]++;
 const fixed=groups.map(g=>process.env.DDR_MIX_BYTES==='1'?-1:ddrTimingGroups.slice(0,2).findIndex(b=>b.signals.includes(names[g[0]])));
 let state=(mode+1)*13871;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 let best:number[]=[];let bestCost=Infinity;
 const cost=(layers:number[])=>edges.reduce((sum,row,i)=>sum+row.reduce((s,w,j)=>s+(layers[i]===layers[j]?w:0),0),0);
 for(let attempt=0;attempt<80;attempt++){
  const layers=groups.map((_,i)=>fixed[i]===-1?Number(random()>.5):fixed[i]);
  let score=cost(layers);
  for(let it=0;it<1500;it++){
   const i=Math.floor(random()*groups.length);if(fixed[i]!==-1)continue;
   layers[i]=1-layers[i];const next=cost(layers),temp=.1+2*(1-it/1500);
   if(next<score||random()<Math.exp((score-next)/temp))score=next;else layers[i]=1-layers[i];
   if(score<bestCost){bestCost=score;best=[...layers];}
  }
 }
 const targets=new Map(groups.flatMap((g,i)=>g.map(n=>[n,best[i]?'inner2':'inner1'] as [string,string])));
 if(process.env.DDR_CPU_ROWS==='1'){
  for(const c of input.connections){const row=Math.round((c.pointsToConnect[0].y+6.8)/.8);targets.set(c.name,Math.abs(row)%2?'inner2':'inner1');}
  const pairLayers=JSON.parse(process.env.DDR_PAIR_LAYERS??'["inner1","inner2","inner1"]');
  for(const [i,pair] of input.differentialPairs.entries())for(const name of pair.connectionNames)targets.set(name,pairLayers[i]);
 }
 const start=Date.now();let solver:any,escapes:any;
 const staged=process.env.DDR_STAGED==='1';
 const stem=`output/ddr-compliance/${process.env.DDR_RUN_NAME?process.env.DDR_RUN_NAME+'-':''}${staged?'staged-':''}${process.env.DDR_MIX_BYTES==='1'?'mixed-':''}${ramDqMap?'swizzled':'partition'}-${si}-${mode}`;
 try{
  const fanout=routeAlternateSignalDogbones(input,{targetLayers:targets,viaDiameter:.3,viaHoleDiameter:.15,traceWidth:.1,clearance:.1,allowBlindAndBuriedVias:false},mode);
  escapes=fanout.traces.map((t:any)=>({...t,source_trace_id:t.connection_name}));
  const carrierInput={...input,connections:fanout.connections,traces:escapes};
  writeFileSync(stem+'.carrier.srj.json',JSON.stringify(carrierInput));
  const allPhases=[...input.buses.map((b:any)=>b.connectionNames),input.connections.filter((c:any)=>!input.buses.some((b:any)=>b.connectionNames.includes(c.name))).map((c:any)=>c.name)];
  const phases=staged?JSON.parse(process.env.DDR_GROUP_ORDER??'[0,1,2,3]').map((i:number)=>allPhases[i]):[input.connections.map((c:any)=>c.name)];
  const completed:any[]=[];let stage=0;
  for(const phase of phases){
   if(!phase.length)continue;
   const local={...carrierInput,connections:carrierInput.connections.filter((c:any)=>phase.includes(c.name)),traces:[...escapes,...completed],buses:input.buses.filter((b:any)=>b.connectionNames.every((n:string)=>phase.includes(n))),differentialPairs:input.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>phase.includes(n)))};
   solver=new BusLanesSolver(local,{maxSearchIterations:Number(process.env.DDR_ITERATIONS??300000),maxLaneIterations:100000,smoothTuning:process.env.DDR_SMOOTH!=='0',denseSearch:process.env.DDR_DENSE!=='0'});
   let nextLog=Date.now()+15000;const deadline=Date.now()+Number(process.env.DDR_SEED_MS??60000);
   while(!solver.solved&&!solver.failed&&Date.now()<deadline){solver.step();if(Date.now()>nextLog){console.log(JSON.stringify({si,mode,...seed,stage,crossingCost:bestCost,phase:solver.phase,iterations:solver.iterations,partial:solver.traces.length}));nextLog=Date.now()+15000;}}
   console.log(JSON.stringify({si,mode,stage,phaseSignals:phase.length,solved:solver.solved,error:solver.error}));
   if(!solver.solved)break;
   completed.push(...solver.traces);stage++;
  }
  const routes=completed.map((t:any)=>{
   const ends=escapes.filter((e:any)=>e.connection_name===t.connection_name);
   const begin=ends.find((e:any)=>Math.hypot(e.route.at(-1).x-t.route[0].x,e.route.at(-1).y-t.route[0].y)<1e-5);
   const end=ends.find((e:any)=>e!==begin);
   if(!begin||!end)throw Error('Cannot reconnect local pad escapes');
   const reverse=end.route.toReversed().map((p:any)=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p);
   return {...t,source_trace_id:t.connection_name,route:[...begin.route.slice(0,-1),...t.route,...reverse.slice(1)],coupledSection:t.coupledSection?.map((i:number)=>i+begin.route.length-1),curvedSegments:t.curvedSegments?.map((i:number)=>i+begin.route.length-1)};
  });
  const audit=auditDdrGeometry(input,routes,names);
  const result={...seed,ramDqMap,solverVersion,solved:solver.solved&&routes.length===input.connections.length,failed:solver.failed,timedOut:!solver.solved&&!solver.failed,error:solver.error,phase:solver.phase,crossingCost:bestCost,elapsedMs:Date.now()-start,routeCount:routes.length,geometricTimingPassed:audit?.pass??false,carrierLayers:Object.fromEntries([...targets].map(([id,l])=>[names[id],l])),audit};
  writeFileSync(stem+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,carrierLayers:undefined,audit:audit?{pass:audit.pass,failures:audit.failures}:null}));
  if(routes.length){writeFileSync(stem+'.srj.json',JSON.stringify(input));writeFileSync(stem+'.routes.json',JSON.stringify(routes));}
  if(audit?.pass)process.exit(0);
  if(!solver.solved&&!solver.failed)solver.tryFinalAcceptance();
  Bun.gc(true);
 }catch(e){const result={...seed,solved:false,failed:true,error:String(e),phase:solver?.phase??'fanout',elapsedMs:Date.now()-start};writeFileSync(stem+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
}
process.exitCode=2; // No complete candidate passed the independent timing audit.
