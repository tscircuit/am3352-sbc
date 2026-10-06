/** Length-match a complete candidate without ever changing the active board. */
import {BusLanesSolver as InstalledSolver} from '@tscircuit/bus-lanes-solver';
import{resolve}from'node:path';import{pathToFileURL}from'node:url';
let BusLanesSolver=InstalledSolver;
import {readFileSync,writeFileSync} from 'node:fs';
import {auditDdrGeometry,assertDdrConstraints} from '../design/ddr-compliance';
const stem=process.argv[2]??'output/ddr-compliance/ripup-57';
const solverVersion=JSON.parse(readFileSync('node_modules/@tscircuit/bus-lanes-solver/package.json','utf8')).version;
const full=JSON.parse(readFileSync(stem+'.srj.json','utf8'));
const physical=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
assertDdrConstraints(full,names);
const input=structuredClone(full);
const groupName=process.env.DDR_MATCH_GROUP;
const members=groupName?full.buses.find((b:any)=>b.name===groupName)?.connectionNames:undefined;
if(groupName&&!members)throw Error('Unknown timing group');
const untouched=members?physical.filter((t:any)=>!members.includes(t.connection_name)):[];
if(members){input.connections=input.connections.filter((c:any)=>members.includes(c.name));input.buses=input.buses.filter((b:any)=>b.name===groupName);input.differentialPairs=input.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>members.includes(n)));}
input.traces=[...untouched];
const escapes=new Map<string,{a:any[],b:any[]}>();
const lanes=physical.filter((t:any)=>!members||members.includes(t.connection_name)).map((t:any)=>{
 const a=t.route.findIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top'),b=t.route.findLastIndex((p:any)=>p.route_type==='wire'&&p.layer!=='top');
 escapes.set(t.connection_name,{a:t.route.slice(0,a+1),b:t.route.slice(b)});
 input.traces.push({...t,pcb_trace_id:t.pcb_trace_id+'_before',route:t.route.slice(0,a+1)},{...t,pcb_trace_id:t.pcb_trace_id+'_after',route:t.route.slice(b)});
 const route=t.route.slice(a,b+1);
 input.connections.find((c:any)=>c.name===t.connection_name).pointsToConnect=[route[0],route.at(-1)];
 return {...t,route,coupledSection:t.coupledSection?.map((i:number)=>i-a),curvedSegments:t.curvedSegments?.map((i:number)=>i-a)};
});
if(process.env.DDR_ABSOLUTE_TARGETS==='1'){
 const source=readFileSync('node_modules/@tscircuit/bus-lanes-solver/dist/index.js','utf8');
 const marker='  const constraints = lengthConstraints(input);';
 if(source.split(marker).length!==2)throw Error('Unsupported solver source');
 const extension=`  for (const [name, floor] of Object.entries(input.minimumRouteLengthsMm ?? {})) {
   if (targets.has(name) && input.buses?.some(bus => bus.connectionNames.includes(name))) targets.set(name, Math.max(targets.get(name), floor));
  }
`;
 const path=resolve('output/ddr-compliance/matching-absolute-router.mjs');writeFileSync(path,source.replace(marker,extension+marker));
 BusLanesSolver=(await import(pathToFileURL(path).href)).BusLanesSolver;
 const limits=auditDdrGeometry(full,[],names).groups;
 input.minimumRouteLengthsMm=Object.fromEntries(input.buses.flatMap((b:any)=>{const group=limits.find(g=>g.name===b.name);if(!group)return [];const floor=group.name==='DDR_ADDR_CTRL_CK'?Math.min(group.nominalMm!,group.maximumMm!-.127):group.maximumMm!-.3;return b.connectionNames.map((name:string)=>[name,floor]);}));
}
const solver=BusLanesSolver.forRefinement(input,lanes,{maxSearchIterations:100000,maxLaneIterations:10000,smoothTuning:process.env.DDR_SMOOTH!=='0'});
const start=Date.now(),deadline=start+Number(process.env.DDR_MATCH_MS??120000);let nextLog=start+15000;
while(!solver.solved&&!solver.failed&&Date.now()<deadline){solver.step();if(Date.now()>nextLog){console.log(JSON.stringify({phase:solver.phase,elapsedMs:Date.now()-start}));nextLog=Date.now()+15000;}}
let audit:any=null;
if(solver.solved){
 const routes=solver.traces.map(t=>{const {a,b}=escapes.get(t.connection_name!)!;return {...t,route:[...a.slice(0,-1),...t.route,...b.slice(1)],coupledSection:t.coupledSection?[t.coupledSection[0]+a.length-1,t.coupledSection[1]+a.length-1] as [number,number]:undefined,curvedSegments:t.curvedSegments?.map(i=>i+a.length-1)};});
 routes.push(...untouched);
 audit=auditDdrGeometry(full,routes,names);
 writeFileSync(stem+(groupName?'.'+groupName:'')+'.matched.routes.json',JSON.stringify(routes));writeFileSync(stem+(groupName?'.'+groupName:'')+'.matched.srj.json',JSON.stringify(full));
}
const result={solverVersion,experimentalAbsoluteTargets:process.env.DDR_ABSOLUTE_TARGETS==='1',solved:solver.solved,failed:solver.failed,timedOut:!solver.solved&&!solver.failed,error:solver.error,phase:solver.phase,elapsedMs:Date.now()-start,geometricTimingPassed:audit?.pass??false,audit};
writeFileSync(stem+(groupName?'.'+groupName:'')+(process.env.DDR_SMOOTH==='0'?'.angled-matching.json':'.matching.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
if(!audit?.pass)process.exitCode=2;
