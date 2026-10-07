import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { runAllRoutingChecks } from "@tscircuit/checks";
import type { AnyCircuitElement } from "circuit-json";
import { auditNativeDdrGeometry } from "../design/native-ddr-geometry";
import { auditNativePeripheralGeometry } from "../design/native-peripheral-geometry";
import { auditInnerGroundPlanes } from "./inner-ground-plane-audit";
import { auditManufacturedVias } from "./manufactured-via-audit";
import { auditPhysicalCopperConnectivity } from "./physical-copper-connectivity";
import { auditNativeTracePaths } from "./native-trace-path-audit";

const errorCounts = (json: readonly { type: string }[]) => {
  const counts: Record<string, number> = {};
  for (const element of json) if (element.type.endsWith("_error") || element.type.startsWith("unknown_error_") || "error_type" in element) counts[element.type] = (counts[element.type] ?? 0) + 1;
  return counts;
};

/** Strict AM3352 routed-board gate. Stored checkpoint audit flags, waived
 * incomplete ports and cached route provenance do not establish acceptance. */
export async function auditRoutedBoard(circuitJson: AnyCircuitElement[]) {
  const failures: string[] = [];
  const nativeErrorCounts = errorCounts(circuitJson);
  if (Object.keys(nativeErrorCounts).length) failures.push("Native circuit contains errors, including incomplete connections or runtime failures");
  const boards = circuitJson.filter(e => e.type === "pcb_board");
  if (boards.length !== 1 || boards[0].num_layers !== 4) failures.push("Expected exactly one physical four-layer PCB board");
  let recomputedRoutingErrorCounts: Record<string, number> = {};
  let routingChecksComplete = false;
  try {
    // Some native checks annotate endpoint IDs; accepted geometry remains intact.
    recomputedRoutingErrorCounts = errorCounts(await runAllRoutingChecks(structuredClone(circuitJson)));
    routingChecksComplete = true;
    if (Object.keys(recomputedRoutingErrorCounts).length) failures.push("Recomputed native routing DRC contains errors");
  } catch (error) {
    failures.push(`Native routing DRC failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const signalLayers = auditNativeTracePaths(circuitJson);
  const vias = auditManufacturedVias(circuitJson);
  const physicalConnectivity = auditPhysicalCopperConnectivity(circuitJson);
  const innerGroundPlanes = auditInnerGroundPlanes(circuitJson);
  failures.push(...signalLayers.failures, ...vias.failures, ...physicalConnectivity.failures, ...innerGroundPlanes.failures);
  let ddr: { pass: boolean; timing?: unknown; coupling?: unknown; failure?: string };
  try {
    const report = auditNativeDdrGeometry(circuitJson);
    ddr = { pass: report.pass, timing: report.timing, coupling: report.coupling };
    if (!ddr.pass) failures.push("Complete native DDR timing buses, absolute lengths or differential pair coupling failed");
  } catch (error) {
    ddr = { pass: false, failure: error instanceof Error ? error.message : String(error) };
    failures.push(`Native DDR acceptance failed: ${ddr.failure}`);
  }
  let peripheral: { pass: boolean; pairs?: unknown; coupling?: unknown; measurements?: unknown; failures?: string[]; failure?: string };
  try {
    const report = auditNativePeripheralGeometry(circuitJson);
    peripheral = { pass: report.pass, pairs: report.pairs, coupling: report.coupling, measurements: report.measurements, failures: report.failures };
    if (!report.pass) failures.push("Complete native USB/TMDS pair routing, skew or exterior coupling failed");
  } catch (error) {
    peripheral = { pass: false, failure: error instanceof Error ? error.message : String(error) };
    failures.push(`Native peripheral acceptance failed: ${peripheral.failure}`);
  }
  return {
    pass: failures.length === 0,
    failures,
    nativeErrorCounts,
    recomputedRoutingErrorCounts,
    routingChecksComplete,
    signalLayers,
    vias,
    physicalConnectivity,
    innerGroundPlanes,
    ddr,
    peripheral,
    scope: "Complete native routing and physical/timing geometry; impedance, power capacity and SI qualification remain separate.",
  };
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: bun scripts/audit-routed-board.ts <native.circuit.json> [report.json]");
  const bytes = await readFile(file);
  const report = { circuitSha256: createHash("sha256").update(bytes).digest("hex"), ...await auditRoutedBoard(JSON.parse(bytes.toString()) as AnyCircuitElement[]) };
  if (process.argv[3]) await writeFile(process.argv[3], `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}
