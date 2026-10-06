import {ramPoint,isRamRef} from "../design/ram-placement";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import escapes from "../design/power-escapes.json";
const raw = await readFile(process.argv.find(a=>a.endsWith(".circuit.json")) ?? "output/board-ddr.circuit.json", "utf8");
const json: any[] = JSON.parse(raw);
const source = new Map(
  json.filter((e) => e.type === "source_trace").map((e) => [e.name, e]),
);
const traces = json.filter((e) => e.type === "pcb_trace");
const vias = json.filter((e) => e.type === "pcb_via");
const near = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;
const missing = escapes.traces
  .filter((e) => {
    const t = source.get(e.name);
    const endpoint=(e as {directPlaneEndpoint?:{x:number;y:number}|null}).directPlaneEndpoint;
    const rawVia = escapes.vias.find((v) => v.name === e.via);
    if (!rawVia && !endpoint) return true;
    const ramVias = new Set(escapes.traces.filter(e=>isRamRef(e.from.split(" > ")[0].slice(1))).map(e=>e.via));
    const rawPosition=endpoint ?? rawVia!;
    const transformed=endpoint ? isRamRef(e.from.split(" > ")[0].slice(1)) : ramVias.has(rawVia!.name);
    let v = transformed ? ramPoint(rawPosition.x,rawPosition.y) : rawPosition;
    if(endpoint){
      const sc=json.find(s=>s.type==="source_component"&&s.name===e.from.split(" > ")[0].slice(1));
      const c=json.find(c=>c.type==="pcb_component"&&c.source_component_id===sc.source_component_id);
      const angle=c.rotation*Math.PI/180;
      v={x:(c.display_offset_x??c.center.x)+endpoint.x*Math.cos(angle)-endpoint.y*Math.sin(angle),y:(c.display_offset_y??c.center.y)+endpoint.x*Math.sin(angle)+endpoint.y*Math.cos(angle)};
    }
    return (
      !traces.some(
        (p) =>
          p.source_trace_id === t?.source_trace_id &&
          p.route.some(
            (r: any) =>
              r.route_type === "wire" && r.layer === e.layer && near(r, v),
          ),
      ) ||
      (!endpoint && !vias.some(
        (p) =>
          near(p, v) &&
          ["top", "inner1", "inner2", "bottom"].every((l) =>
            p.layers.includes(l),
          ),
      ))
    );
  })
  .map((e) => e.name);
const errors = json.filter((e) => e.type.endsWith("_error"));
const incomplete = errors.filter(
  (e) =>
    ["pcb_port_not_connected_error", "pcb_trace_missing_error"].includes(
      e.type,
    ) ||
    (e.type === "pcb_trace_error" &&
      e.message.includes("has dangling endpoint")),
);
const timingErrors=errors.filter(e=>e.type==="pcb_bus_length_skew_error");
const blockers = errors.filter((e) => !incomplete.includes(e) && !timingErrors.includes(e));
const nets = new Map(
  json
    .filter((e) => e.type === "source_net")
    .map((e) => [e.source_net_id, e.name]),
);
const pours = json
  .filter((e) => e.type === "pcb_copper_pour")
  .map((e) => ({ layer: e.layer, net: nets.get(e.source_net_id) }));
const board = json.find((e) => e.type === "pcb_board");
const report = {
  stage:
    "DDR and power/ground breakout checkpoint; timing and peripheral routing incomplete",
  circuitSha256: createHash("sha256").update(raw).digest("hex"),
  layerCount: board.num_layers,
  pours,
  requestedEscapes: 375,
  generatedEscapes: escapes.traces.length,
  renderedEscapes: escapes.traces.length - missing.length,
  distinctEscapeVias: escapes.vias.length,
  missingEscapes: missing,
  nativeClearanceAndPlacementErrors: blockers,
  ddrTimingErrors:timingErrors,
  directTopPlaneConnections:escapes.traces.filter(e=>e.directPlaneEndpoint).length,
  incompleteRoutingErrors: incomplete.length,
  otherRailDistributionComplete: false,
  ddrRoutingComplete: json.filter(e=>e.type==="pcb_trace" && json.some(s=>s.type==="source_trace" && s.source_trace_id===e.source_trace_id && /^DDR_/.test(s.name))).length===47,
  fabricationReady: false,
};
await writeFile(
  "output/power-checkpoint-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(report);
if (
  missing.length ||
  escapes.traces.length !== 375 ||
  blockers.length ||
  board.num_layers !== 4 ||
  !pours.some((p) => p.layer === "top" && p.net === "DDR_1V5") ||
  !pours.some((p) => p.layer === "bottom" && p.net === "GND")
)
  process.exitCode = 1;
