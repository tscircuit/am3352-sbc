import {BusLanesSolver,type Trace} from '@tscircuit/bus-lanes-solver';
import {readFileSync,writeFileSync} from 'node:fs';
import {auditDdrGeometry,assertDdrConstraints} from '../design/ddr-compliance';
const stem=process.argv[2]??'output/ram-seeds/pairs-2';
const input:any=JSON.parse(readFileSync(stem+'.srj.json','utf8'));
let routes:any[]=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const required:any=JSON.parse(readFileSync('output/ddr-current.srj.json','utf8'));
input.buses=required.buses.filter((b:any)=>b.connectionNames.length>1);
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
assertDdrConstraints(input,names);
const pairs=new Set(input.differentialPairs.flatMap((p:any)=>p.connectionNames));
const selected=process.env.DDR_ONLY_SIGNALS?new Set<string>(JSON.parse(process.env.DDR_ONLY_SIGNALS)):null;
const widthOverride=process.env.DDR_TRACE_WIDTH_MM?Number(process.env.DDR_TRACE_WIDTH_MM):undefined;
if(widthOverride!==undefined&&(!Number.isFinite(widthOverride)||widthOverride<.09||widthOverride>.1))throw Error('Exploratory trace width must be 0.09–0.10 mm');
if(widthOverride!==undefined)input.minTraceWidth=widthOverride;
const length=(t:any)=>t.route.slice(1).reduce((s:number,p:any,i:number)=>{const a=t.route[i];return s+(p.route_type==='wire'&&a.route_type==='wire'&&p.layer===a.layer?Math.hypot(p.x-a.x,p.y-a.y):0)},0);
const originalAudit=auditDdrGeometry(input,routes,names);
const events:any[]=[];
for(let pass=0;pass<6;pass++){
 let improved=0;
 const order=[...routes].filter(t=>!pairs.has(t.connection_name)&&(!selected||selected.has(names[t.connection_name]))).sort((a,b)=>length(b)-length(a));
 for(const previous of order){
  const t=routes.find(t=>t.connection_name===previous.connection_name);
  const a=t.route.findIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top'), b=t.route.findLastIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top');
  let best=t;
  for(const layer of process.env.DDR_TRY_LAYER==='1'?['inner1','inner2']:[t.route[a].layer]){
  const adapt=(r:any[])=>r.map(p=>p.route_type==='via'?{...p,from_layer:p.from_layer==='top'?'top':layer,to_layer:p.to_layer==='top'?'top':layer}:{...p,layer:p.layer==='top'?'top':layer,width:widthOverride??p.width});
  const before={...t,pcb_trace_id:t.pcb_trace_id+'_before',route:adapt(t.route.slice(0,a+1))};
  const after={...t,pcb_trace_id:t.pcb_trace_id+'_after',route:adapt(t.route.slice(b))};
  const c=input.connections.find((c:any)=>c.name===t.connection_name);
  const local={...input,connections:[{...c,...(widthOverride?{width:widthOverride,nominalTraceWidth:widthOverride}:{}),pointsToConnect:[before.route.at(-1),after.route[0]]}],buses:[],differentialPairs:[],traces:[...input.traces??[],...routes.filter(r=>r!==t),before,after]};
  const solver=new BusLanesSolver(local,{maxSearchIterations:50000,maxLaneIterations:50000,smoothTuning:false,denseSearch:false});
  const deadline=Date.now()+2000;while(!solver.solved&&!solver.failed&&Date.now()<deadline)solver.step();
  if(solver.solved){const replacement={...t,route:[...before.route.slice(0,-1),...solver.traces[0].route,...after.route.slice(1)],curvedSegments:solver.traces[0].curvedSegments?.map((i:number)=>i+a)};
   if(length(best)-length(replacement)>.01)best=replacement;
  }
  }
  const gain=length(t)-length(best);
  if(gain>.01){routes=routes.map(r=>r===t?best:r);improved+=gain;const event={pass,name:names[t.connection_name],before:length(t),after:length(best),gain};events.push(event);console.log(JSON.stringify(event));}
 }
 console.log(JSON.stringify({pass,totalImprovementMm:improved}));
 if(improved<.01)break;
}
const audit=auditDdrGeometry(input,routes,names);
const outputStem=stem+(widthOverride?'.narrow-shortened':'.shortened');
writeFileSync(outputStem+'.routes.json',JSON.stringify(routes));
writeFileSync(outputStem+'.srj.json',JSON.stringify(input));
writeFileSync(outputStem+'.json',JSON.stringify({events,traceWidthMm:widthOverride,requiresStackupVerification:true,before:originalAudit,after:audit},null,2));
console.log(JSON.stringify({groups:audit.groups,failures:audit.failures}));
