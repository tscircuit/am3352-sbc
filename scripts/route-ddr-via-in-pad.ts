/** DDR-first experiment with filled/capped through-vias in the signal pads.
 * No active board data is changed. Fabrication and supply integration are required.
 */
import {BusLanesSolver} from '@tscircuit/bus-lanes-solver';
import {readFileSync,writeFileSync} from 'node:fs';
import {auditDdrGeometry,assertDdrConstraints} from '../design/ddr-compliance';
import {optimizeBytePins} from './optimize-ddr-byte-pins';
import placement from '../design/ram-placement.json';
const original=JSON.parse(readFileSync('output/ddr-current.srj.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const sc=new Map(cj.filter(e=>e.type==='source_component').map(e=>[e.source_component_id,e.name]));
const chips=new Set(cj.filter(e=>e.type==='pcb_component'&&['U1','U3'].includes(sc.get(e.source_component_id))).map(e=>e.pcb_component_id));
const ram=cj.find(e=>e.type==='pcb_component'&&sc.get(e.source_component_id)==='U3').pcb_component_id;
const ports=new Set(cj.filter(e=>e.type==='pcb_port'&&e.pcb_component_id===ram).map(e=>e.pcb_port_id));
const seeds=JSON.parse(process.env.DDR_SEEDS??'[{"x":0,"y":-16,"rotation":270},{"x":18,"y":-18,"rotation":90},{"x":-18,"y":-18,"rotation":270}]');
const groupLayers=JSON.parse(process.env.DDR_GROUP_LAYERS??'["inner1","inner2","inner1"]');
for(let seedIndex=0;seedIndex<seeds.length;seedIndex++){
 const pose=seeds[seedIndex],full=structuredClone(original);
 full.traces=[];full.allowedLayers=['inner1','inner2'];full.buses=full.buses.filter((b:any)=>b.connectionNames.length>1);
 full.obstacles=full.obstacles.filter((o:any)=>!o.isCopperPour&&!o.circuitJsonMetadata?.pcb_via_id&&(!o.componentId||chips.has(o.componentId)));
 const angle=(pose.rotation-placement.rotation)*Math.PI/180;
 const move=(p:any)=>{const x=p.x-placement.x,y=p.y-placement.y;p.x=pose.x+x*Math.cos(angle)-y*Math.sin(angle);p.y=pose.y+x*Math.sin(angle)+y*Math.cos(angle);};
 for(const o of full.obstacles)if(o.componentId===ram){move(o.center);if((pose.rotation-placement.rotation)%180)[o.width,o.height]=[o.height,o.width];}
 for(const c of full.connections)for(const p of c.pointsToConnect)if(ports.has(p.pcb_port_id))move(p);
 const ramDqMap=process.env.DDR_SWIZZLE==='1'?optimizeBytePins(full,names,true):undefined;
 assertDdrConstraints(full,names);
 const input=structuredClone(full),layers=new Map<string,string>();
 full.buses.forEach((b:any,i:number)=>b.connectionNames.forEach((n:string,j:number)=>layers.set(n,i===2&&process.env.DDR_CA_SPLIT==='1'?(j%2?'inner1':'inner2'):groupLayers[i])));
 const escapes=new Map<string,any[]>();
 for(const c of input.connections){
  const layer=layers.get(c.name)??'inner2';
  const owned=c.pointsToConnect.map((p:any,i:number)=>({type:'pcb_trace',pcb_trace_id:`escape_${c.name}_${i}`,connection_name:c.name,source_trace_id:c.name,route:[{route_type:'wire',x:p.x,y:p.y,layer:'top',width:.1},{route_type:'via',x:p.x,y:p.y,from_layer:'top',to_layer:layer,layers:['top','inner1','inner2','bottom'],via_diameter:.3,via_hole_diameter:.15},{route_type:'wire',x:p.x,y:p.y,layer,width:.1}]}));
  input.traces.push(...owned);escapes.set(c.name,owned);
  c.pointsToConnect=c.pointsToConnect.map((p:any)=>({...p,layer,layers:undefined}));
 }
 const solver=new BusLanesSolver(input,{maxSearchIterations:150000,maxLaneIterations:150000,smoothTuning:process.env.DDR_SMOOTH!=='0'});
 const start=Date.now(),deadline=start+Number(process.env.DDR_SEED_MS??60000);let nextLog=start+15000;
 while(!solver.solved&&!solver.failed&&Date.now()<deadline){solver.step();if(Date.now()>nextLog){console.log(JSON.stringify({seedIndex,...pose,phase:solver.phase,partial:solver.traces.length,elapsedMs:Date.now()-start}));nextLog=Date.now()+15000;}}
 const routes=solver.traces.map((t:any)=>{const ends=escapes.get(t.connection_name)!;const a=ends.find((e:any)=>Math.hypot(e.route[0].x-t.route[0].x,e.route[0].y-t.route[0].y)<1e-5);const b=ends.find(e=>e!==a);return {...t,route:[...a.route.slice(0,-1),...t.route,...b.route.toReversed().slice(1).map((p:any)=>p.route_type==='via'?{...p,from_layer:p.to_layer,to_layer:p.from_layer}:p)],coupledSection:t.coupledSection?.map((i:number)=>i+2),curvedSegments:t.curvedSegments?.map((i:number)=>i+2)};});
 const audit=solver.solved?auditDdrGeometry(full,routes,names):null;
 const result={...pose,ramDqMap,requiresFilledCappedViaInPad:true,requiresPeripheralReplacement:true,solved:solver.solved,failed:solver.failed,error:solver.error,phase:solver.phase,routeCount:routes.length,elapsedMs:Date.now()-start,geometricTimingPassed:audit?.pass??false,audit};
 const stem=`output/ddr-compliance/${process.env.DDR_RUN_NAME??'via-in-pad'}-${seedIndex}`;
 writeFileSync(stem+'.json',JSON.stringify(result,null,2));writeFileSync(stem+'.srj.json',JSON.stringify(full));
 if(solver.solved)writeFileSync(stem+'.routes.json',JSON.stringify(routes));
 console.log(JSON.stringify({...result,audit:audit?{groups:audit.groups,failures:audit.failures}:null}));
 if(audit?.pass)break;
}
