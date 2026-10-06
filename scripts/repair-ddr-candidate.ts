/** Reroute selected complete connections around the remaining candidate copper. */
import{BusLanesSolver}from'@tscircuit/bus-lanes-solver';import{readFileSync,writeFileSync}from'node:fs';
import{auditDdrGeometry}from'../design/ddr-compliance';
const stem=process.argv[2];const input=JSON.parse(readFileSync(stem+'.srj.json','utf8'));let routes=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const groups=JSON.parse(process.env.DDR_REPAIR_GROUPS??JSON.stringify([...input.differentialPairs.map((p:any)=>p.connectionNames),['source_trace_6'],['source_trace_5']]));
const events=[];
for(const group of groups){
 const old=routes.filter((t:any)=>group.includes(t.connection_name));let accepted:any=null;
 for(const flip of [false,true]){
  const escapes=new Map<string,any>(),stubs:any[]=[];
  const connections=old.map((t:any)=>{
   const a=t.route.findIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top'),b=t.route.findLastIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top');
   const layer=flip?(t.route[a].layer==='inner1'?'inner2':'inner1'):t.route[a].layer;
   const adapt=(r:any[])=>r.map(p=>p.route_type==='via'?{...p,from_layer:p.from_layer==='top'?'top':layer,to_layer:p.to_layer==='top'?'top':layer}:{...p,layer:p.layer==='top'?'top':layer});
   const before=adapt(t.route.slice(0,a+1)),after=adapt(t.route.slice(b));escapes.set(t.connection_name,{before,after});stubs.push({...t,route:before},{...t,route:after});
   return {...input.connections.find((c:any)=>c.name===t.connection_name),pointsToConnect:[before.at(-1),after[0]]};
  });
  const local={...input,connections,buses:[],differentialPairs:input.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>group.includes(n))),traces:[...routes.filter((t:any)=>!group.includes(t.connection_name)),...stubs]};
  const points=routes.flatMap((t:any)=>t.route);local.bounds={minX:Math.max(input.bounds.minX,Math.min(...points.map((p:any)=>p.x))-2),maxX:Math.min(input.bounds.maxX,Math.max(...points.map((p:any)=>p.x))+2),minY:Math.max(input.bounds.minY,Math.min(...points.map((p:any)=>p.y))-2),maxY:Math.min(input.bounds.maxY,Math.max(...points.map((p:any)=>p.y))+2)};
  const solver=new BusLanesSolver(local,{maxSearchIterations:100000,maxLaneIterations:10000,smoothTuning:true,denseSearch:false});const deadline=Date.now()+Number(process.env.DDR_REPAIR_MS??20000);
  while(!solver.solved&&!solver.failed&&Date.now()<deadline)solver.step();
  const event={signals:group.map((n:string)=>names[n]),flip,solved:solver.solved,failed:solver.failed,error:solver.error,phase:solver.phase};events.push(event);console.log(JSON.stringify(event));
  if(!solver.solved)continue;
  accepted=solver.traces.map(t=>{const{before,after}=escapes.get(t.connection_name!)!;return{...t,source_trace_id:t.connection_name,route:[...before.slice(0,-1),...t.route,...after.slice(1)],coupledSection:t.coupledSection?.map(i=>i+before.length-1),curvedSegments:t.curvedSegments?.map(i=>i+before.length-1)};});break;
 }
 if(accepted)routes=[...routes.filter((t:any)=>!group.includes(t.connection_name)),...accepted];
}
const audit=auditDdrGeometry(input,routes,names),out=stem+'.repaired';
writeFileSync(out+'.routes.json',JSON.stringify(routes));writeFileSync(out+'.srj.json',JSON.stringify(input));writeFileSync(out+'.json',JSON.stringify({events,audit},null,2));
console.log(JSON.stringify({groups:audit.groups,pairs:audit.pairs}));
