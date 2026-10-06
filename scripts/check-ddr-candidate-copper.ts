/** Router clearance screen for experimental candidates, not native DRC signoff. */
import{readFileSync,writeFileSync}from'node:fs';import{resolve}from'node:path';import{pathToFileURL}from'node:url';
const helper=resolve('output/ddr-compliance/copper-screen.mjs');writeFileSync(helper,readFileSync('node_modules/@tscircuit/bus-lanes-solver/dist/index.js','utf8')+'\nexport {VectorScene,fixedCopper};\n');
const{VectorScene,fixedCopper}=await import(pathToFileURL(helper).href);
const stem=process.argv[2],input=JSON.parse(readFileSync(stem+'.srj.json','utf8')),routes=JSON.parse(readFileSync(stem+'.routes.json','utf8'));
const failed=[];
for(const t of routes){
 const c=input.connections.find((c:any)=>c.name===t.connection_name),local={...input,traces:routes.filter((r:any)=>r!==t)};
 const copper=fixedCopper(local),scenes=new Map();const bad=[];
 for(let i=1;i<t.route.length;i++){
  const a=t.route[i-1],b=t.route[i];if(a.route_type!=='wire'||b.route_type!=='wire'||a.layer!==b.layer)continue;
  const key=a.layer+':'+a.width;
  if(!scenes.has(key))scenes.set(key,new VectorScene(local,{...c,pointsToConnect:c.pointsToConnect.map((p:any)=>({...p,layer:a.layer}))},a.width,copper));
  if(!scenes.get(key).visible(a,b))bad.push(i);
 }
 if(bad.length)failed.push({name:t.connection_name,segments:bad});
}
const result={screenOnly:true,traceCount:routes.length,failingTraces:failed.length,failed};writeFileSync(stem+'.copper-screen.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
