import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { SimpleRouteJson, Trace } from "@tscircuit/bus-lanes-solver";
import { sharedNets } from "../design/ddr-netlist";
import { DDR_RULES, ddrPairs, ddrTraceName } from "../design/ddr-rules";
import { auditDdrGeometry } from "../design/ddr-compliance";

const raw = await readFile(process.argv.find(a=>a.endsWith('.circuit.json')) ?? "output/board-ddr.circuit.json", "utf8");
const json:any[] = JSON.parse(raw);
const expected=new Set(sharedNets.map(ddrTraceName));
const source=json.filter(e=>e.type==="source_trace"&&expected.has(e.name));
const ids=new Set(source.map(s=>s.source_trace_id));
const names=Object.fromEntries(source.map(s=>[s.source_trace_id,s.name]));
const ports=new Map(json.filter(e=>e.type==="pcb_port").map(e=>[e.source_port_id,e]));
const traces=json.filter(e=>e.type==="pcb_trace"&&ids.has(e.source_trace_id)).map(t=>({...t,connection_name:t.source_trace_id})) as Trace[];
const buses=json.filter(e=>e.type==="source_bus"&&e.source_trace_ids.every((id:string)=>ids.has(id)));
const board=json.find(e=>e.type==="pcb_board");
// The native source buses are independently checked against the required groups.
// Signal-layer conformance is measured from copper, because source_bus does not
// serialize pcbAllowedLayers. The router-input test separately checks that field.
const input:SimpleRouteJson={
 layerCount:board.num_layers, allowedLayers:[...DDR_RULES.signalLayers],minTraceWidth:.1,
 bounds:{minX:-50,maxX:50,minY:-40,maxY:40},obstacles:[],
 connections:source.map(s=>({name:s.source_trace_id,source_trace_id:s.source_trace_id,pointsToConnect:s.connected_source_port_ids.map((id:string)=>{
  const p=ports.get(id);if(!p)throw Error(`Missing PCB terminal: ${s.name}`);return {x:p.x,y:p.y,layer:p.layers[0],pcb_port_id:p.pcb_port_id};
 })})),
 buses:buses.map(b=>({busId:b.name,name:b.name,connectionNames:b.source_trace_ids,maxLengthSkew:b.max_length_skew,allowedLayers:[...DDR_RULES.signalLayers]})),
 differentialPairs:ddrPairs.flatMap(pair=>{
  const bus=buses.find(b=>b.name===pair.name);
  return bus?[{connectionNames:bus.source_trace_ids as [string,string],lengthTolerance:bus.max_length_skew}]:[];
 }),
};
const geometry=auditDdrGeometry(input,traces,names);
const errors=json.filter(e=>e.type.endsWith("_error"));
const sourcePorts=new Set(source.flatMap(s=>s.connected_source_port_ids));
const pcbPorts=new Set(json.filter(e=>e.type==="pcb_port"&&sourcePorts.has(e.source_port_id)).map(e=>e.pcb_port_id));
const connectivityErrors=errors.filter(e=>(e.type==="pcb_port_not_connected_error"&&e.pcb_port_ids?.some((p:string)=>pcbPorts.has(p)))||(e.type==="pcb_trace_missing_error"&&ids.has(e.source_trace_id)));
const copperErrors=errors.filter(e=>!["pcb_port_not_connected_error","pcb_trace_missing_error","pcb_bus_length_skew_error"].includes(e.type)&&!(e.type==="pcb_trace_error"&&e.message.includes("has dangling endpoint")));
const nativeTimingErrors=errors.filter(e=>e.type==="pcb_bus_length_skew_error");
const configuredSolverVersion=JSON.parse(await readFile("node_modules/@tscircuit/bus-lanes-solver/package.json","utf8")).version;
const report={
 circuitSha256:createHash("sha256").update(raw).digest("hex"), reference:DDR_RULES.source,revision:DDR_RULES.revision,
 router:"bus_lanes",configuredSolverVersion,copperProvenance:"Precomputed DDR copper; audit does not reroute it",routed:traces.length,expected:47,ddrEndpointCount:pcbPorts.size,
 geometricTimingPassed:geometry.pass, nativeCopperErrors:copperErrors,ddrConnectivityErrors:connectivityErrors,nativeTimingErrors,
 ...geometry,
 // This pass is only the explicitly measured geometric checkpoint.
 pass:geometry.pass&&input.layerCount===4&&connectivityErrors.length===0&&copperErrors.length===0&&nativeTimingErrors.length===0,
 signoffBlockers:[
  "JLC04161H-3313 stackup selected and calculated; existing DDR copper still needs migration to the calculated widths/gaps and manufacturer coupon confirmation",
  "Top DDR_1V5 has bridged islands; electrical connectivity does not prove continuous high-frequency reference planes",
  "Via/package flight-time correction and reference return-current stitching are not signed off",
  "Unterminated single-x16 CA/CK topology needs SI analysis (TI Figure 7-48 and section 7.7.2.3.3.9)",
  "TI spacing exceptions, pair coupling, decoupling and complete supply distribution are not signed off",
 ],fabricationReady:false,
};
await writeFile("output/ddr-audit.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,measurements:undefined,nativeTimingErrors:nativeTimingErrors.map(e=>({type:e.type,message:e.message}))},null,2));
// Absolute length failures are always fatal, not an optional --strict check.
if(!report.pass||process.argv.includes("--strict")&&report.signoffBlockers.length)process.exitCode=1;
