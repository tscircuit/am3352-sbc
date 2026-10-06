import { expect, test } from "bun:test";
import { pcb_board, pcb_hole, pcb_plated_hole, pcb_via, type AnyCircuitElement } from "circuit-json";
import { auditManufacturedVias } from "../scripts/manufactured-via-audit";

const board = () => pcb_board.parse({ type: "pcb_board", pcb_board_id: "board", width: 10, height: 8, center: { x: 0, y: 0 }, num_layers: 4 });
const via = (id: string, x: number, y = 0) => pcb_via.parse({ type: "pcb_via", pcb_via_id: id, x, y,
  outer_diameter: 0.3, hole_diameter: 0.15, layers: ["top", "inner1", "inner2", "bottom"],
  from_layer: "top", to_layer: "bottom", source_net_id: "same_ground_owner" });

test("accepts correctly spaced full-stack manufactured barrels", () => {
  const json = [board(), via("a", 0), via("b", 1)];
  const before = JSON.stringify(json);
  const report = auditManufacturedVias(json);
  expect(report.pass).toBe(true);
  expect(report.failures).toEqual([]);
  expect(report.viaCount).toBe(2);
  expect(report.drillCount).toBe(2);
  expect(report.minDrillGapMm).toBe(0.15);
  expect(JSON.stringify(json)).toBe(before);
});

test("duplicate same-net barrels are separate manufactured drill faults", () => {
  const report = auditManufacturedVias([board(), via("a", 0), via("b", 0)]);
  expect(report.pass).toBe(false);
  expect(report.duplicateViaSites).toEqual([{ firstId: "a", secondId: "b" }]);
  expect(report.drillCollisions).toHaveLength(1);
  expect(report.drillCollisions[0].gapMm).toBe(0);
});

test("measures drill edge spacing even for distinct barrels on one net", () => {
  const report = auditManufacturedVias([board(), via("a", 0), via("b", 0.29)]);
  expect(report.pass).toBe(false);
  expect(report.duplicateViaSites).toEqual([]);
  expect(report.drillCollisions[0].gapMm).toBeCloseTo(0.14, 8);
});

test("uses native via and plated-drill rules without imposing an extra spacing minimum", () => {
  const nativeBoard = board();
  nativeBoard.min_via_hole_edge_to_via_hole_edge_clearance = 0.1;
  nativeBoard.min_plated_hole_drill_edge_to_drill_edge_clearance = 0.15;
  const report = auditManufacturedVias([nativeBoard, via("a", 0), via("b", 0.29)]);
  expect(report.pass).toBe(true);
  expect(report.minViaDrillGapMm).toBe(0.1);
  expect(report.minPlatedDrillGapMm).toBe(0.15);
});

test("rejects incorrect land/drill dimensions and incomplete physical spans", () => {
  const a = via("a", 0);
  a.outer_diameter = 0.29;
  a.layers = ["top", "bottom"];
  const report = auditManufacturedVias([board(), a]);
  expect(report.pass).toBe(false);
  expect(report.invalidViaIds).toEqual(["a"]);
  expect(report.incompleteViaSpans).toEqual(["a"]);
});

test("a via cannot drill into an existing nonplated mounting hole", () => {
  const hole = pcb_hole.parse({ type: "pcb_hole", pcb_hole_id: "mount", hole_shape: "circle", hole_diameter: 0.4, x: 0.2, y: 0 });
  const report = auditManufacturedVias([board(), via("a", 0), hole]);
  expect(report.pass).toBe(false);
  expect(report.drillCollisions[0].gapMm).toBe(0);
});

test("plated-hole drill offsets determine the actual manufacturing gap", () => {
  const hole = pcb_plated_hole.parse({ type: "pcb_plated_hole", pcb_plated_hole_id: "offset", shape: "circular_hole_with_rect_pad",
    hole_shape: "circle", pad_shape: "rect",
    x: 1, y: 0, hole_offset_x: 0.8, hole_offset_y: 0, hole_diameter: 0.15,
    rect_pad_width: 2, rect_pad_height: 0.3, layers: ["top", "inner1", "inner2", "bottom"] });
  const report = auditManufacturedVias([board(), via("a", 1.51), hole]);
  expect(report.pass).toBe(false);
  expect(report.drillCollisions[0].gapMm).toBeCloseTo(0.14, 8);
});

test("rotated slots are checked as their actual drill geometry", () => {
  const hole = pcb_hole.parse({ type: "pcb_hole", pcb_hole_id: "slot", hole_shape: "rotated_pill",
    x: 1, y: 0, hole_width: 0.2, hole_height: 1.2, ccw_rotation: 90 });
  const report = auditManufacturedVias([board(), via("a", 1.4, 0.2), hole]);
  expect(report.pass).toBe(false);
  expect(report.drillCollisions[0].gapMm).toBeCloseTo(0.025, 8);
});

test("unknown drill geometry fails closed", () => {
  const bad = { type: "pcb_hole", pcb_hole_id: "unsupported", x: 0, y: 0, hole_shape: "unknown" } as unknown as AnyCircuitElement;
  const report = auditManufacturedVias([board(), bad]);
  expect(report.pass).toBe(false);
  expect(report.unsupportedDrillIds).toEqual(["unsupported"]);
});
