import {BusLanesSolver,type SimpleRouteJson} from "@tscircuit/bus-lanes-solver";
import {readFile,writeFile} from "node:fs/promises";
const read=async (p:string)=>JSON.parse(await readFile(p,"utf8"));
const input=await read("output/ddr-current.srj.json");
const cj:any[]=await read("output/board-ddr.circuit.json");
const source=new Map(cj.filter(t=>t.type==="source_trace").map(t=>[t.source_trace_id,t.name]));
const paths=await read("design/ddr-routes.json");const original=await read("output/ram-seeds/pairs-2.routes.json");
const traces=original.map((t:any,i:number)=>({...t,route:paths[i].route}));
const names=new Set(["DDR_A1","DDR_RASn"]);
const selected=traces.filter((t:any)=>names.has(source.get(t.connection_name)));
const fixed=traces.filter((t:any)=>!names.has(source.get(t.connection_name)));
for(let mask=0;mask<4;mask++){
 const test=structuredClone(input);test.buses=[];test.differentialPairs=[];test.allowedLayers=["inner1","inner2"];
 test.obstacles=test.obstacles.filter((o:any)=>!o.isCopperPour);
 for(const [x,y] of [[.075,-13.325],[-.775,-13.375]])test.obstacles.push({type:"rect",center:{x,y},width:.3,height:.3,layers:["top","inner1","inner2","bottom"],connectedTo:["new_DDR_1V5_via"]});
 const prefixes=new Map<string,any[]>(),suffixes=new Map<string,any[]>();const escapes:any[]=[];
 test.connections=selected.map((t:any,i:number)=>{
  const route=structuredClone(t.route);const start=route.findIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");const end=route.findLastIndex((p:any)=>p.route_type==="wire"&&p.layer!=="top");
  const layer=mask&(1<<i)?(route[start].layer==="inner1"?"inner2":"inner1"):route[start].layer;
  const pre=route.slice(0,start+1),post=route.slice(end);
  for(const p of [...pre,...post]){if(p.route_type==="wire"&&p.layer!=="top")p.layer=layer;if(p.route_type==="via"){if(p.from_layer!=="top")p.from_layer=layer;if(p.to_layer!=="top")p.to_layer=layer;}}
  prefixes.set(t.connection_name,pre);suffixes.set(t.connection_name,post);
  escapes.push({...t,pcb_trace_id:t.pcb_trace_id+"_a",route:pre},{...t,pcb_trace_id:t.pcb_trace_id+"_b",route:post});
  return {...input.connections.find((c:any)=>c.name===t.connection_name),pointsToConnect:[pre.at(-1),post[0]]};
 });
 test.traces=[...input.traces??[],...fixed,...escapes];
 const solver=new BusLanesSolver(test as SimpleRouteJson,{maxSearchIterations:20000,maxLaneIterations:5000,smoothTuning:false});solver.solve();
 console.log({mask,solved:solver.solved,error:solver.error});
 if(!solver.solved)continue;
 for(const t of solver.traces){const index=traces.findIndex((p:any)=>p.connection_name===t.connection_name);paths[index].route=[...prefixes.get(t.connection_name!)!.slice(0,-1),...t.route,...suffixes.get(t.connection_name!)!.slice(1)];}
 await writeFile("design/ddr-routes.json",JSON.stringify(paths,null,2)+"\n");
 await writeFile("output/power-reserved-ddr.routes.json",JSON.stringify(solver.traces,null,2));
 const p=await read("design/ddr-route-provenance.json");p.postRouteEdits.push({nets:[...names],router:"bus_lanes 0.0.11",reason:"Reroute around two supply vias that connect RAM VCC islands",mask});p.physicalIntegrationVerified=false;
 await writeFile("design/ddr-route-provenance.json",JSON.stringify(p,null,2)+"\n");
 break;
}
