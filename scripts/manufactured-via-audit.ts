import { circlePolygon, copperPolygonsTouch, getPrimaryId, roundedRectangle } from "@tscircuit/circuit-json-util";
import type { AnyCircuitElement } from "circuit-json";

const stack = ["top", "inner1", "inner2", "bottom"] as const;
type Polygon = ReturnType<typeof circlePolygon>;

/** Drill geometry is independent of electrical ownership: same-net barrels
 * cannot conceal duplicate drills or an insufficient manufacturing web. */
export function auditManufacturedVias(circuitJson: AnyCircuitElement[]) {
  const failures: string[] = [];
  const invalidViaIds: string[] = [];
  const incompleteViaSpans: string[] = [];
  const duplicateViaSites: { firstId: string; secondId: string }[] = [];
  const drillCollisions: { firstId: string; secondId: string; gapMm: number; requiredGapMm: number }[] = [];
  const unsupportedDrillIds: string[] = [];
  const board = circuitJson.find(e => e.type === "pcb_board");
  const minViaDrillGap = board?.min_via_hole_edge_to_via_hole_edge_clearance ?? 0.15;
  const minPlatedDrillGap = board?.min_plated_hole_drill_edge_to_drill_edge_clearance ?? 0.15;
  const maxDrillGap = Math.max(minViaDrillGap, minPlatedDrillGap);
  const vias = circuitJson.filter(e => e.type === "pcb_via");
  for (const via of vias) {
    if (![via.x, via.y, via.outer_diameter, via.hole_diameter].every(Number.isFinite) || Math.abs(via.outer_diameter - 0.3) > 1e-8 || Math.abs(via.hole_diameter - 0.15) > 1e-8) invalidViaIds.push(via.pcb_via_id);
    if (via.layers.length !== stack.length || !stack.every(layer => via.layers.includes(layer))) incompleteViaSpans.push(via.pcb_via_id);
  }
  for (let i = 0; i < vias.length; i++) for (let j = 0; j < i; j++) {
    if (Math.hypot(vias[i].x - vias[j].x, vias[i].y - vias[j].y) < 1e-7)
      duplicateViaSites.push({ firstId: vias[j].pcb_via_id, secondId: vias[i].pcb_via_id });
  }
  const rotations = new Map(circuitJson.filter(e => e.type === "pcb_component").map(e => [e.pcb_component_id, e.rotation]));
  const drills: { id: string; kind: "pcb_via" | "pcb_plated_hole" | "pcb_hole"; polygon: Polygon }[] = [];
  for (const element of circuitJson) {
    if (element.type !== "pcb_via" && element.type !== "pcb_plated_hole" && element.type !== "pcb_hole") continue;
    const id = getPrimaryId(element)!;
    const e = element as unknown as Record<string, any>;
    try {
      if (![e.x, e.y].every(Number.isFinite)) throw new Error("Nonfinite drill center");
      const center = {
        x: e.x + (e.hole_offset_x ?? 0),
        y: e.y + (e.hole_offset_y ?? 0),
      };
      let polygon: Polygon;
      if (typeof e.hole_diameter === "number") {
        if (!Number.isFinite(e.hole_diameter) || e.hole_diameter <= 0) throw new Error("Invalid drill diameter");
        polygon = e.hole_shape === "square"
          ? roundedRectangle(center, e.hole_diameter, e.hole_diameter, 0)
          : circlePolygon(center, e.hole_diameter / 2);
      } else if (typeof e.hole_width === "number" && typeof e.hole_height === "number") {
        if (![e.hole_width, e.hole_height].every(Number.isFinite) || e.hole_width <= 0 || e.hole_height <= 0) throw new Error("Invalid slotted drill");
        const rotation = e.hole_ccw_rotation ?? e.ccw_rotation ?? (e.shape === "hole_with_polygon_pad" ? rotations.get(e.pcb_component_id) : 0) ?? 0;
        const radius = e.hole_shape === "rect" ? 0 : Math.min(e.hole_width, e.hole_height) / 2;
        polygon = roundedRectangle(center, e.hole_width, e.hole_height, radius, rotation);
      } else throw new Error("Unknown native drill geometry");
      if (polygon.isEmpty() || !Number.isFinite(polygon.area())) throw new Error("Invalid drill polygon");
      drills.push({ id, kind: element.type, polygon });
    } catch {
      unsupportedDrillIds.push(id);
    }
  }
  let minimumDrillGapMm: number | null = null;
  const order = drills.map((_, i) => i).sort((a, b) => drills[a].polygon.box.xmin - drills[b].polygon.box.xmin);
  for (let a = 0; a < order.length; a++) {
    const x = drills[order[a]];
    for (let b = a + 1; b < order.length; b++) {
      const y = drills[order[b]];
      if (y.polygon.box.xmin > x.polygon.box.xmax + maxDrillGap) break;
      const requiredGap = x.kind === "pcb_via" && y.kind === "pcb_via" ? minViaDrillGap : minPlatedDrillGap;
      if (y.polygon.box.ymin > x.polygon.box.ymax + requiredGap || y.polygon.box.ymax < x.polygon.box.ymin - requiredGap) continue;
      const gap = copperPolygonsTouch(x.polygon, y.polygon) ? 0 : x.polygon.distanceTo(y.polygon)[0];
      minimumDrillGapMm = Math.min(minimumDrillGapMm ?? Infinity, gap);
      if (!Number.isFinite(gap) || gap < requiredGap - 1e-7) drillCollisions.push({ firstId: x.id, secondId: y.id, gapMm: gap, requiredGapMm: requiredGap });
    }
  }
  if (![minViaDrillGap, minPlatedDrillGap].every(value => Number.isFinite(value) && value >= 0)) failures.push("Invalid native manufacturing drill clearance");
  if (invalidViaIds.length) failures.push("All routed vias must use 0.30 mm lands and 0.15 mm plated drills");
  if (incompleteViaSpans.length) failures.push("All vias must span top, inner1, inner2 and bottom");
  if (duplicateViaSites.length) failures.push("Duplicate physical via drill sites");
  if (unsupportedDrillIds.length) failures.push("Unsupported or invalid native drill geometry");
  if (drillCollisions.length) failures.push("Manufactured drills have insufficient edge spacing");
  return { pass: failures.length === 0, failures, viaCount: vias.length, drillCount: drills.length, minDrillGapMm: Math.min(minViaDrillGap, minPlatedDrillGap), minViaDrillGapMm: minViaDrillGap, minPlatedDrillGapMm: minPlatedDrillGap, minimumNearbyDrillGapMm: minimumDrillGapMm, invalidViaIds, incompleteViaSpans, duplicateViaSites, drillCollisions, unsupportedDrillIds };
}
