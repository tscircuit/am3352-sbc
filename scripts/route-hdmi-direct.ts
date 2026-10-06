import {readFileSync,writeFileSync} from 'node:fs';
import {BusLanesSolver,pairLengthReports,exteriorPairSpacingReports,type SimpleRouteJson,type Trace} from '@tscircuit/bus-lanes-solver';
import {compactRoutingInput} from '../design/compact-routing-input';
const input:SimpleRouteJson=compactRoutingInput(JSON.parse(readFileSync('output/peripheral-escaped.srj.json','utf8')));
const progress=JSON.parse(readFileSync('output/peripheral-sequential.progress.json','utf8'));
const completed:Trace[]=progress.completed.filter((t:Trace)=>!input.differentialPairs!.slice(4).some(p=>p.connectionNames.includes(t.connection_name!)));
const results:any[]=[];
// Local candidate generator for aligned pairs. Every trial must pass the
// published solver's validation plus independent native audits after integration.
for(const [index,pair] of input.differentialPairs!.entries()){
 if(index<4)continue;
 const layer=index%2===0?'inner1':'inner2';
 const connections=input.connections.filter(c=>pair.connectionNames.includes(c.name));
 for(const c of connections)for(const p of c.pointsToConnect)p.layer=layer;
 for(const t of input.traces??[])if(pair.connectionNames.includes(t.connection_name!)){
  const p=t.route.at(-1)!;if(p.route_type==='wire')p.layer=layer;
  for(const v of t.route)if(v.route_type==='via')v.to_layer=layer;
 }
 const local={...input,traces:[...(input.traces??[]),...completed],connections,differentialPairs:[pair]};
 const ends=[0,1].map(end=>({x:(connections[0].pointsToConnect[end].x+connections[1].pointsToConnect[end].x)/2,y:(connections[0].pointsToConnect[end].y+connections[1].pointsToConnect[end].y)/2}));
 const start=performance.now();let success:Trace[]|undefined;let failures:Record<string,number>={};
 for(const ratio of [.15,.25,.35,.45]){
  for(const bias of [0,.25,-.25,.5,-.5,1,-1]){
   const [a,b]=ends;const dx=b.x-a.x,dy=b.y-a.y,span=Math.hypot(dx,dy);
   const normal={x:-dy/span,y:dx/span};
   const mid1={x:a.x+ratio*dx,y:a.y+ratio*dy+bias};
   const mid2={x:b.x-ratio*dx,y:b.y-ratio*dy+bias};
   const offsetPath=(points:{x:number;y:number}[],offset:number)=>points.map((p,i)=>{
    const normals=points.slice(1).map((q,j)=>{const dx=q.x-points[j].x,dy=q.y-points[j].y,n=Math.hypot(dx,dy);return{x:-dy/n,y:dx/n}});
    if(i===0)return{x:p.x+offset*normals[0].x,y:p.y+offset*normals[0].y};
    if(i===points.length-1)return{x:p.x+offset*normals.at(-1)!.x,y:p.y+offset*normals.at(-1)!.y};
    const n=normals[i-1],m=normals[i],f=offset/(1+n.x*m.x+n.y*m.y);return{x:p.x+(n.x+m.x)*f,y:p.y+(n.y+m.y)*f};
   });
   const lead=.45+ratio;
   const core=[{x:a.x+lead,y:a.y},{x:(a.x+b.x-Math.abs(dy))/2,y:a.y},{x:(a.x+b.x+Math.abs(dy))/2,y:b.y},{x:b.x-lead,y:b.y}];
   if(core.some((p,i)=>i>0&&p.x<core[i-1].x))continue;
   const rails=connections.map((c,i)=>{
    const sign=c.pointsToConnect[0].y>=a.y?1:-1;const offset=(.1+(pair.traceGap??.15))/2*sign;
    const rail=offsetPath(core,offset),start=c.pointsToConnect[0],end=c.pointsToConnect[1];
    const points=[start,{x:start.x+Math.abs(rail[0].y-start.y),y:rail[0].y},...rail,{x:end.x-Math.abs(rail.at(-1)!.y-end.y),y:rail.at(-1)!.y},end];
    return {type:'pcb_trace' as const,pcb_trace_id:`hdmi_direct_${c.name}`,connection_name:c.name,source_trace_id:c.source_trace_id,route:points.map(p=>({route_type:'wire' as const,x:p.x,y:p.y,layer,width:.1})),coupledSection:[2,5] as [number,number]};
   });
   const solver=BusLanesSolver.forRefinement(local,rails,{smoothTuning:false,maxSearchIterations:100000,maxLaneIterations:100000});
   while(!solver.solved&&!solver.failed&&performance.now()-start<20000)solver.step();if(!solver.solved&&!solver.failed)solver.tryFinalAcceptance();
   if(solver.solved){success=solver.traces;break}
   failures[solver.error??solver.phase]=(failures[solver.error??solver.phase]??0)+1;
  }
  if(success)break;
 }
 if(success)completed.push(...success);
 const result={index,solved:!!success,seconds:(performance.now()-start)/1000,failures};results.push(result);console.log(JSON.stringify(result));
 writeFileSync('output/hdmi-direct.progress.json',JSON.stringify({results,completed},null,2));
}
