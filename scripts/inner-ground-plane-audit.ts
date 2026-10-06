import {
  copperPolygonsTouch,
  getPlatedHolePolygon,
  getPourPolygon,
  getSmtPadPolygon,
  getTraceSegmentPolygon,
  getViaPolygon,
} from "@tscircuit/circuit-json-util";
import type { AnyCircuitElement } from "circuit-json";
import { nativeElectricalOwnership } from "./native-electrical-ownership";

const physicalLayers = ["top", "inner1", "inner2", "bottom"] as const;
const innerLayers = ["inner1", "inner2"] as const;
type Polygon = ReturnType<typeof getPourPolygon>;

export interface InnerGroundPlaneAuditOptions {
  groundNetName?: string;
  /** Copper-to-copper clearance; independent of the native pour-short check. */
  minViaAntipadClearanceMm?: number;
}

/** Inspect emitted copper, not JSX declarations or logical net membership.
 * Native DRC and whole-board signal connectivity remain separate checks. */
export function auditInnerGroundPlanes(
  circuitJson: AnyCircuitElement[],
  options: InnerGroundPlaneAuditOptions = {},
) {
  const failures: string[] = [];
  const groundName = options.groundNetName ?? "GND";
  const minimumGap = options.minViaAntipadClearanceMm ?? 0.1;
  const empty = {
    pass: false,
    failures,
    innerPours: [] as { id: string; layer: string; areaMm2: number }[],
    groundBridgeViaIds: [] as string[],
    foreignViaAntipads: [] as { viaId: string; layer: string; clearanceMm: number }[],
    incompleteViaSpans: [] as string[],
    disconnectedGroundPortIds: [] as string[],
    floatingInnerPourIds: [] as string[],
  };
  if (!Number.isFinite(minimumGap) || minimumGap < 0) {
    failures.push("Invalid via antipad clearance");
    return empty;
  }
  try {
    const boards = circuitJson.filter(e => e.type === "pcb_board");
    if (boards.length !== 1 || boards[0].num_layers !== 4)
      failures.push("Expected exactly one physical four-layer board");
    const sourceNets = circuitJson.filter(e => e.type === "source_net").filter(e => e.name === groundName);
    if (sourceNets.length !== 1) {
      failures.push(`Expected exactly one ${groundName} source net`);
      return empty;
    }
    const connMap = nativeElectricalOwnership(circuitJson);
    const groundId = sourceNets[0].source_net_id;
    const isGround = (id: string | undefined) => !!id && (id === groundId || connMap.areIdsConnected(id, groundId));
    const allPourPolygons = circuitJson.filter(e => e.type === "pcb_copper_pour").map(pour => ({ pour, polygon: getPourPolygon(pour) }));
    const pourPolygons = allPourPolygons.filter(p => innerLayers.includes(p.pour.layer as typeof innerLayers[number]));
    for (const layer of innerLayers) {
      if (!pourPolygons.some(p => p.pour.layer === layer && isGround(p.pour.source_net_id) && !p.polygon.isEmpty() && p.polygon.area() > 0))
        failures.push(`Missing nonempty ${groundName} copper on ${layer}`);
    }
    for (const { pour, polygon } of pourPolygons) {
      if (!isGround(pour.source_net_id)) failures.push(`Foreign inner-layer pour ${pour.pcb_copper_pour_id}`);
      if (pour.covered_with_solder_mask !== true) failures.push(`Inner pour ${pour.pcb_copper_pour_id} must omit soldermask openings`);
      if (polygon.isEmpty() || !Number.isFinite(polygon.area()) || polygon.area() <= 0)
        failures.push(`Empty or invalid inner pour ${pour.pcb_copper_pour_id}`);
      empty.innerPours.push({ id: pour.pcb_copper_pour_id, layer: pour.layer, areaMm2: polygon.area() });
    }
    const groundPours = pourPolygons.filter(p => isGround(p.pour.source_net_id));
    const vias = circuitJson.filter(e => e.type === "pcb_via");
    for (const via of vias) {
      if (via.layers.length !== physicalLayers.length || !physicalLayers.every(layer => via.layers.includes(layer)))
        empty.incompleteViaSpans.push(via.pcb_via_id);
      if (![via.x, via.y, via.outer_diameter, via.hole_diameter].every(Number.isFinite) || via.hole_diameter <= 0 || via.outer_diameter <= via.hole_diameter) {
        failures.push(`Invalid physical via ${via.pcb_via_id}`);
        continue;
      }
      const polygon = getViaPolygon(via, via.outer_diameter, via.hole_diameter);
      if (isGround(via.pcb_via_id)) {
        if (physicalLayers.every(layer => via.layers.includes(layer)) && innerLayers.every(layer => groundPours.some(p => p.pour.layer === layer && copperPolygonsTouch(polygon, p.polygon))))
          empty.groundBridgeViaIds.push(via.pcb_via_id);
      } else {
        for (const layer of innerLayers) {
          if (!via.layers.includes(layer)) continue;
          const layerPours = groundPours.filter(p => p.pour.layer === layer);
          if (!layerPours.length) continue; // Missing plane already fails above.
          const gap = Math.min(...layerPours.map(p => copperPolygonsTouch(polygon, p.polygon) ? 0 : polygon.distanceTo(p.polygon)[0]));
          empty.foreignViaAntipads.push({ viaId: via.pcb_via_id, layer, clearanceMm: gap });
          if (!Number.isFinite(gap) || gap < minimumGap - 1e-7)
            failures.push(`Insufficient ${layer} antipad for ${via.pcb_via_id}: ${gap} mm`);
        }
      }
    }
    if (empty.incompleteViaSpans.length) failures.push("Some vias do not span the complete four-layer stack");
    if (!empty.groundBridgeViaIds.length) failures.push("No physical full-stack GND barrel joins both inner planes");

    type Conductor = { polygon: Polygon; layers: readonly string[]; id: string; portIds: string[]; isInnerPour?: boolean };
    const conductors: Conductor[] = allPourPolygons.filter(p => isGround(p.pour.source_net_id)).map(({ pour, polygon }) => ({ polygon, layers: [pour.layer], id: pour.pcb_copper_pour_id, portIds: [], isInnerPour: innerLayers.includes(pour.layer as typeof innerLayers[number]) }));
    const componentRotations = new Map(circuitJson.flatMap(e => e.type === "pcb_component" ? [[e.pcb_component_id, e.rotation] as const] : []));
    for (const e of circuitJson) {
      if (e.type === "pcb_trace") {
        const ground = isGround(e.pcb_trace_id);
        if (ground && e.route_thickness_mode === "interpolated") {
          failures.push(`Unsupported interpolated GND trace ${e.pcb_trace_id}`);
          continue;
        }
        for (let i = 1; i < e.route.length; i++) {
          const a = e.route[i - 1], b = e.route[i];
          if (a.route_type !== "wire" || b.route_type !== "wire" || a.layer !== b.layer) continue;
          if (!ground && innerLayers.includes(a.layer as typeof innerLayers[number]) && Math.hypot(a.x - b.x, a.y - b.y) > 1e-9)
            failures.push(`Non-GND inner-layer wire in ${e.pcb_trace_id}`);
          if (!ground || Math.hypot(a.x - b.x, a.y - b.y) <= 1e-9) continue;
          // Endpoint IDs are electrical metadata, not proof of physical pad
          // contact. Only native pad/barrel geometry contributes port roots.
          conductors.push({ polygon: getTraceSegmentPolygon(a, b, a.width), layers: [a.layer], id: e.pcb_trace_id, portIds: [] });
        }
      } else if (e.type === "pcb_smtpad" && isGround(e.pcb_smtpad_id)) {
        conductors.push({ polygon: getSmtPadPolygon(e), layers: [e.layer], id: e.pcb_smtpad_id, portIds: e.pcb_port_id ? [e.pcb_port_id] : [] });
      } else if (e.type === "pcb_plated_hole" && isGround(e.pcb_plated_hole_id)) {
        conductors.push({ polygon: getPlatedHolePolygon(e, e.pcb_component_id ? componentRotations.get(e.pcb_component_id) : 0), layers: e.layers, id: e.pcb_plated_hole_id, portIds: e.pcb_port_id ? [e.pcb_port_id] : [] });
      } else if (e.type === "pcb_via" && isGround(e.pcb_via_id)) {
        conductors.push({ polygon: getViaPolygon(e, e.outer_diameter, e.hole_diameter), layers: e.layers, id: e.pcb_via_id, portIds: e.pcb_port_ids ?? [] });
      }
    }
    const parent = conductors.map((_, i) => i);
    const find = (index: number): number => {
      while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; }
      return index;
    };
    const order = conductors.map((_, i) => i).sort((a, b) => conductors[a].polygon.box.xmin - conductors[b].polygon.box.xmin);
    for (let a = 0; a < order.length; a++) {
      const i = order[a], x = conductors[i];
      for (let b = a + 1; b < order.length; b++) {
        const j = order[b], y = conductors[j];
        if (y.polygon.box.xmin > x.polygon.box.xmax + 1e-7) break;
        if (find(i) === find(j) || !x.layers.some(layer => y.layers.includes(layer)) || y.polygon.box.ymin > x.polygon.box.ymax + 1e-7 || y.polygon.box.ymax < x.polygon.box.ymin - 1e-7) continue;
        // Check the smaller polygon first to keep containment checks economical.
        const [first, second] = x.polygon.vertices.length <= y.polygon.vertices.length ? [x, y] : [y, x];
        if (copperPolygonsTouch(first.polygon, second.polygon)) parent[find(j)] = find(i);
      }
    }
    const bridgeIndices = conductors.flatMap((c, i) => empty.groundBridgeViaIds.includes(c.id) ? [i] : []);
    const planeRoot = bridgeIndices.length ? find(bridgeIndices[0]) : undefined;
    for (const [i, conductor] of conductors.entries()) {
      if (conductor.isInnerPour && (planeRoot === undefined || find(i) !== planeRoot)) empty.floatingInnerPourIds.push(conductor.id);
    }
    if (empty.floatingInnerPourIds.length) failures.push("Inner GND copper contains disconnected plane islands");
    const rootsByPort = new Map<string, Set<number>>();
    for (const [i, conductor] of conductors.entries()) {
      for (const portId of conductor.portIds) {
        const roots = rootsByPort.get(portId) ?? new Set<number>(); roots.add(find(i)); rootsByPort.set(portId, roots);
      }
    }
    for (const e of circuitJson) {
      if (e.type === "pcb_port" && isGround(e.pcb_port_id) && (planeRoot === undefined || !rootsByPort.get(e.pcb_port_id)?.has(planeRoot))) empty.disconnectedGroundPortIds.push(e.pcb_port_id);
      if (e.type === "source_runtime_error") failures.push("Native source runtime error prevents plane acceptance");
    }
    if (empty.disconnectedGroundPortIds.length) failures.push("Some GND PCB ports do not physically reach the inner planes");
  } catch (error) {
    failures.push(`Plane audit failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  empty.pass = failures.length === 0;
  return empty;
}
