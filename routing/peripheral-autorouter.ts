import { BusLanesPipelineSolver } from "@tscircuit/bus-lanes-solver"
import {PeripheralBusLanesSolver, PeripheralDogboneAutorouter, NativePackageBusLanesSolver} from "./peripheral-runtime"
import { DogboneAutorouter } from "./dogbone/dogbone-autorouter"

/** Compute native escapes, then negotiate the order of coupled peripheral pairs.
 * Every attempt starts from this invocation's immutable DDR/support copper.
 * No coordinates or previously saved routes are supplied by this controller. */
export async function createPeripheralAutorouter(input: any) {
  const listeners = new Map<string, Array<(event: any) => void>>()
  let stopped = false, steps = 0
  let completed:any[]|undefined
  const emit = (type: string, event: any) => {
    for (const listener of listeners.get(type) ?? []) listener({ type, ...event })
  }
  const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0))
  const localSmtInput = (srj:any) => {
    const names=new Set(srj.connections.map((c:any)=>c.name))
    const ports=new Set(input.connections.filter((c:any)=>names.has(c.name)).flatMap((c:any)=>c.pointsToConnect.map((p:any)=>p.pcb_port_id)))
    const components=new Set(input.obstacles.filter((o:any)=>ports.has(o.circuitJsonMetadata?.pcb_port_id)).map((o:any)=>o.componentId))
    const field=input.obstacles.filter((o:any)=>o.componentId&&components.has(o.componentId))
    if(!field.length)return srj
    const bounds={
      minX:Math.max(input.bounds.minX,Math.min(...field.map((o:any)=>o.center.x-Math.max(o.width,o.height)/2))-5),
      maxX:Math.min(input.bounds.maxX,Math.max(...field.map((o:any)=>o.center.x+Math.max(o.width,o.height)/2))+5),
      minY:Math.max(input.bounds.minY,Math.min(...field.map((o:any)=>o.center.y-Math.max(o.width,o.height)/2))-5),
      maxY:Math.min(input.bounds.maxY,Math.max(...field.map((o:any)=>o.center.y+Math.max(o.width,o.height)/2))+5),
    }
    // Conservative whole-object bounds retain every pad, segment and via whose
    // copper could touch this search region. The actual board stays unchanged.
    const touches=(ps:any[])=>Math.min(...ps.map(p=>p.x-(p.via_diameter??p.width??0)/2))<=bounds.maxX&&Math.max(...ps.map(p=>p.x+(p.via_diameter??p.width??0)/2))>=bounds.minX&&Math.min(...ps.map(p=>p.y-(p.via_diameter??p.width??0)/2))<=bounds.maxY&&Math.max(...ps.map(p=>p.y+(p.via_diameter??p.width??0)/2))>=bounds.minY
    return {...srj,bounds,traces:srj.traces.filter((t:any)=>touches(t.route)),obstacles:srj.obstacles.filter((o:any)=>touches([{...o.center,width:Math.max(o.width,o.height)}]))}
  }
  const run = async (srj: any, label: string, budget: number, nativePackage=false) => {
    const Solver = label === "CPU_USB_PAIRS" ? BusLanesPipelineSolver : nativePackage ? NativePackageBusLanesSolver : PeripheralBusLanesSolver
    const solver = new Solver(label.startsWith("SMT_") ? localSmtInput(srj) : srj, { maxSearchIterations: 2_000_000 })
    while (!stopped && !solver.solved && !solver.failed && solver.iterations < budget) {
      for (let i = 0; i < 200 && !solver.solved && !solver.failed; i++) solver.step()
      steps += 200
      emit("progress", { steps, progress: solver.progress, phase: label+":"+solver.phase })
      await pause()
    }
    if (stopped) throw new Error("Peripheral routing stopped")
    return solver.solved ? solver.traces : null
  }
  const route = async () => {
    const groups = new Map<string, any[]>()
    for (const o of input.obstacles) if (o.shape === "circle" && o.componentId) {
      const group = groups.get(o.componentId) ?? []; group.push(o); groups.set(o.componentId, group)
    }
    const cpu = [...groups.values()].sort((a, b) => b.length-a.length)[0]
    const ports = new Set(cpu?.map(o => o.circuitJsonMetadata?.pcb_port_id))
    const selected = input.connections.filter((c: any) => c.pointsToConnect.some((p: any) => ports.has(p.pcb_port_id)))
    if (selected.length !== 4) throw new Error("Expected four CPU USB links")
    const names = new Set(selected.map((c: any) => c.name))
    const pairs = input.differentialPairs.filter((p: any) => p.connectionNames.every((n: string) => names.has(n)))
    let working = { ...input, connections: selected, differentialPairs: [] }
    for (let pass = 0; pass < 2; pass++) {
      const requests = pass ? working.connections.map((c: any) => ({...c, pointsToConnect:[...c.pointsToConnect].reverse()})) : working.connections
      const fanout = new DogboneAutorouter({input:{...working,connections:requests},fanoutRoutingLayers:["bottom"]})
      const traces = fanout.solveSync(), output = fanout.getOutputSimpleRouteJson()
      working = {...working,traces:[...working.traces,...traces],connections:working.connections.map((c: any) => {
        const solved = output.connections.find((p: any) => p.name === c.name)
        return solved ? {...solved,pointsToConnect:pass?[...solved.pointsToConnect].reverse():solved.pointsToConnect}:c
      })}
      emit("progress", {steps,progress:0,phase:`CPU_NATIVE_FANOUT_${pass+1}`}); await pause()
    }
    const bodies = await run({...working,buses:[],allowedLayers:["bottom"],differentialPairs:pairs},"CPU_USB_PAIRS",2_000_000)
    if (!bodies) throw new Error("CPU USB paired routing exhausted its budget")
    let base = [...working.traces,...bodies]
    // Fan out pairs between two rectangular-pad components with native sites.
    const componentFor = (p: any) => input.obstacles.find((o:any) =>
      o.circuitJsonMetadata?.pcb_port_id === p.pcb_port_id)?.componentId
    const rectangularPairs = input.differentialPairs.filter((pair:any) =>
      pair.connectionNames.every((name:string) => {
        const c=input.connections.find((c:any)=>c.name===name)
        return c.pointsToConnect.every((p:any)=> {
          const id=componentFor(p)
          const pad=input.obstacles.find((o:any)=>o.circuitJsonMetadata?.pcb_port_id===p.pcb_port_id)
          return id && pad?.layers?.length===1 && !cpu.some((o:any)=>o.componentId===id)
        }) && c.pointsToConnect.every((p:any)=> {
          const id=componentFor(p)
          return input.obstacles.some((o:any)=>o.componentId===id && o.shape!=="circle" && Math.abs(o.width-o.height)>.01)
        })
      }))
    // Long SMT-pad pairs use local full-stack dogbones before the body search.
    const rectangularNames = new Set(rectangularPairs.flatMap((p:any)=>p.connectionNames))
    let portInput={...input,traces:base,buses:[],differentialPairs:[],connections:input.connections.filter((c:any)=>rectangularNames.has(c.name))}
    if(portInput.connections.length) for(let pass=0;pass<2;pass++) {
      const requests=pass?portInput.connections.map((c:any)=>({...c,pointsToConnect:[...c.pointsToConnect].reverse()})):portInput.connections
      const fanout=new PeripheralDogboneAutorouter({input:{...portInput,connections:requests},fanoutRoutingLayers:["bottom"]})
      const fresh=fanout.solveSync(),out=fanout.getOutputSimpleRouteJson()
      portInput={...portInput,traces:[...portInput.traces,...fresh],connections:portInput.connections.map((c:any)=>{
        const done=out.connections.find((x:any)=>x.name===c.name)
        return done?{...done,pointsToConnect:pass?[...done.pointsToConnect].reverse():done.pointsToConnect}:c
      })}
      emit("progress",{steps,progress:0,phase:`PERIPHERAL_SMT_FANOUT_${pass+1}`}); await pause()
    }
    base=portInput.traces
    const componentPairs = new Map<string, any[]>()
    for (const pair of rectangularPairs) {
      const c=input.connections.find((c:any)=>c.name===pair.connectionNames[0])
      const key=c.pointsToConnect.map(componentFor).sort().join(":")
      componentPairs.set(key,[...(componentPairs.get(key)??[]),pair])
    }
    // Backtrack only computed bodies in this invocation. All input copper and
    // native via sites stay fixed, and no saved diagnostic output is imported.
    const search = async (traces:any[], remaining:any[], depth=0, nativePackage=false):Promise<any[]|null> => {
      if(!remaining.length) return traces
      for(const pair of remaining) {
        const routed=await run({...portInput,traces,allowedLayers:["bottom"],connections:portInput.connections.filter((c:any)=>pair.connectionNames.includes(c.name)),differentialPairs:[pair]},`SMT_DEPTH_${depth}_`+pair.connectionNames.join("_"),40_000,nativePackage)
        if(!routed) continue
        const complete=await search([...traces,...routed],remaining.filter((p:any)=>p!==pair),depth+1,nativePackage)
        if(complete) return complete
      }
      return null
    }
    const center={x:cpu.reduce((n:any,o:any)=>n+o.center.x,0)/cpu.length,y:cpu.reduce((n:any,o:any)=>n+o.center.y,0)/cpu.length}
    const radius=(group:any[])=>Math.max(...group.flatMap(pair=>input.connections.filter((c:any)=>pair.connectionNames.includes(c.name)).flatMap((c:any)=>c.pointsToConnect.map((p:any)=>(p.x-center.x)**2+(p.y-center.y)**2))))
    const orderedGroups=[...componentPairs.values()].sort((a,b)=>radius(b)-radius(a))
    // Reserve the outer connector bank before its upstream transmitter bank.
    // Both solver policies enforce the same electrical/clearance constraints.
    for(const [index,group] of orderedGroups.entries()) {
      const preferNativePackage=index>0
      const routed=await search(base,group,0,preferNativePackage)??await search(base,group,0,!preferNativePackage)
      if(!routed) throw Error("SMT paired routing exhausted its ordering search")
      base=routed
    }
    let order=input.differentialPairs.filter((p:any)=>p.connectionNames.every((n:string)=>!names.has(n)&&!rectangularNames.has(n))).reverse()
    const seen = new Set<string>()
    for (let attempt=0; attempt<24; attempt++) {
      const key = JSON.stringify(order.map((p: any) => p.connectionNames))
      if (seen.has(key)) break
      seen.add(key)
      let traces = [...base], blocked = -1
      for (let i=0; i<order.length; i++) {
        const pair = order[i]
        const fresh = await run({...input,traces,connections:input.connections.filter((c: any) => pair.connectionNames.includes(c.name)),differentialPairs:[pair]},`PAIR_ORDER_${attempt+1}_${pair.connectionNames.join("_")}`,250_000)
        if (!fresh) {blocked=i;break}
        traces.push(...fresh)
      }
      if (blocked < 0) {
        const prior = new Set(input.traces.map((t: any) => t.pcb_trace_id))
        return traces.filter((t: any) => !prior.has(t.pcb_trace_id))
      }
      // Rip up this attempt's pair carriers and give the blocked pair priority.
      // All fixed input and this invocation's CPU escapes remain immutable.
      const [hard] = order.splice(blocked,1);order=[hard,...order]
      if (blocked === 0) order=[...order.slice(1),order[0]]
    }
    throw new Error("No peripheral pair order completed within its search budget")
  }
  const router = {
    input, isRouting:false,
    on(type:string,listener:(event:any)=>void){listeners.set(type,[...(listeners.get(type)??[]),listener])},
    start(){if(router.isRouting)return;router.isRouting=true;void route().then(traces=>{completed=traces;router.isRouting=false;emit("complete",{traces})}).catch(error=>{router.isRouting=false;emit("error",{error})})},
    getOutputSimpleRouteJson(){
      if(!completed)throw Error("Peripheral autorouter has not completed")
      return {...input,traces:[...input.traces,...completed]}
    },
    stop(){stopped=true;router.isRouting=false},
  }
  return router
}
