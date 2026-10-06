/** Preserve a complete routing topology while translating RAM. This is only a
 * seed for renewed routing/DRC, never an accepted physical transform. */
import{readFileSync,writeFileSync}from'node:fs';
import{auditDdrGeometry}from'../design/ddr-compliance';
import{compactRoutingInput}from'../design/compact-routing-input';
import{isRamRef}from'../design/ram-placement';
const stem=process.argv[2]??'output/ddr-compliance/ripup-57';
const original=compactRoutingInput(JSON.parse(readFileSync(stem+'.srj.json','utf8')));
const traces=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const report=JSON.parse(readFileSync(stem+'.json','utf8'));const meta=report.pose??report;
if(![meta.x,meta.y].every(Number.isFinite))throw Error('Missing original placement');
const cj:any[]=JSON.parse(readFileSync('output/board-ddr.circuit.json','utf8'));
const names=Object.fromEntries(cj.filter(e=>e.type==='source_trace').map(e=>[e.source_trace_id,e.name]));
const sc=new Map(cj.filter(e=>e.type==='source_component').map(e=>[e.source_component_id,e.name]));
const ramComps=new Set(cj.filter(e=>e.type==='pcb_component'&&isRamRef(sc.get(e.source_component_id)??'')).map(e=>e.pcb_component_id));
const ramPorts=new Set(cj.filter(e=>e.type==='pcb_port'&&ramComps.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
const poses=JSON.parse(process.env.DDR_SEEDS??'[{"x":-18,"y":-32},{"x":-22,"y":-32},{"x":-24,"y":-32}]');
for(const [i,pose] of poses.entries()){
 const input=structuredClone(original),routes=structuredClone(traces);
 const dx=pose.x-meta.x,dy=pose.y-meta.y;
 const move=(p:any,weight=1)=>{p.x+=dx*weight;p.y+=dy*weight;};
 for(const o of input.obstacles)if(ramComps.has(o.componentId))move(o.center);
 for(const c of input.connections)for(const p of c.pointsToConnect)if(ramPorts.has(p.pcb_port_id)||p.y<-20)move(p);
 for(const t of routes){
  const expanded:any[]=[],indices:number[]=[];
  for(let j=0;j<t.route.length;j++){
   const p=t.route[j],q=t.route[j-1];
   if(q&&p.route_type==='wire'&&q.route_type==='wire'&&p.layer===q.layer){
    const splits=[-8,-24].map(y=>({y,f:(y-q.y)/(p.y-q.y)})).filter(s=>s.f>1e-9&&s.f<1-1e-9).sort((a,b)=>a.f-b.f);
    for(const s of splits)expanded.push({...p,x:q.x+(p.x-q.x)*s.f,y:s.y});
   }
   indices[j]=expanded.length;expanded.push(p);
  }
  t.coupledSection=t.coupledSection?.map((i:number)=>indices[i]);t.curvedSegments=t.curvedSegments?.map((i:number)=>indices[i]);t.route=expanded;
  for(const p of t.route){const weight=Math.min(1,Math.max(0,(-p.y-8)/16));move(p,weight);}
 }
 if(process.env.DDR_TRACE_WIDTH_MM){const width=Number(process.env.DDR_TRACE_WIDTH_MM);if(!Number.isFinite(width)||width<.05||width>.1)throw Error('Unsupported experimental trace width');input.minTraceWidth=width;input.minTraceToPadEdgeClearance=width;input.minTraceToTraceEdgeClearance=width;for(const c of input.connections){c.nominalTraceWidth=width;c.width=width;}for(const t of routes)for(const p of t.route)if(p.route_type==='wire')p.width=width;}
 const audit=auditDdrGeometry(input,routes,names);
 const output=`output/ddr-compliance/${process.env.DDR_RUN_NAME??'stretched'}-${i}`;
 writeFileSync(output+'.srj.json',JSON.stringify(input));writeFileSync(output+'.routes.json',JSON.stringify(routes));
 const result={...pose,rotation:meta.rotation??270,requiresCopperRevalidation:true,geometricTimingPassed:audit.pass,audit};
 writeFileSync(output+'.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({pose,groups:audit.groups,pairs:audit.pairs,failures:audit.failures.filter((s:string)=>s.includes('endpoints')||s.includes('carrier'))}));
}
