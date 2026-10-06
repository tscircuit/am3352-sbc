import {readFileSync,writeFileSync} from 'node:fs';
import {convertCircuitJsonToPcbSvg} from 'circuit-to-svg';
import {Resvg} from '@resvg/resvg-js';
const j=JSON.parse(readFileSync('output/peripheral-signal-first.audit.json','utf8'));
const input=JSON.parse(readFileSync('output/peripheral-escaped.srj.json','utf8'));
const pair=JSON.parse(readFileSync('output/peripheral-pair-diagnosis.json','utf8')).filter((p:any)=>p.solved).flatMap((p:any)=>p.traces);
for(const t of [...input.traces.filter((t:any)=>t.pcb_trace_id.startsWith('peripheral_escape')), ...pair])j.push({...t,pcb_trace_id:t.pcb_trace_id??`pair_${t.connection_name}`});
for(const layer of ['top','inner2'] as const){const svg=convertCircuitJsonToPcbSvg(j,{layer,width:2000,height:1600});writeFileSync(`output/peripheral-diagnostic-${layer}.svg`,svg);writeFileSync(`output/peripheral-diagnostic-${layer}.png`,new Resvg(svg).render().asPng())}
