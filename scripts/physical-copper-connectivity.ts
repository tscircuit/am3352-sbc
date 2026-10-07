import {
  circlePolygon,
  copperPolygonsTouch,
  getPlatedHolePolygon,
  getPourPolygon,
  getPrimaryId,
  getSmtPadPolygon,
  getTraceSegmentPolygon,
  getViaPolygon,
} from "@tscircuit/circuit-json-util";
import type { AnyCircuitElement } from "circuit-json";
import { nativeElectricalOwnership } from "./native-electrical-ownership";

type Polygon = ReturnType<typeof getPourPolygon>;
type Conductor = {
  id: string;
  netId: string;
  polygon: Polygon;
  layers: readonly string[];
  portIds: string[];
};

/** Logical membership chooses the owner; only copper touching on a shared
 * physical layer joins components. Route endpoint labels never anchor ports. */
export function auditPhysicalCopperConnectivity(circuitJson: AnyCircuitElement[]) {
  const failures: string[] = [];
  const unsupportedCopperIds: string[] = [];
  const missingSourcePortIds: string[] = [];
  const internalPackageLinks: { sourceComponentId: string; sourcePortIds: string[]; pcbPortIds: string[] }[] = [];
  const invalidInternalPackageLinks: { sourceComponentId: string; sourcePortIds: string[] }[] = [];
  const unanchoredPortIds: string[] = [];
  const networks: { netId: string; labels: string[]; portIds: string[]; componentCount: number }[] = [];
  const disconnectedPortGroups: { netId: string; labels: string[]; groups: string[][] }[] = [];
  const foreignCopperContacts: { firstId: string; secondId: string; layers: string[] }[] = [];
  const result = { pass: false, failures, networks, disconnectedPortGroups, unanchoredPortIds, missingSourcePortIds, unsupportedCopperIds, foreignCopperContacts, internalPackageLinks, invalidInternalPackageLinks };
  try {
    const connectivity = nativeElectricalOwnership(circuitJson);
    const ports = new Map(circuitJson.filter(e => e.type === "pcb_port").map(e => [e.pcb_port_id, e]));
    const pcbSourcePortIds = new Set([...ports.values()].map(port => port.source_port_id));
    const sourcePortIds = new Set(circuitJson.filter(e => e.type === "source_port").map(e => e.source_port_id));
    const intendedSourcePortIds = new Set([...sourcePortIds, ...circuitJson.flatMap(e => e.type === "source_trace" ? e.connected_source_port_ids ?? [] : [])]);
    for (const id of intendedSourcePortIds) if (!sourcePortIds.has(id) || !pcbSourcePortIds.has(id)) missingSourcePortIds.push(id);
    const componentRotations = new Map(circuitJson.filter(e => e.type === "pcb_component").map(e => [e.pcb_component_id, e.rotation]));
    const labels = new Map<string, Set<string>>();
    for (const e of circuitJson) {
      if (e.type !== "source_net") continue;
      const netId = connectivity.getNetConnectedToId(e.source_net_id) ?? e.source_net_id;
      const names = labels.get(netId) ?? new Set<string>(); names.add(e.name); labels.set(netId, names);
    }
    const conductors: Conductor[] = [];
    const add = (conductor: Conductor) => {
      const box = conductor.polygon.box;
      if (conductor.polygon.isEmpty() || !Number.isFinite(conductor.polygon.area()) || ![box.xmin, box.ymin, box.xmax, box.ymax].every(Number.isFinite)) {
        unsupportedCopperIds.push(conductor.id);
        return;
      }
      conductors.push(conductor);
    };
    for (const e of circuitJson) {
      if (!["pcb_trace", "pcb_smtpad", "pcb_plated_hole", "pcb_via", "pcb_copper_pour"].includes(e.type)) continue;
      const id = getPrimaryId(e);
      if (!id) { failures.push(`Copper without a native ID: ${e.type}`); continue; }
      const netId = e.type === "pcb_copper_pour" && e.source_net_id
        ? connectivity.getNetConnectedToId(e.source_net_id) ?? e.source_net_id
        : connectivity.getNetConnectedToId(id) ?? id;
      try {
        if (e.type === "pcb_trace") {
          if (e.route_thickness_mode === "interpolated") { unsupportedCopperIds.push(id); continue; }
          for (let i = 1; i < e.route.length; i++) {
            const a = e.route[i - 1], b = e.route[i];
            if (a.route_type !== "wire" || b.route_type !== "wire" || a.layer !== b.layer || Math.hypot(a.x - b.x, a.y - b.y) <= 1e-9) continue;
            if (![a.x, a.y, b.x, b.y, a.width, b.width].every(Number.isFinite) || a.width <= 0 || b.width <= 0) {
              unsupportedCopperIds.push(id); continue;
            }
            add({ id, netId, polygon: getTraceSegmentPolygon(a, b, a.width), layers: [a.layer], portIds: [] });
          }
        } else if (e.type === "pcb_smtpad") {
          const polygon = getSmtPadPolygon(e);
          const port = e.pcb_port_id ? ports.get(e.pcb_port_id) : undefined;
          const anchored = !!port && port.layers.includes(e.layer) && copperPolygonsTouch(circlePolygon(port, 1e-7), polygon);
          add({ id, netId, polygon, layers: [e.layer], portIds: anchored && e.pcb_port_id ? [e.pcb_port_id] : [] });
        } else if (e.type === "pcb_plated_hole") {
          const port = e.pcb_port_id ? ports.get(e.pcb_port_id) : undefined;
          const anchored = !!port && port.layers.some(layer => e.layers.includes(layer)) && Math.hypot(port.x - e.x, port.y - e.y) < 1e-5;
          add({ id, netId, polygon: getPlatedHolePolygon(e, e.pcb_component_id ? componentRotations.get(e.pcb_component_id) : 0), layers: e.layers, portIds: anchored && e.pcb_port_id ? [e.pcb_port_id] : [] });
        } else if (e.type === "pcb_via") {
          const portIds = (e.pcb_port_ids ?? []).filter(portId => {
            const port = ports.get(portId);
            return !!port && port.layers.some(layer => e.layers.includes(layer)) && Math.hypot(port.x - e.x, port.y - e.y) < 1e-5;
          });
          add({ id, netId, polygon: getViaPolygon(e, e.outer_diameter, e.hole_diameter), layers: e.layers, portIds });
        } else if (e.type === "pcb_copper_pour") {
          add({ id, netId, polygon: getPourPolygon(e), layers: [e.layer], portIds: [] });
        }
      } catch {
        unsupportedCopperIds.push(id);
      }
    }
    const parent = conductors.map((_, i) => i);
    const find = (i: number): number => {
      while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
      return i;
    };
    const order = conductors.map((_, i) => i).sort((a, b) => conductors[a].polygon.box.xmin - conductors[b].polygon.box.xmin);
    const foreignPairs = new Set<string>();
    for (let a = 0; a < order.length; a++) {
      const i = order[a], x = conductors[i];
      for (let b = a + 1; b < order.length; b++) {
        const j = order[b], y = conductors[j];
        if (y.polygon.box.xmin > x.polygon.box.xmax + 1e-7) break;
        const layers = x.layers.filter(layer => y.layers.includes(layer));
        if (!layers.length || (x.netId === y.netId && find(i) === find(j)) || y.polygon.box.ymin > x.polygon.box.ymax + 1e-7 || y.polygon.box.ymax < x.polygon.box.ymin - 1e-7) continue;
        const [first, second] = x.polygon.vertices.length <= y.polygon.vertices.length ? [x, y] : [y, x];
        if (!copperPolygonsTouch(first.polygon, second.polygon)) continue;
        if (x.netId === y.netId) parent[find(j)] = find(i);
        else {
          const pair = [x.id, y.id].sort().join("\u0000");
          if (!foreignPairs.has(pair)) { foreignPairs.add(pair); foreignCopperContacts.push({ firstId: x.id, secondId: y.id, layers: [...layers] }); }
        }
      }
    }
    const indicesByPort = new Map<string, number[]>();
    for (const [index, conductor] of conductors.entries()) for (const portId of conductor.portIds) {
      const indices = indicesByPort.get(portId) ?? []; indices.push(index); indicesByPort.set(portId, indices);
    }
    const nativeSourcePorts = new Map(circuitJson.filter(e => e.type === "source_port").map(e => [e.source_port_id, e]));
    const nativeComponents = new Map(circuitJson.filter(e => e.type === "pcb_component").map(e => [e.pcb_component_id, e.source_component_id]));
    const groups = circuitJson.flatMap(e => e.type === "source_component"
      ? (e.internally_connected_source_port_ids ?? []).map(sourcePortIds => ({ sourceComponentId: e.source_component_id, sourcePortIds }))
      : e.type === "source_component_internal_connection"
        ? [{ sourceComponentId: e.source_component_id, sourcePortIds: e.source_port_ids }]
        : []);
    const linkedGroups = new Set<string>();
    for (const group of groups) {
      const key = `${group.sourceComponentId}:${[...group.sourcePortIds].sort().join(",")}`;
      if (linkedGroups.has(key)) continue;
      linkedGroups.add(key);
      const memberPorts = group.sourcePortIds.map(id => [...ports.values()].filter(port => port.source_port_id === id));
      const valid = group.sourcePortIds.length >= 2 && new Set(group.sourcePortIds).size === group.sourcePortIds.length &&
        group.sourcePortIds.every(id => nativeSourcePorts.get(id)?.source_component_id === group.sourceComponentId) &&
        memberPorts.every(matches => matches.length > 0 && matches.every(port => !!port.pcb_component_id &&
          nativeComponents.get(port.pcb_component_id) === group.sourceComponentId && !!indicesByPort.get(port.pcb_port_id)?.length));
      if (!valid) { invalidInternalPackageLinks.push(group); continue; }
      const pcbPortIds = memberPorts.flat().map(port => port.pcb_port_id);
      const indices = pcbPortIds.flatMap(id => indicesByPort.get(id)!);
      for (const index of indices.slice(1)) parent[find(index)] = find(indices[0]);
      internalPackageLinks.push({ ...group, pcbPortIds });
    }
    const rootsByPort = new Map<string, Set<number>>();
    for (const [i, conductor] of conductors.entries()) {
      for (const portId of conductor.portIds) {
        const roots = rootsByPort.get(portId) ?? new Set<number>(); roots.add(find(i)); rootsByPort.set(portId, roots);
      }
    }
    const portIdsByNet = new Map<string, string[]>();
    for (const port of ports.values()) {
      const roots = rootsByPort.get(port.pcb_port_id);
      if (!roots?.size) unanchoredPortIds.push(port.pcb_port_id);
      const netId = connectivity.getNetConnectedToId(port.pcb_port_id) ?? port.pcb_port_id;
      const ids = portIdsByNet.get(netId) ?? []; ids.push(port.pcb_port_id); portIdsByNet.set(netId, ids);
    }
    for (const [netId, portIds] of portIdsByNet) {
      const roots = new Set(portIds.flatMap(id => [...rootsByPort.get(id) ?? []]));
      const names = [...labels.get(netId) ?? []];
      const groups = [...roots].map(root => portIds.filter(id => rootsByPort.get(id)?.has(root)));
      networks.push({ netId, labels: names, portIds, componentCount: roots.size });
      if (roots.size !== 1 || portIds.some(id => !rootsByPort.get(id)?.size)) disconnectedPortGroups.push({ netId, labels: names, groups });
    }
    for (const [netId, names] of labels) {
      if (!portIdsByNet.has(netId) && !conductors.some(conductor => conductor.netId === netId)) failures.push(`Declared net has no physical copper: ${[...names].join(", ")}`);
    }
    if (unsupportedCopperIds.length) failures.push("Unsupported or invalid native copper geometry");
    if (missingSourcePortIds.length) failures.push("Intended source ports lack native physical PCB ports");
    if (invalidInternalPackageLinks.length) failures.push("Declared internal package channels lack valid physical pad anchors in their native component");
    if (unanchoredPortIds.length) failures.push("Native PCB ports lack physical pad/barrel anchors");
    if (disconnectedPortGroups.length) failures.push("Intended source networks contain physically disconnected PCB ports");
    if (foreignCopperContacts.length) failures.push("Foreign copper physically touches on a shared layer");
  } catch (error) {
    failures.push(`Physical connectivity audit failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  result.pass = failures.length === 0;
  return result;
}
