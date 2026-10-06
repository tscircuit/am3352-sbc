import { expect, test } from "bun:test";
import { pcb_board, pcb_via } from "circuit-json";
import type { SimplifiedPcbTrace } from "@tscircuit/core";
import { collapseRedundantViaVisits } from "../design/collapse-redundant-via-visits";
import { validateOuterRoutes } from "../design/outer-route-validation";
import { auditManufacturedVias } from "../scripts/manufactured-via-audit";

const layers = ["top", "inner1", "inner2", "bottom"];
const wire = (x: number, y: number, layer: string) => ({ route_type: "wire" as const, x, y, layer, width: 0.1 });
const via = (from: string, to: string) => ({ route_type: "via" as const, x: 0, y: 0,
  from_layer: from, to_layer: to, via_diameter: 0.3, via_hole_diameter: 0.15, layers });
const candidate = (): SimplifiedPcbTrace => ({ type: "pcb_trace", pcb_trace_id: "power", connection_name: "POWER", route: [
  wire(-1, 0, "bottom"), wire(0, 0, "bottom"), via("bottom", "top"),
  wire(0, 0, "top"), wire(0.01, 0.01, "top"), wire(0, 0, "top"), via("top", "bottom"),
  wire(0, 0, "bottom"), wire(0.3, 0, "bottom"), wire(0, 0, "bottom"), via("bottom", "top"),
  wire(0, 0, "top"), wire(1, 0, "top"),
] });
const drills = (trace: SimplifiedPcbTrace) => auditManufacturedVias([
  pcb_board.parse({ type: "pcb_board", pcb_board_id: "board", width: 6, height: 6, center: { x: 0, y: 0 }, num_layers: 4 }),
  ...trace.route.flatMap((point, index) => point.route_type === "via" ? [pcb_via.parse({
    type: "pcb_via", pcb_via_id: `visit${index}`, x: point.x, y: point.y,
    outer_diameter: point.via_diameter, hole_diameter: point.via_hole_diameter,
    layers: point.layers, from_layer: point.from_layer, to_layer: point.to_layer,
  })] : []),
]);

test("one retained barrel preserves all native terminals and external branch copper", () => {
  const trace = candidate(), before = JSON.stringify(trace), cleaned = collapseRedundantViaVisits(trace);
  expect(drills(trace).pass).toBe(false);
  expect(drills(cleaned).pass).toBe(true);
  expect(drills(cleaned).viaCount).toBe(1);
  expect(cleaned.route).toContainEqual(wire(0.3, 0, "bottom"));
  const input = { layerCount: 4, minTraceWidth: 0.1,
    bounds: { minX: -3, maxX: 3, minY: -3, maxY: 3 },
    obstacles: ["inner1", "inner2"].map(layer => ({ type: "rect" as const, layers: [layer],
      center: { x: 0, y: 0 }, width: 6, height: 6, isCopperPour: true, connectedTo: ["GND"] })),
    connections: [{ name: "POWER", pointsToConnect: [
      { x: -1, y: 0, layer: "bottom" }, { x: 1, y: 0, layer: "top" }, { x: 0.3, y: 0, layer: "bottom" },
    ] }],
  };
  expect(validateOuterRoutes(input, [cleaned])).toHaveLength(1);
  expect(JSON.stringify(trace)).toBe(before);
});

test("a visit whose copper leaves the retained land keeps its full route", () => {
  const trace = candidate();
  trace.route[4] = wire(0.11, 0, "top");
  expect(collapseRedundantViaVisits(trace)).toBe(trace);
});

test("a narrower endpoint cannot conceal the wider segment leaving the land", () => {
  const trace = candidate();
  trace.route[4] = { ...wire(0.11, 0, "top"), width: 0.02 };
  expect(collapseRedundantViaVisits(trace)).toBe(trace);
});

test("a sole round trip cannot remove its only manufactured barrel", () => {
  const trace = candidate();
  trace.route = [...trace.route.slice(0, 7), wire(0, 0, "bottom"), wire(1, 0, "bottom")];
  expect(collapseRedundantViaVisits(trace)).toBe(trace);
});

test("different physical spans or fabrication dimensions remain unchanged", () => {
  for (const change of [{ layers: ["top", "bottom"] }, { via_diameter: 0.31 }, { via_hole_diameter: 0.16 }]) {
    const trace = candidate();
    trace.route[10] = { ...via("bottom", "top"), ...change };
    expect(collapseRedundantViaVisits(trace)).toBe(trace);
  }
});
