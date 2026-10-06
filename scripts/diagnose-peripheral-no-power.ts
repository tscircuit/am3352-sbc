import { readFileSync, writeFileSync } from "node:fs";
import { routeAlternateSignalDogbones } from "/workspace/bus-lanes-length-limits/lib/alternate-signal-dogbones";
const input=JSON.parse(readFileSync("output/peripheral-no-power.srj.json","utf8"));
const json=JSON.parse(readFileSync("output/board.circuit.json","utf8"));
const names=new Map(json.filter((e:any)=>e.type==="source_trace").map((e:any)=>[e.source_trace_id,e.name]));
const reports=[];
for(const pair of input.differentialPairs){
  const source={...input,connections:input.connections.filter((c:any)=>pair.connectionNames.includes(c.name)),differentialPairs:[pair],buses:[]};
  const row:any={names:pair.connectionNames.map((n:string)=>names.get(n)),success:false};
  for(let attempt=0;attempt<4;attempt++){
    try {const result=routeAlternateSignalDogbones(source,{targetLayers:new Map(source.connections.map((c:any)=>[c.name,"inner2"])),viaDiameter:.3,viaHoleDiameter:.15,traceWidth:.1,clearance:.1,boardEdgeClearance:.2,holeToHoleClearance:.1,allowBlindAndBuriedVias:false},attempt);row.success=true;row.attempt=attempt;row.traces=result.traces;break;}
    catch(e){row.error=e instanceof Error?e.message:String(e);}
  }
  reports.push(row);console.log(JSON.stringify({...row,traces:undefined}));
}
writeFileSync("output/peripheral-no-power-dogbone-diagnosis.json",JSON.stringify(reports,null,2));
