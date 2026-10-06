/** Experimental candidate-only DQ permutation. Strobes, masks, bytes and all
 * address/control pins are kept fixed. Acceptance must explicitly integrate the
 * resulting RAM mapping into the netlist before native verification.
 */
export function optimizeBytePins(input:any,names:Record<string,string>,preserveFirstBit=false) {
 const ramDqMap=Array.from({length:16},(_,i)=>i);
 const orient=(p:any,q:any,r:any)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const cross=(a:any,b:any,c:any,d:any)=>orient(a,b,c)*orient(a,b,d)<-1e-8&&orient(c,d,a)*orient(c,d,b)<-1e-8;
 for(const byte of [0,1]){
  const bits=Array.from({length:8},(_,i)=>input.connections.find((c:any)=>names[c.name]===`DDR_D${byte*8+i}`));
  const fixed=input.connections.filter((c:any)=>[`DDR_DQM${byte}`,`DDR_DQS${byte}`,`DDR_DQSn${byte}`].includes(names[c.name]));
  const terminals=bits.map(c=>structuredClone(c.pointsToConnect[1]));
  let best:number[]=[],bestCost=Infinity;
  const visit=(perm:number[],cost:number)=>{
   if(cost>=bestCost)return;
   if(perm.length===8){best=[...perm];bestCost=cost;return;}
   const i=perm.length,a=bits[i].pointsToConnect[0];
   for(let j=0;j<8;j++)if(!perm.includes(j)){
    // Preserve DQ0 of each physical byte for conservative MPR/training compatibility.
    if(preserveFirstBit&&((i===0)!==(j===0)))continue;
    const b=terminals[j];let extra=Math.hypot(a.x-b.x,a.y-b.y);
    for(const f of fixed)if(cross(a,b,...f.pointsToConnect as [any,any]))extra+=1000;
    for(let k=0;k<i;k++)if(cross(a,b,bits[k].pointsToConnect[0],terminals[perm[k]]))extra+=1000;
    visit([...perm,j],cost+extra);
   }
  };
  visit([],0);
  for(let i=0;i<8;i++){
   bits[i].pointsToConnect[1]=terminals[best[i]];
   ramDqMap[byte*8+best[i]]=byte*8+i;
   const p=terminals[best[i]];
   const pad=input.obstacles.find((o:any)=>o.circuitJsonMetadata?.pcb_port_id===p.pcb_port_id);
   if(!pad)throw Error('DQ permutation lacks RAM pad');
   pad.connectedTo=[pad.circuitJsonMetadata.pcb_smtpad_id,p.pcb_port_id,bits[i].name];
  }
 }
 return ramDqMap;
}
