import type { SimpleRouteJson } from "@tscircuit/core"

/** Native SRJ repeats every alias of large power nets on each obstacle. Keep
 * current connection/terminal identities, prior-copper owners, and canonical
 * named-net IDs. All geometry and routing constraints remain unchanged.
 */
export function compactRoutingInput(input: SimpleRouteJson): SimpleRouteJson {
  const required = new Set<string>()
  const keep = (id: unknown) => { if (typeof id === "string" && id) required.add(id) }
  for (const connection of input.connections) {
    for (const id of [connection.name, connection.source_trace_id, connection.netConnectionName,
      connection.rootConnectionName, ...(connection.mergedConnectionNames ?? [])]) keep(id)
    for (const point of connection.pointsToConnect) {
      keep(point.pcb_port_id)
      if ("pointId" in point) keep(point.pointId)
    }
  }
  for (const trace of input.traces ?? []) {
    keep(trace.connection_name)
    keep(trace.pcb_trace_id)
    const extra = trace as unknown as { source_trace_id?: string; connectsTo?: string[] }
    keep(extra.source_trace_id)
    for (const id of extra.connectsTo ?? []) keep(id)
    for (const point of trace.route) if ("pcb_port_id" in point) keep(point.pcb_port_id)
  }
  return { ...input, obstacles: input.obstacles.map(obstacle => {
    const aliases = obstacle.connectedTo.filter(id => required.has(id)
      || id.startsWith("source_net_") || id.startsWith("connectivity_"))
    // Preserve an opaque identity for background copper without a named net.
    if (!aliases.length && obstacle.connectedTo.length) aliases.push(obstacle.connectedTo[0]!)
    return { ...obstacle, connectedTo: [...new Set(aliases)] }
  }) }
}
