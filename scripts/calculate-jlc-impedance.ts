import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
const base='/workspace/am3352-sbc/references/jlcpcb';
const models=await Bun.file(`${base}/calculator-pictures.json`).json();
const pp=Number(process.env.JLC_PREPREG_MM??.0994),ppEr=Number(process.env.JLC_PREPREG_ER??4.1),stackup=process.env.JLC_STACKUP??'JLC04161H-3313';
const far=1.265+.0152+pp;
const uuid=randomUUID(),pending=new Map<string,any>(),results:any[]=[];
const ws=new WebSocket(`wss://tools.jlc.com/jlcTools/webSocket/${uuid}`,{proxy:process.env.HTTPS_PROXY} as any);
const timeout=setTimeout(()=>{console.log('Calculator deadline reached');ws.close();process.exit(1)},45000);
ws.onerror=()=>{console.log('Calculator connection failed');clearTimeout(timeout);ws.close();process.exit(1)};
ws.onmessage=async(event)=>{
 try{
  const response=JSON.parse(String(event.data));const request=pending.get(response.accessId);if(!request)return;
  results.push({...request,response});pending.delete(response.accessId);
  console.log(JSON.stringify({kind:request.kind,width:request.width,gap:request.gap,ohms:response.impedance_calc_result?.dImpedance,status:response.impedance_calc_status}));
  await Bun.write(`${base}/${stackup==='JLC04161H-3313'?'inner-signal-impedance-sweep':'inner-signal-impedance-1080'}.json`,JSON.stringify({stackup,referencePlanes:['L1','L4'],nearDielectricMm:pp,coreMm:1.265,innerCopperMm:.0152,farDielectricEquivalentMm:far,modelLimit:'Other signal layer is not a plane. Far-side mixed dielectric represented by series-effective permittivity; no solder mask, vias, pads, or plane discontinuities. Manufacturer coupon/engineering approval required.',results},null,2));
  if(!pending.size){clearTimeout(timeout);ws.close();process.exit(0)}
 }catch{console.log('Invalid calculator response')}
};
ws.onopen=async()=>{
 const specs=[...[.09,.095,.1,.105,.11,.12,.14].map(width=>({kind:'single',width,gap:0})),...[.09,.095,.1,.11].flatMap(width=>[.1,.12,.18,.24,.3].map(gap=>({kind:'differential',width,gap})))];
 const requests=specs.map(spec=>{
  const model=models.body.list.find((m:any)=>m.impedanceType===(spec.kind==='single'?'OffsetStripline1B1A':'DiffOffsetStripline1B1A'));
  const arg={dCalculateMode:3,...Object.fromEntries(model.parameterList.map((p:any)=>[p.paramName,Number(p.defaultValue)||0])),H1:far/.0254,H2:(pp+.0152)/.0254,Er1:far/((1.265+.0152)/4.42+pp/ppEr),Er2:ppEr,W1:spec.width/.0254,W2:spec.width/.0254-.5,T1:.6,S1:spec.gap/.0254,isLinkComputingMode:false,W2LinkW1Incr:.5};
  const request={accessId:randomUUID(),impedance_calc_mark:model.impedanceType,paramMd5:createHash('md5').update(JSON.stringify(arg)).digest('hex'),impedance_calc_arg:arg,uuid};
  pending.set(request.accessId,{...spec,request});return request;
 });
 for(const request of requests){
  try{const r=await fetch('https://jlcpcb.com/api/jlcTools/impedance/calc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});if(!r.ok){console.log('Calculator HTTP',r.status);break}}catch{console.log('Calculator request failed');break}
 }
};
