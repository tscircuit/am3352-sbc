import looksSame from "@tscircuit/image-utils/looks-same";
import { readFile, writeFile } from "node:fs/promises";

import { createHash } from "node:crypto";
import { getSimpleRouteJsonFromCircuitJson } from "@tscircuit/core";
import type { SimpleRouteJson, Trace } from "../design/vendor/bus-lanes-outer.js";
import { auditNativeDdrGeometry } from "../design/native-ddr-geometry";
import { auditDdrPhysicalGeometry } from "../design/ddr-physical-audit";
import { hydrateNativeFixedCopper } from "../design/native-fixed-copper";
import { compactRoutingInput } from "../design/compact-routing-input";
import { renderPcbCheckpoint } from "../tests/fixtures/pcb-snapshot";

const before = JSON.parse(await readFile("docs/pcb-snapshots/before-ddr.json", "utf8"));
const routes = await readFile("design/ddr-routes.json");
if (createHash("sha256").update(routes).digest("hex") === before.routesSha256)
  throw new Error("DDR has not been regenerated; no fresh routing comparison is available");

// The visual baseline is allowed to describe an inherited checkpoint. A fresh
// routing comparison additionally requires complete accepted native geometry.
const json = await renderPcbCheckpoint();
const audit = auditNativeDdrGeometry(json);
if (audit.traces.length !== 47 || !audit.pass)
  throw new Error("Fresh DDR comparison requires 47 accepted native routes");
const ddrIds = new Set(audit.traces.map(trace => trace.source_trace_id));
const ddrTraceIds = new Set(audit.traces.map(trace => trace.pcb_trace_id));
const fixedNative = json.filter(element =>
  !((element.type === "pcb_trace" || element.type === "pcb_via") &&
    (ddrIds.has(element.source_trace_id) ||
      (element.type === "pcb_via" && element.pcb_trace_id !== undefined && ddrTraceIds.has(element.pcb_trace_id)))));
const converted = getSimpleRouteJsonFromCircuitJson({ circuitJson: fixedNative }).simpleRouteJson;
const fixed = compactRoutingInput(hydrateNativeFixedCopper(converted, fixedNative).input);
const fixedTraces = fixed.traces?.map(trace => {
  if (trace.route.some(point => point.route_type !== "wire" && point.route_type !== "via"))
    throw new Error("Routing comparison requires physical wires and manufactured vias");
  return trace as Trace;
});
const physicalInput: SimpleRouteJson = { ...fixed, traces: fixedTraces, connections: audit.input.connections,
  buses: audit.input.buses, allowedLayers: audit.input.allowedLayers,
  differentialPairs: audit.input.differentialPairs };
const physical = auditDdrPhysicalGeometry(physicalInput, audit.traces, { nativeCircuitJson: fixedNative });
if (!physical.pass || physical.issues.length || physical.fixedBaselineIssues.length)
  throw new Error("Fresh DDR comparison failed physical copper acceptance");
for (const layer of ["top", "inner1", "inner2", "bottom"] as const) {
  const before = await readFile(`docs/pcb-snapshots/before-${layer}.png`);
  const after = await readFile(`tests/__snapshots__/pcb-snapshot-${layer}.snap.png`);
  const diff = await looksSame.createDiff({
    reference: before, current: after, highlightColor: "#ff00ff",
  });
  await writeFile(`docs/pcb-snapshots/change-${layer}.png`, diff);
}
