/** Experimental within-byte DQ swaps with physical rerouting of both nets.
 * Leaves DQ0/DQ8, masks, strobes and CA unchanged. Never installs a candidate.
 */
import {BusLanesSolver} from '@tscircuit/bus-lanes-solver';
import {readFileSync,writeFileSync} from 'node:fs';
import {auditDdrGeometry} from '../design/ddr-compliance';
import {ddrTimingGroups} from '../design/ddr-rules';
const stem='output/ddr-compliance/ripup-57';
let full=JSON.parse(readFileSync(stem+'.srj.json','utf8'));
let physical:any[]=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
for(const c of full.connections)for(const p of c.pointsToConnect){
 const pad=full.obstacles.find((o:any)=>o.circuitJsonMetadata?.pcb_port_id&&Math.hypot(o.center.x-p.x,o.center.y-p.y)<1e-5);
 if(!pad)throw Error('Missing signal pad');p.pcb_port_id=pad.circuitJsonMetadata.pcb_port_id;
}
const normalize=(input:any)=>{const byPort=new Map(input.connections.flatMap((c:any)=>c.pointsToConnect.map((p:any)=>[p.pcb_port_id,c.name])));for(const o of input.obstacles){const m=o.circuitJsonMetadata;if(m&&byPort.has(m.pcb_port_id))o.connectedTo=[m.pcb_port_id,m.pcb_smtpad_id,byPort.get(m.pcb_port_id)];}};
normalize(full);
const objective=(input:any,routes:any[])=>{const a=auditDdrGeometry(input,routes,names);return a.measurements.reduce((sum,m)=>{const g=a.groups.find(g=>g.name===ddrTimingGroups.find(d=>d.signals.includes(m.name))?.name);return sum+m.lengthMm+100*Math.max(0,m.lengthMm-(g?.maximumMm??Infinity));},0);};
const mapping=Array.from({length:16},(_,i)=>i),events:any[]=[];
for(const [aBit,bBit] of [[1,3],[2,3],[3,4],[3,5],[3,6],[3,7],[9,10],[10,11],[10,12],[10,13],[10,14],[10,15]]){
 const input=structuredClone(full),a=input.connections.find((c:any)=>names[c.name]===`DDR_D${aBit}`),b=input.connections.find((c:any)=>names[c.name]===`DDR_D${bBit}`);
 [a.pointsToConnect[1],b.pointsToConnect[1]]=[b.pointsToConnect[1],a.pointsToConnect[1]];normalize(input);
 const selected=[a.name,b.name],retained=physical.filter(t=>!selected.includes(t.connection_name));
 const getEscapes=(t:any)=>{const a=t.route.findIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top'),b=t.route.findLastIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top');return {before:t.route.slice(0,a+1),after:t.route.slice(b)};};
 const ea=getEscapes(physical.find(t=>t.connection_name===a.name)),eb=getEscapes(physical.find(t=>t.connection_name===b.name));
 const swapped=[{c:a,before:ea.before,after:eb.after},{c:b,before:eb.before,after:ea.after}];
 let best:any=null,bestScore=objective(full,physical);
 for(let mask=0;mask<4;mask++){
  const local=structuredClone({...input,buses:[],differentialPairs:[],connections:[],traces:retained});
  const escapes:any[]=[];
  for(const [i,s] of swapped.entries()){
   const layer=mask&(1<<i)?'inner2':'inner1';
   const adapt=(r:any[])=>r.map(p=>p.route_type==='via'?{...p,from_layer:p.from_layer==='top'?'top':layer,to_layer:p.to_layer==='top'?'top':layer}:p.layer==='top'?p:{...p,layer});
   const before=adapt(s.before),after=adapt(s.after);escapes.push({name:s.c.name,before,after});
   local.traces.push({type:'pcb_trace',connection_name:s.c.name,source_trace_id:s.c.name,pcb_trace_id:s.c.name+'_before',route:before},{type:'pcb_trace',connection_name:s.c.name,source_trace_id:s.c.name,pcb_trace_id:s.c.name+'_after',route:after});
   local.connections.push({...s.c,pointsToConnect:[before.at(-1),after[0]]});
  }
  const solver=new BusLanesSolver(local,{maxSearchIterations:30000,maxLaneIterations:10000,smoothTuning:false});
  const deadline=Date.now()+2500;while(!solver.solved&&!solver.failed&&Date.now()<deadline)solver.step();
  if(!solver.solved){console.log(JSON.stringify({bits:[aBit,bBit],mask,solved:false,error:solver.error}));continue;}
  const routes=[...retained,...solver.traces.map(t=>{const e=escapes.find(e=>e.name===t.connection_name);return {...t,route:[...e.before.slice(0,-1),...t.route,...e.after.slice(1)]};})];
  const score=objective(input,routes);if(score<bestScore-.01){best={routes,score,mask};bestScore=score;}
 }
 if(best){[mapping[aBit],mapping[bBit]]=[mapping[bBit],mapping[aBit]];full=input;physical=best.routes;events.push({bits:[aBit,bBit],mask:best.mask,score:best.score});console.log(JSON.stringify({improvement:events.at(-1),groups:auditDdrGeometry(full,physical,names).groups}));}
}
const audit=auditDdrGeometry(full,physical,names);
writeFileSync(stem+'.swapped.routes.json',JSON.stringify(physical));writeFileSync(stem+'.swapped.srj.json',JSON.stringify(full));writeFileSync(stem+'.swapped.json',JSON.stringify({events,cpuToRamBit:mapping,experimentalPinPermutation:true,accepted:false,audit},null,2));
console.log(JSON.stringify({events,groups:audit.groups}));
