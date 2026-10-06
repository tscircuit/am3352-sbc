import {BusLanesPipelineSolver, type SimpleRouteJson} from "@tscircuit/bus-lanes-solver";
import {readFile,writeFile} from "node:fs/promises";
const original:any=JSON.parse(await readFile("output/ddr.srj.json","utf8"));
const cj:any[]=JSON.parse(await readFile("output/board-ddr.circuit.json","utf8"));
const sourceNames=new Map(cj.filter(e=>e.type==="source_component").map(e=>[e.source_component_id,e.name]));
const ramNames=new Set(["U3","R_ZQ","R_VREF_H","R_VREF_L","C_VREF","R_DDR_RST"]);
const ramComponents=new Set(cj.filter(e=>e.type==="pcb_component" && (ramNames.has(sourceNames.get(e.source_component_id))||String(sourceNames.get(e.source_component_id)).startsWith("C_DDR"))).map(e=>e.pcb_component_id));
const ramPorts=new Set(cj.filter(e=>e.type==="pcb_port"&&ramComponents.has(e.pcb_component_id)).map(e=>e.pcb_port_id));
// Placement search is DDR first. Supply escapes and bottom decouplers must be
// regenerated around the accepted DDR copper, then checked on the full board.
const fullPower=process.env.RAM_FULL_POWER === "1";
const prefix=process.env.RAM_PREFIX ?? (fullPower?"full-power-seed":"seed");
const base={...original,traces:fullPower?original.traces:[],obstacles:original.obstacles.filter((o:any)=>!o.isCopperPour && (fullPower || (!o.circuitJsonMetadata?.pcb_via_id && !(o.circuitJsonMetadata?.pcb_smtpad_id && o.layers.length===1&&o.layers[0]==="bottom"))))};
const seeds:{x:number;y:number;rotation:number}[]=[];
for(const rotation of [0,90,180,270])for(const y of [-18,-22,-26,-30])for(const x of [0,-4,4,-8,8,-12])seeds.push({x,y,rotation});
if(process.env.RAM_CUSTOM_SEEDS) seeds.splice(0,seeds.length,...JSON.parse(process.env.RAM_CUSTOM_SEEDS));
if(fullPower) seeds.splice(0,seeds.length,{x:0,y:-27,rotation:0});
else await writeFile("output/ram-seeds/seeds.json",JSON.stringify(seeds,null,2));
const worker=Number(process.argv[2]??0),stride=Number(process.argv[3]??1);
const maxSearch=Number(process.env.RAM_SEARCH_ITERATIONS??3000);
const maxMs=Number(process.env.RAM_SEED_MS??9000);
const only=process.env.RAM_SEED_INDEX===undefined?undefined:Number(process.env.RAM_SEED_INDEX);
for(let i=worker;i<seeds.length;i+=stride){
 if(only!==undefined&&i!==only)continue;
 const seed=seeds[i];const input=structuredClone(base);const angle=seed.rotation*Math.PI/180;
 const move=(p:any)=>{const x=p.x,y=p.y+27;p.x=seed.x+x*Math.cos(angle)-y*Math.sin(angle);p.y=seed.y+x*Math.sin(angle)+y*Math.cos(angle)};
 for(const o of input.obstacles)if(ramComponents.has(o.componentId)){move(o.center);if(seed.rotation%180){[o.width,o.height]=[o.height,o.width]}if(o.points)for(const p of o.points)move(p);}
 for(const c of input.connections)for(const p of c.pointsToConnect)if(ramPorts.has(p.pcb_port_id))move(p);
 if(process.env.RAM_FLEX_CONTROLS === "1") {
 input.allowedLayers=["inner1","inner2"];
 input.buses=input.buses.filter((b:any)=>b.connectionNames.length>1);
 }
 if(process.env.RAM_PAIRS_ONLY==="1") {input.allowedLayers=["inner1","inner2"];input.buses=[];}
 if(process.env.RAM_GEOMETRY_ONLY==="1") {input.allowedLayers=["inner1","inner2"];input.buses=[];input.differentialPairs=[];}
 if(process.env.RAM_REVERSE==="1") for(const c of input.connections)c.pointsToConnect.reverse();
 const options={maxSearchIterations:maxSearch,maxLaneIterations:Number(process.env.RAM_LANE_ITERATIONS??maxSearch),smoothTuning:process.env.RAM_SMOOTH!=="0"};
 if(process.env.RAM_STAGED==="2") for(const b of input.buses??[]) if(b.connectionNames.length>1)b.allowedLayers=[b.name==="DDR_BYTE0"?"inner1":"inner2"];
 const dataNames=new Set(input.buses?.filter((b:any)=>b.connectionNames.length>1).flatMap((b:any)=>b.connectionNames));
 const clockNames=new Set(input.differentialPairs?.flatMap((p:any)=>p.connectionNames).filter((n:any)=>!dataNames.has(n)));
 const stages=process.env.RAM_STAGED?[...(process.env.RAM_STAGED==="2"?input.buses.filter((b:any)=>b.connectionNames.length>1).map((b:any)=>new Set(b.connectionNames)):[dataNames]),clockNames,new Set(input.connections.map((c:any)=>c.name).filter((n:any)=>!dataNames.has(n)&&!clockNames.has(n)))]:[new Set(input.connections.map((c:any)=>c.name))];
 let stage=0;const completed:any[]=[];
 function stageInput(){const names=stages[stage];return {...input,connections:input.connections.filter((c:any)=>names.has(c.name)),buses:input.buses?.filter((b:any)=>b.connectionNames.every((n:any)=>names.has(n))),differentialPairs:input.differentialPairs?.filter((p:any)=>p.connectionNames.every((n:any)=>names.has(n))),traces:[...input.traces??[],...completed]};}
 let solver=new BusLanesPipelineSolver(stageInput() as SimpleRouteJson,options);
 const start=Date.now();let lastPhase="";let maxPartial=0;let nextLog=start+15000;
 try{while(!solver.solved&&!solver.failed&&Date.now()-start<maxMs){solver.step();if(solver.solved && stage<stages.length-1){completed.push(...solver.traces);stage++;solver=new BusLanesPipelineSolver(stageInput() as SimpleRouteJson,options);}if(Date.now()>nextLog){console.log(JSON.stringify({index:i,elapsed:Date.now()-start,phase:solver.phase,stage,stats:{...(solver.stats as any),busLengths:undefined,pairLengths:undefined,traceLengthsMm:undefined}}));nextLog=Date.now()+15000;}lastPhase=solver.phase;maxPartial=Math.max(maxPartial,completed.length+((solver as any).child?.traces?.length??0),(solver as any).completedLanes?.length??0);}}
 catch(e){solver.failed=true;solver.error=String(e);}
 const result={solverVersion:"0.0.11",index:i,...seed,solved:solver.solved,failed:solver.failed,phase:lastPhase,iterations:solver.iterations,elapsedMs:Date.now()-start,partial:maxPartial,error:solver.error??null,traces:completed.length+solver.traces.length,stage};
 await writeFile(`output/ram-seeds/${prefix}-${i}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
 await writeFile(`output/ram-seeds/${prefix}-${i}.debug.json`,JSON.stringify({stats:solver.stats,childStats:(solver as any).child?.stats,childPhase:(solver as any).child?.phase,failureCode:solver.failureCode,childFailureCode:(solver as any).child?.failureCode}));
 if(solver.solved){solver.traces=[...completed,...solver.traces];await writeFile(`output/ram-seeds/${prefix}-${i}.srj.json`,JSON.stringify(input));await writeFile(`output/ram-seeds/${prefix}-${i}.routes.json`,JSON.stringify(solver.traces,null,2));break;}
}
