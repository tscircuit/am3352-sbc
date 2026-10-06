/** Unaccepted experiment: bus_lanes routes each leg around a through-via.
 * Extra via flight time is not verified; the normal acceptance gate remains strict.
 */
import {BusLanesSolver} from '@tscircuit/bus-lanes-solver';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const helper=resolve('output/ddr-compliance/transition-internals.mjs');
writeFileSync(helper,readFileSync('node_modules/@tscircuit/bus-lanes-solver/dist/index.js','utf8')+'\nexport {VectorScene,fixedCopper};\n');
const {VectorScene,fixedCopper}=await import(pathToFileURL(helper).href);
const stem='output/ddr-compliance/ripup-57';
const input=JSON.parse(readFileSync(stem+'.srj.json','utf8'));
let routes:any[]=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const length=(t:any)=>t.route.slice(1).reduce((s:number,p:any,i:number)=>s+(p.route_type==='wire'&&t.route[i].route_type==='wire'&&p.layer===t.route[i].layer?Math.hypot(p.x-t.route[i].x,p.y-t.route[i].y):0),0);
const events:any[]=[];
for(const id of [40,29,39,31,38]){
 const name='source_trace_'+id,t=routes.find(t=>t.connection_name===name),c=input.connections.find((c:any)=>c.name===name);
 const a=t.route.findIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top'),b=t.route.findLastIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top');
 const rest=routes.filter(t=>t.connection_name!==name);
 const local={...input,traces:rest,buses:[],differentialPairs:[],connections:[c]};
 const copper=fixedCopper(local),viaScenes=['top','inner1','inner2','bottom'].map(layer=>new VectorScene({...local,minTraceToPadEdgeClearance:.125},{...c,pointsToConnect:c.pointsToConnect.map((p:any)=>({...p,layer}))},.3,copper));
 let best=t,attempts=0;
 const deadline=Date.now()+30000;
 for(const startLayer of ['inner1','inner2'])for(const y of [-7.2,-8,-8.8,-9.6])for(let x=-.8;x<=6.4;x+=.4){
  if(Date.now()>deadline)break;
  const point={x,y};if(!viaScenes.every(s=>s.visible(point,point)))continue;
  if(t.route.filter((p:any)=>p.route_type==='via').some((p:any)=>Math.hypot(p.x-x,p.y-y)<.4))continue;
  const endLayer=startLayer==='inner1'?'inner2':'inner1';
  const adapt=(r:any[],layer:string)=>r.map(p=>p.route_type==='via'?{...p,from_layer:p.from_layer==='top'?'top':layer,to_layer:p.to_layer==='top'?'top':layer}:p.layer==='top'?p:{...p,layer});
  const before=adapt(t.route.slice(0,a+1),startLayer),after=adapt(t.route.slice(b),endLayer);
  const stubs=[{...t,route:before},{...t,route:after}];
  const legs:any[]=[];
  for(const [start,end,layer] of [[before.at(-1),point,startLayer],[point,after[0],endLayer]] as any[]){
   const sub={...local,traces:[...rest,...stubs],connections:[{...c,pointsToConnect:[{...start,layer},{...end,layer}]}]};
   const solver=new BusLanesSolver(sub,{maxSearchIterations:10000,maxLaneIterations:5000,smoothTuning:false,denseSearch:false});
   const endTime=Math.min(Date.now()+500,deadline);
   while(!solver.solved&&!solver.failed&&Date.now()<endTime)solver.step();
   if(!solver.solved)break;legs.push(solver.traces[0].route);
  }
  attempts++;
  if(legs.length!==2)continue;
  const via={route_type:'via',...point,from_layer:startLayer,to_layer:endLayer,layers:['top','inner1','inner2','bottom'],via_diameter:.3,via_hole_diameter:.15};
  const candidate={...t,route:[...before.slice(0,-1),...legs[0],via,...legs[1],...after.slice(1)],curvedSegments:undefined};
  if(length(candidate)<length(best)-.01){best=candidate;console.log(JSON.stringify({signal:name,planarLengthMm:length(best),via:point,startLayer}));}
 }
 if(best!==t){routes=routes.map(r=>r===t?best:r);events.push({signal:name,beforeMm:length(t),afterMm:length(best),viaCount:3,attempts});}
 console.log(JSON.stringify({finished:name,attempts,gainMm:length(t)-length(best)}));
 writeFileSync(stem+'.transitions.routes.json',JSON.stringify(routes));writeFileSync(stem+'.transitions.json',JSON.stringify({events,accepted:false,extraViaFlightTimeVerified:false},null,2));
}
