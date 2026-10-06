import { expect, test } from "bun:test";
import { checkHoleTraceClearance, runAllRoutingChecks } from "@tscircuit/checks";
import { pcb_board, pcb_hole, pcb_plated_hole, pcb_trace, pcb_via } from "circuit-json";

const board = () => pcb_board.parse({ type: "pcb_board", pcb_board_id: "board", center: { x: 0, y: 0 },
  width: 10, height: 8, num_layers: 4, min_trace_to_hole_edge_clearance: 0.2,
  min_trace_to_pad_edge_clearance: 0.1 });
const trace = (layer: "top" | "inner1" | "inner2" | "bottom", y: number) => pcb_trace.parse({
  type: "pcb_trace", pcb_trace_id: "trace", source_trace_id: "source",
  route: [{ route_type: "wire", x: -1, y, width: 0.1, layer }, { route_type: "wire", x: 1, y, width: 0.1, layer }],
});
const nonPlatedHole = () => pcb_hole.parse({ type: "pcb_hole", pcb_hole_id: "npth", x: 0, y: 0,
  hole_shape: "circle", hole_diameter: 0.2 });

// The native prop explicitly defines this rule as trace copper to NPTH edge.
// Plated lands and all drill-to-drill manufacturing checks have separate rules.
test("native 0.2 mm trace-to-hole clearance applies to NPTH on every copper layer", async () => {
  for (const layer of ["top", "inner1", "inner2", "bottom"] as const) {
    const json = [board(), nonPlatedHole(), trace(layer, 0.3)];
    const before = JSON.stringify(json);
    const finding = checkHoleTraceClearance(json);
    expect(finding).toHaveLength(1);
    expect(finding[0]!.message).toContain("gap: 0.150000mm, required: 0.2mm");
    const fullNativeChecks = await runAllRoutingChecks(structuredClone(json));
    expect(fullNativeChecks.some(error => "pcb_trace_error_id" in error && error.pcb_trace_error_id === "overlap_trace_npth")).toBe(true);
    expect(checkHoleTraceClearance([board(), nonPlatedHole(), trace(layer, 0.35)])).toEqual([]);
    expect(JSON.stringify(json)).toBe(before);
  }
});

test("the full native routing gate also rejects direct NPTH copper overlap", async () => {
  const json = [board(), nonPlatedHole(), trace("bottom", 0)];
  const before = JSON.stringify(json);
  // The clearance checker delegates direct contact to the native overlap check.
  expect(checkHoleTraceClearance(json)).toEqual([]);
  const errors = await runAllRoutingChecks(structuredClone(json));
  expect(errors.some(error => "pcb_trace_error_id" in error && error.pcb_trace_error_id === "overlap_trace_npth" && error.message.includes("accidental contact"))).toBe(true);
  expect(JSON.stringify(json)).toBe(before);
});

test("NPTH trace clearance does not impose a 0.2 mm rule on via or PTH drills", () => {
  const plated = pcb_plated_hole.parse({ type: "pcb_plated_hole", pcb_plated_hole_id: "pth", x: 0, y: 0,
    shape: "circle", hole_diameter: 0.2, outer_diameter: 0.3,
    layers: ["top", "inner1", "inner2", "bottom"] });
  const via = pcb_via.parse({ type: "pcb_via", pcb_via_id: "via", x: 0, y: 0,
    hole_diameter: 0.2, outer_diameter: 0.3,
    layers: ["top", "inner1", "inner2", "bottom"], from_layer: "top", to_layer: "bottom" });
  for (const drill of [plated, via]) {
    // Trace-to-drill edge gap is 0.15 mm; the corresponding copper land gap is 0.10 mm.
    const json = [board(), drill, trace("bottom", 0.3)];
    const before = JSON.stringify(json);
    expect(checkHoleTraceClearance(json)).toEqual([]);
    expect(JSON.stringify(json)).toBe(before);
  }
});
