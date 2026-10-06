import type { SimpleRouteJson, Trace } from "./vendor/bus-lanes-outer.js";

/** Convert only already accepted native routes to core's saved-path format.
 * The selector is derived from the original native source port and component.
 * Reversing a route also reverses each manufactured layer transition. */
export function ddrTracePaths(input: SimpleRouteJson,traces: Trace[],native: readonly Record<string,any>[]) {
  return input.connections.map(connection => {
    const trace = traces.find(trace=>trace.connection_name === connection.name);
    if (!trace) throw new Error(`Missing accepted DDR route: ${connection.name}`);
    const source = native.find(element=>element.type === "source_trace" && element.source_trace_id === connection.source_trace_id);
    const pcbPort = native.find(element=>element.type === "pcb_port" && element.pcb_port_id === connection.pointsToConnect[0].pcb_port_id);
    const port = native.find(element=>element.type === "source_port" && element.source_port_id === pcbPort?.source_port_id);
    const component = native.find(element=>element.type === "source_component" && element.source_component_id === port?.source_component_id);
    if (!source || !port || !component || !source.connected_source_port_ids.includes(port.source_port_id))
      throw new Error(`Cannot bind accepted DDR route to its native selector: ${connection.name}`);
    const pad = connection.pointsToConnect[0],first = trace.route[0];
    const forward = first.route_type === "wire" && first.layer === pad.layer && Math.hypot(first.x-pad.x,first.y-pad.y) < 1e-7;
    const route = forward ? trace.route : trace.route.toReversed().map(point=>point.route_type === "via" ? {...point,from_layer:point.to_layer,to_layer:point.from_layer} : point);
    return {connection:`.${component.name} > .${port.name}`,route};
  });
}
