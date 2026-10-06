import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { auditNativeDdrGeometry } from "../design/native-ddr-geometry";
import { DDR_RULES } from "../design/ddr-rules";
import { verifyDdrVendor } from "./check-ddr-vendor";

const path = process.argv.find(argument=>argument.endsWith(".circuit.json")) ?? "output/board.circuit.json";
const raw = await readFile(path,"utf8"),json:any[] = JSON.parse(raw);
const measured = auditNativeDdrGeometry(json);
const ids = new Set(measured.input.connections.map(connection=>connection.name));
const ports = new Set(measured.input.connections.flatMap(connection=>connection.pointsToConnect.map(point=>point.pcb_port_id)));
const errors = json.filter(element=>element.type.endsWith("_error"));
const connectivityErrors = errors.filter(error=>
  (error.type === "pcb_port_not_connected_error" && error.pcb_port_ids?.some((id:string)=>ports.has(id))) ||
  (error.type === "pcb_trace_missing_error" && ids.has(error.source_trace_id)));
const nativeTimingErrors = errors.filter(error=>error.type === "pcb_bus_length_skew_error");
const copperErrors = errors.filter(error=>!["pcb_port_not_connected_error","pcb_trace_missing_error","pcb_bus_length_skew_error"].includes(error.type));
const provenance = verifyDdrVendor();
const report = {
  circuitPath:path,circuitSha256:createHash("sha256").update(raw).digest("hex"),reference:DDR_RULES.source,revision:DDR_RULES.revision,
  router:"vendored_bus_lanes",solverSourceCommit:provenance.sourceCommit,solverBundleSha256:provenance.bundleSha256,
  copperProvenance:"Actual materialized native board copper, resolved by source signal names, physical pads and manufactured barrels",
  routed:measured.traces.length,expected:47,ddrEndpointCount:ports.size,
  geometricTimingPassed:measured.timing.pass,nativeCopperErrors:copperErrors,ddrConnectivityErrors:connectivityErrors,nativeTimingErrors,
  ...measured.timing,coupling:measured.coupling,
  pass:measured.pass && connectivityErrors.length === 0 && copperErrors.length === 0 && nativeTimingErrors.length === 0,
  notVerified:[...measured.timing.notVerified,"Complete-board physical all-terminal connectivity and actual ground-plane connectivity are checked by audit-routed-board"],
  fabricationReady:false,
};
await mkdir("work/ddr-routing/audits",{recursive:true});
await writeFile("work/ddr-routing/audits/native-ddr-audit.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,measurements:undefined},null,2));
if (!report.pass || process.argv.includes("--strict")) process.exitCode=1;
