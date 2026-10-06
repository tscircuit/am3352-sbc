import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { FanoutTracePath } from "@tscircuit/props";

const raw = await readFile("design/ddr-routes.json", "utf8");
const paths: FanoutTracePath[] = JSON.parse(raw);
// Normalize only zero-length duplicate wire points and renderer-added port IDs.
// Coordinate, layer, width and via geometry must remain identical.
function normalize(route: any[]) {
  const out: string[] = [];
  for (const point of route) {
    const p = { ...point };
    // The renderer moves via layer spans to pcb_via; validate them below.
    if(p.route_type==="via")delete p.layers;
    delete p.start_pcb_port_id;
    delete p.end_pcb_port_id;
    const key = JSON.stringify(
      Object.fromEntries(
        Object.entries(p).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
    if (p.route_type === "wire" && out.at(-1) === key) continue;
    out.push(key);
  }
  return JSON.stringify(out);
}
const json: any[] = JSON.parse(
  await readFile(process.argv.find(a=>a.endsWith(".circuit.json")) ?? "output/board-ddr.circuit.json", "utf8"),
);
const actual = json
  .filter((e) => e.type === "pcb_trace")
  .map((e) => normalize(e.route));
const missing = paths.filter((p) => !actual.includes(normalize(p.route)));
const unexpectedErrors = json.filter(
  (e) =>
    e.type.endsWith("_error") &&
    !(e.type==="pcb_trace_error" && e.message.includes("has dangling endpoint")) &&
    !["pcb_port_not_connected_error", "pcb_trace_missing_error", "pcb_bus_length_skew_error"].includes(
      e.type,
    ),
);
const report = {
  stage:
    "DDR + power/ground escape checkpoint; cached peripheral routes may also be present",
  routeFileSha256: createHash("sha256").update(raw).digest("hex"),
  expectedPaths: 47,
  savedPaths: paths.length,
  integratedPaths: actual.length,
  preservedDdrPaths: paths.length - missing.length,
  layerCount: json.find((e) => e.type === "pcb_board")?.num_layers,
  preservedExactly: missing.length === 0 && paths.length === 47,
  ddrViasSpanAllLayers: paths.flatMap(p=>p.route.filter(p=>p.route_type==="via")).every(v=>json.some(e=>e.type==="pcb_via" && Math.hypot(e.x-Number(v.x),e.y-Number(v.y))<1e-6 && ["top","inner1","inner2","bottom"].every(l=>e.layers.includes(l)))),
  timingErrors:json.filter(e=>e.type==="pcb_bus_length_skew_error").length,
  timingSignoff:false,
  unexpectedNativeErrors: unexpectedErrors.length,
  allowedIncompleteErrorCounts: Object.fromEntries(
    ["pcb_port_not_connected_error", "pcb_trace_missing_error"].map((type) => [
      type,
      json.filter((e) => e.type === type).length,
    ]),
  ),
  fabricationReady: false,
};
await writeFile(
  "output/checkpoint-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(report);
if (!report.preservedExactly || !report.ddrViasSpanAllLayers || unexpectedErrors.length) process.exitCode = 1;
