import {readFileSync,writeFileSync} from 'node:fs';
import {BusLanesPipelineSolver} from '@tscircuit/bus-lanes-solver';
import {compactRoutingInput} from '../design/compact-routing-input';
const input=compactRoutingInput(JSON.parse(readFileSync('output/peripheral-escaped.srj.json','utf8')));
const results=[];
for(const [index,pair] of input.differentialPairs!.entries()){
 const part={...input,connections:input.connections.filter((c:any)=>pair.connectionNames.includes(c.name)),differentialPairs:[pair]};
 const solver=new BusLanesPipelineSolver(part,{fanout:'none',maxLaneIterations:100000,maxSearchIterations:200000});
 const start=performance.now();
 while(!solver.solved&&!solver.failed&&performance.now()-start<30000)solver.step();
 solver.tryFinalAcceptance();
 const result={index,names:pair.connectionNames,solved:solver.solved,error:solver.error,phase:solver.phase,seconds:(performance.now()-start)/1000,traces:solver.traces};
 console.log(JSON.stringify({...result,traces:result.traces.length}));results.push(result);
 writeFileSync('output/peripheral-pair-diagnosis.json',JSON.stringify(results));
}
