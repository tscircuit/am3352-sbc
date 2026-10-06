const tabs = await fetch("http://localhost:9222/json").then(r=>r.json()) as any[];
const socket = new WebSocket(tabs.find(t=>t.type==="page").webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener("open",resolve,{once:true}));
let id=0;const pending=new Map<number,(x:any)=>void>();
socket.addEventListener("message",e=>{const v=JSON.parse(String(e.data));if(v.id){pending.get(v.id)?.(v);pending.delete(v.id);}});
const call=(method:string,params:any={})=>new Promise<any>(resolve=>{pending.set(++id,resolve);socket.send(JSON.stringify({id,method,params}));});
await call("Page.enable");await call("Runtime.enable");
await call("Page.navigate",{url:process.argv[2]??"http://localhost:8765/board.html"});
await new Promise(r=>setTimeout(r,15000));
const result=await call("Runtime.evaluate",{expression:"({title:document.title,text:document.body.innerText.slice(0,2200),svg:document.querySelectorAll('svg').length,canvas:document.querySelectorAll('canvas').length})",returnByValue:true});
console.log(JSON.stringify(result));
socket.close();
if(!result.result?.result?.value?.canvas)throw Error("Board viewer did not render a canvas");

export {};
