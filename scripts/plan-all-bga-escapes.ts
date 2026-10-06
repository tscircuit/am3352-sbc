/** Joint local fanout reservation: DDR gets its bus routing first, while
 * processor LCD/control/power terminals retain physical access to the stackup. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
// Expose the local fanout helper already bundled in the pinned published
// solver. Its implementation is unchanged; no historical experimental source
// or bundle participates in this reservation pass.
const packagePath='node_modules/@tscircuit/bus-lanes-solver';
const version=JSON.parse(readFileSync(`${packagePath}/package.json`,'utf8')).version;
if(version!=='0.0.19')throw Error('Review fanout adapter for changed solver package');
const source=readFileSync(`${packagePath}/dist/index.js`,'utf8');
if(!source.includes('function routeLocalSignalDogbones('))throw Error('Published fanout helper missing');
mkdirSync('output/runtime',{recursive:true});
const helper=resolve('output/runtime/published-019-fanout.mjs');
writeFileSync(helper,source+'\nexport {routeLocalSignalDogbones};\n');
const {routeLocalSignalDogbones}=await import(pathToFileURL(helper).href);
const provenance={solverVersion:version,publishedBundleSha256:createHash('sha256').update(source).digest('hex'),adapter:'Export existing local fanout function; no implementation changes'};
const input=JSON.parse(readFileSync('output/ddr-current.srj.json','utf8'));
const cj:any[]=JSON.parse(readFileSync('output/ddr-current.circuit.json','utf8'));
const sourceTraces=cj.filter(e=>e.type==='source_trace');
const used=new Set(sourceTraces.flatMap(e=>e.connected_source_port_ids));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_component').map(e=>[e.source_component_id,e.name]));
const chips=cj.filter(e=>e.type==='pcb_component'&&['U1','U3'].includes(names[e.source_component_id]));
const chipIds=new Set(chips.map(e=>e.pcb_component_id));
const netNames=Object.fromEntries(cj.filter(e=>e.type==='source_net').map(e=>[e.source_net_id,e.name]));
const signalOnly=process.env.JOINT_SIGNALS_ONLY==='1';
const ports=cj.filter(e=>e.type==='pcb_port'&&chipIds.has(e.pcb_component_id)&&used.has(e.source_port_id)&&(!signalOnly||!sourceTraces.some(t=>t.connected_source_port_ids.includes(e.source_port_id)&&t.connected_source_net_ids.some((id:string)=>/^(GND|VDD|V[13]|DDR_1V5|RTC_1V8|A3V3|VIN|SYS)/.test(netNames[id])))));
const sourcePorts=Object.fromEntries(cj.filter(e=>e.type==='source_port').map(e=>[e.source_port_id,e]));
const targetLayers=new Map<string,string>();
const connections=ports.map(p=>{
 const trace=sourceTraces.find(t=>t.connected_source_port_ids.includes(p.source_port_id));
 const layer=/^DDR_(D[0-7]|DQM0|DQS0|DQSn0|A|BA|CK|CS|CAS|RAS|WE|ODT)/.test(trace?.name??'')?'inner1':'inner2';
 targetLayers.set(p.pcb_port_id,layer);
 const other=cj.find(e=>e.type==='pcb_port'&&e.source_port_id!==p.source_port_id&&trace?.connected_source_port_ids.includes(e.source_port_id));
 const center=chips.find(c=>c.pcb_component_id===p.pcb_component_id).center;
 const destination=other??{x:p.x+50*(Math.sign(p.x-center.x)||1),y:p.y+50*Math.sign(p.y-center.y)};
 return {name:p.pcb_port_id,pointsToConnect:[{x:p.x,y:p.y,layer:'top',pcb_port_id:p.pcb_port_id,pointId:p.pcb_port_id},{x:destination.x,y:destination.y,layer}]};
});
input.connections=connections;input.obstacles=input.obstacles.filter((o:any)=>chipIds.has(o.componentId));input.traces=[];input.buses=[];input.differentialPairs=[];
const start=performance.now();
try{
 const result=routeLocalSignalDogbones(input,{targetLayers,viaDiameter:.3,viaHoleDiameter:.15,traceWidth:.1,clearance:.1,allowBlindAndBuriedVias:false});
 const report={provenance,signalOnly,terminals:ports.length,escaped:result.traces.length,seconds:(performance.now()-start)/1000,complete:result.traces.length===ports.length,requiresNativeAudit:true,ports:ports.map(p=>({id:p.pcb_port_id,ref:names[sourcePorts[p.source_port_id].source_component_id],pin:sourcePorts[p.source_port_id].name})),...result};
 writeFileSync('output/joint-bga-escapes.json',JSON.stringify(report));console.log(JSON.stringify({...report,ports:undefined,connections:undefined,traces:undefined}));
}catch(e){const report={terminals:ports.length,escaped:0,complete:false,error:e instanceof Error?e.message:String(e),seconds:(performance.now()-start)/1000};writeFileSync('output/joint-bga-escapes.json',JSON.stringify(report));console.log(JSON.stringify(report));process.exitCode=1}
