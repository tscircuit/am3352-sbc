import cached from "../design/control-routes.json";
import {createHash} from 'node:crypto';
type RoutePoint={route_type:string;x:number;y:number;width?:number;layer?:string;from_layer?:string;to_layer?:string;layers?:string[];via_diameter?:number;via_hole_diameter?:number};
const saved: Array<{name:string;net:string;route:RoutePoint[];startExistingViaId?:string;endExistingViaId?:string;sourceTraceId?:string}>=cached;
const circuit:any[]=await Bun.file(process.argv[2]??"output/board-pairs.circuit.json").json();
const netmap=await Bun.file('output/copper-net-map.json').json();
const circuitSha256=createHash('sha256').update(new Uint8Array(await Bun.file(process.argv[2]??'output/board-pairs.circuit.json').arrayBuffer())).digest('hex');
if(netmap.circuitSha256!==circuitSha256)throw Error('Refresh the native copper net map before auditing replay');
function normalized(points:any[]){const result:string[]=[];for(const p of points){const q=p.route_type==='wire'?{t:p.route_type,x:p.x,y:p.y,width:p.width,layer:p.layer}:{t:p.route_type,x:p.x,y:p.y,layers:[p.from_layer,p.to_layer].sort(),diameter:p.via_diameter,hole:p.via_hole_diameter};const value=JSON.stringify(q);if(value!==result.at(-1))result.push(value);}return JSON.stringify(result)}
const failures:string[]=[];
for(const s of saved){const actual=circuit.find(e=>e.type==='pcb_trace'&&e.pcb_trace_id===`saved_control_${s.name}`);if(!actual||(normalized(actual.route)!==normalized(s.route) && normalized(actual.route)!==normalized([...s.route].reverse().map(p=>p.route_type==="via"?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p))))failures.push(`${s.name}: copper differs from validated paths`);for(const p of s.route){if(p.route_type!=='via')continue;const via=circuit.find(e=>e.type==='pcb_via'&&e.pcb_trace_id===actual?.pcb_trace_id&&Math.hypot(e.x-p.x,e.y-p.y)<1e-7);if(!via||via.outer_diameter!==.3||via.hole_diameter!==.15||!['top','inner1','inner2','bottom'].every(l=>via.layers.includes(l)))failures.push(`${s.name}: incorrect via span or dimensions`);}}
for(const s of saved){
 const actualNet=(netmap.labels[netmap.identities[`saved_control_${s.name}`]]??'').replace(/^ROUTED_/,'');
 if(actualNet!==s.net)failures.push(`${s.name}: emitted net is ${actualNet||'unmapped'}, expected ${s.net}`);
 if(s.sourceTraceId && !circuit.some(e=>e.type==="source_trace"&&e.source_trace_id===s.sourceTraceId&&e.name===s.name))failures.push(`${s.name}: cached source trace identity changed`);
 for(const [field,point] of [["startExistingViaId",s.route[0]],["endExistingViaId",s.route.at(-1)!]] as const){
  const id=(s as unknown as Record<string,unknown>)[field];if(typeof id!=="string")continue;
  const via=circuit.find(e=>e.type==="pcb_via"&&e.pcb_via_id===id);
  if(!via||Math.hypot(via.x-point.x,via.y-point.y)>1e-7||!["top","inner1","inner2","bottom"].every(l=>via.layers.includes(l)))failures.push(`${s.name}: existing endpoint via moved or no longer spans all layers`);
 }
}
const report={savedControlPaths:saved.length,exactGeometryPreserved:failures.length===0,failures,wholeBoardComplete:false,fabricationReady:false};await Bun.write('output/control-replay-audit.json',JSON.stringify(report,null,2));console.log(report);if(failures.length)process.exitCode=1;
