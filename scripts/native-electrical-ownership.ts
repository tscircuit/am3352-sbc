import type { AnyCircuitElement } from "circuit-json";
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map";

/** Source ownership must not be rewritten by an incorrect routed endpoint.
 * Physical contacts are checked separately; port labels on wires are hints. */
export function nativeElectricalOwnership(circuitJson: AnyCircuitElement[]) {
  const ports = new Map(circuitJson.filter(e => e.type === "pcb_port").map(e => [e.pcb_port_id, e]));
  const internalGroups = new Map<string, string[][]>();
  for (const element of circuitJson) if (element.type === "source_component_internal_connection") {
    const groups = internalGroups.get(element.source_component_id) ?? [];
    groups.push(element.source_port_ids);
    internalGroups.set(element.source_component_id, groups);
  }
  const ownershipJson = circuitJson.map(element => {
    if (element.type === "source_component" && internalGroups.has(element.source_component_id)) return {
      ...element,
      internally_connected_source_port_ids: [...element.internally_connected_source_port_ids ?? [], ...internalGroups.get(element.source_component_id)!],
    };
    if (element.type === "pcb_trace") return {
      ...element,
      route: element.route.map(point => {
        if (point.route_type !== "wire") return point;
        const { start_pcb_port_id, end_pcb_port_id, ...geometry } = point;
        return geometry;
      }),
    };
    if (element.type === "pcb_via") return {
      ...element,
      pcb_port_ids: element.pcb_port_ids?.filter(id => {
        const port = ports.get(id);
        return !!port && port.layers.some(layer => element.layers.includes(layer)) &&
          Math.hypot(port.x - element.x, port.y - element.y) < 1e-5;
      }),
    };
    return element;
  });
  return getFullConnectivityMapFromCircuitJson(ownershipJson);
}
