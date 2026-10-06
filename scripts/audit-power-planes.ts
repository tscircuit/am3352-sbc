import {readFile,writeFile} from "node:fs/promises";
import escapes from "../design/power-escapes.json";
import bridges from "../design/power-bridges.json";
import {ramPoint,isRamRef} from "../design/ram-placement";
const json:any[]=JSON.parse(await readFile(process.argv.find(a=>a.endsWith(".circuit.json")) ?? "output/board-ddr.circuit.json","utf8"));
const nets=new Map(json.filter(e=>e.type==="source_net").map(e=>[e.source_net_id,e.name]));
type Point={x:number;y:number};
function inside(p:Point,v:Point[]){let hit=false;for(let i=0,j=v.length-1;i<v.length;j=i++){const a=v[i],b=v[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
function contains(e:any,p:Point){const b=e.brep_shape;return inside(p,b.outer_ring.vertices)&&!b.inner_rings.some((h:any)=>inside(p,h.vertices));}
function area(v:Point[]){return Math.abs(v.reduce((n,a,i)=>{const b=v[(i+1)%v.length];return n+a.x*b.y-b.x*a.y;},0)/2);}
function pourArea(e:any){const b=e.brep_shape;return area(b.outer_ring.vertices)-b.inner_rings.reduce((n:number,h:any)=>n+area(h.vertices),0);}
const pours=json.filter(e=>e.type==="pcb_copper_pour"&&e.layer==="top"&&nets.get(e.source_net_id)==="DDR_1V5").sort((a,b)=>pourArea(b)-pourArea(a));
const ramVias=new Set(escapes.traces.filter(e=>isRamRef(e.from.split(" > ")[0].slice(1))).map(e=>e.via));
const position=(name:string)=>{const v=escapes.vias.find(v=>v.name===name);if(!v||v.net!=="DDR_1V5")throw new Error(`Invalid VCC bridge via ${name}`);return ramVias.has(name)?ramPoint(v.x,v.y):{x:v.x,y:v.y};};
const near=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-6;
const results=bridges.map(b=>{
 const from=position(b.fromVia),to=position(b.toVia);
 const source=json.find(e=>e.type==="source_trace"&&e.name===b.name);
 const trace=json.find(e=>e.type==="pcb_trace"&&e.source_trace_id===source?.source_trace_id);
 const materialized=[from,to].every(p=>json.some(e=>e.type==="pcb_via"&&near(e,p)&&["top","inner1","inner2","bottom"].every(l=>e.layers.includes(l))));
 const rendered=!!trace&&trace.route.every((p:any)=>p.route_type==="wire"&&p.layer==="bottom")&&trace.route.some((p:Point)=>near(p,from))&&trace.route.some((p:Point)=>near(p,to));
 return {name:b.name,fromPour:pours.find(p=>contains(p,from))?.pcb_copper_pour_id,toMainPour:contains(pours[0],to),rendered,materialized};
});
const unbridged=pours.slice(1).filter(p=>!results.some(r=>r.fromPour===p.pcb_copper_pour_id&&r.toMainPour&&r.rendered&&r.materialized)).map(p=>p.pcb_copper_pour_id);
const report={topVccRegions:pours.length,bridgeCount:bridges.length,bridges:results,unbridgedVccRegions:unbridged,allTopVccRegionsJoined:unbridged.length===0&&results.every(r=>r.rendered&&r.materialized),wholePowerDistributionComplete:false};
await writeFile("output/power-plane-audit.json",JSON.stringify(report,null,2));console.log(report);
if(!report.allTopVccRegionsJoined)process.exitCode=1;
