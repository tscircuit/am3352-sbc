import type {
  GenericLocalAutorouter,
  SimpleRouteJson,
  SimplifiedPcbTrace,
} from "@tscircuit/core"

export type SavedPoint =
  | { route_type: "wire"; x: number; y: number; width: number; layer: string; width_interpolation_mode?: "linear" | "quadratic" }
  | {
      route_type: "via"
      x: number
      y: number
      from_layer: string
      to_layer: string
      layers?: readonly string[]
      via_diameter?: number
      via_hole_diameter?: number
    }

export type SavedRouteGroup = {
  name: string
  ports: readonly string[]
  netNames: readonly string[]
  traces: readonly { id: string; route: readonly SavedPoint[] }[]
  anchors?: readonly {
    selector: string
    x: number
    y: number
    layers: readonly string[]
  }[]
  /** Saved explicit vias, including stitching terminals that have no component selector. */
  viaAnchors?: readonly { x: number; y: number; layers: readonly string[] }[]
}

const tolerance = 1e-4
const fail = (message: string): never => {
  throw new Error(`Saved autorouting: ${message}`)
}

/** Physical component/pin selectors only; no generated Circuit JSON identifiers. */
function portKey(selector: string) {
  const value = selector.trim()
  const css = /^\.?([^\s.>]+)\s*>\s*(?:port)?\.([^\s.>]+)$/.exec(value)
  const dotted = /^\.?([^\s.>]+)\.([^\s.>]+)$/.exec(value)
  const match = css ?? dotted
  if (!match) return fail(`unsupported physical port selector ${selector}`)
  return `${match[1]}.${match[2]}`
}

function touchesRoute(point: { x: number; y: number; layer: string }, route: readonly SavedPoint[]) {
  for (let i = 0; i < route.length; i++) {
    const current = route[i]!
    if (current.route_type === "via") {
      const layers = current.layers ?? [current.from_layer, current.to_layer]
      if (layers.includes(point.layer) && Math.hypot(point.x - current.x, point.y - current.y) < tolerance) return true
      continue
    }
    if (current.layer !== point.layer) continue
    if (Math.hypot(point.x - current.x, point.y - current.y) < tolerance) return true
    const previous = route[i - 1]
    if (!previous || previous.route_type !== "wire" || previous.layer !== point.layer) continue
    const dx = current.x - previous.x, dy = current.y - previous.y
    const lengthSquared = dx * dx + dy * dy
    const fraction = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
      ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / lengthSquared))
    if (Math.hypot(point.x - previous.x - fraction * dx, point.y - previous.y - fraction * dy) < tolerance) return true
  }
  return false
}

function touchesAnchor(point: { x: number; y: number; layer: string }, anchor: { x: number; y: number; layers: readonly string[] }) {
  return Math.hypot(point.x - anchor.x, point.y - anchor.y) < tolerance && anchor.layers.includes(point.layer)
}

function sameConnection(first: SimpleRouteJson["connections"][number], second: SimpleRouteJson["connections"][number]) {
  const identities = (connection: SimpleRouteJson["connections"][number]) =>
    [connection.name, connection.netConnectionName, connection.rootConnectionName,
      connection.source_trace_id, ...(connection.mergedConnectionNames ?? [])]
      .filter((value): value is string => Boolean(value))
  const firstIdentities = new Set(identities(first))
  const firstPorts = new Set(first.pointsToConnect.map(point => point.pcb_port_id).filter((id): id is string => Boolean(id)))
  return identities(second).some(identity => firstIdentities.has(identity)) ||
    second.pointsToConnect.some(point => Boolean(point.pcb_port_id && firstPorts.has(point.pcb_port_id)))
}

/** Create once per board render, and share this same function across its phases.
 * Replays only saved autorouter output; never creates coordinates or runs a solver.
 * Routes remain separate so junctions and branches retain their original copper.
 */
export function savedAutorouter(groups: readonly SavedRouteGroup[]) {
  const byPort = new Map<string, number>()
  const emitted = new Map<number, string[]>()
  const emittedOwners = new Map<number, SimpleRouteJson["connections"][number]>()
  const names = new Set<string>()
  const ids = new Set<string>()
  for (const [index, group] of groups.entries()) {
    if (!group.name || names.has(group.name) || !group.ports.length || !group.traces.length) fail("groups require unique names, symbolic ports, and saved routes")
    names.add(group.name)
    for (const selector of group.ports) {
      const key = portKey(selector), previous = byPort.get(key)
      if (previous !== undefined && previous !== index) fail(`port ${key} occurs in multiple saved groups`)
      byPort.set(key, index)
    }
    for (const trace of group.traces) {
      const id = `${index}:${trace.id}`
      if (!trace.id || ids.has(id) || trace.route.length < 2) fail(`invalid or duplicate saved route in ${group.name}`)
      ids.add(id)
      for (const point of trace.route) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) fail(`nonfinite saved coordinate in ${group.name}`)
        if (point.route_type === "wire") {
          if (!Number.isFinite(point.width) || point.width <= 0 || !point.layer) fail(`invalid saved wire in ${group.name}`)
        } else if (point.route_type === "via") {
          if (!point.from_layer || !point.to_layer || [point.via_diameter, point.via_hole_diameter].some(value => value !== undefined && (!Number.isFinite(value) || value <= 0))) fail(`invalid saved via in ${group.name}`)
        } else fail(`saved routes must contain wire/via points in ${group.name}`)
      }
    }
  }

  return async (input: SimpleRouteJson): Promise<GenericLocalAutorouter> => {
    if (!Number.isSafeInteger(input.layerCount) || input.layerCount < 1) fail("invalid current board layer count")
    const owners = new Map<number, SimpleRouteJson["connections"][number]>()
    const layers = input.layerCount === 1 ? ["top"] : ["top", ...Array.from({ length: input.layerCount - 2 }, (_, i) => `inner${i + 1}`), "bottom"]
    for (const connection of input.connections) {
      const groupIndices = new Set<number>()
      const anonymous = [] as typeof connection.pointsToConnect
      if (!connection.pointsToConnect.length) fail(`connection ${connection.name} has no physical terminals`)
      for (const point of connection.pointsToConnect) {
        if (!point.port_selector) { anonymous.push(point); continue }
        const key = portKey(point.port_selector!), index = byPort.get(key)
        if (index === undefined) fail(`no saved group covers ${key} in ${connection.name}`)
        groupIndices.add(index!)
        const group = groups[index!]!
        if (group.anchors?.length) {
          const anchors = group.anchors.filter(anchor => portKey(anchor.selector) === key)
          if (!anchors.length || !anchors.some(anchor => Math.hypot(point.x - anchor.x, point.y - anchor.y) < tolerance && anchor.layers.includes(point.layer))) fail(`placement/layer changed for ${key} in ${group.name}`)
        } else if (!group.traces.some(trace => touchesRoute(point, trace.route))) fail(`saved copper does not reach ${key} at its current placement/layer`)
      }
      if (!groupIndices.size) {
        // No port identity is guessed from nearby copper. Only an exact saved physical anchor can identify an anonymous-only connection.
        let candidates = new Set(groups.map((_, index) => index))
        for (const point of anonymous) candidates = new Set([...candidates].filter(index =>
          [...(groups[index]!.anchors ?? []), ...(groups[index]!.viaAnchors ?? [])].some(anchor => touchesAnchor(point, anchor))))
        for (const index of candidates) groupIndices.add(index)
      }
      if (groupIndices.size !== 1) fail(`connection ${connection.name} joins incompatible saved groups: ${[...groupIndices].map(index => groups[index]!.name).join(", ")}; selectors=${connection.pointsToConnect.map(point => point.port_selector ?? "anonymous").join(", ")}`)
      const index = [...groupIndices][0]!
      const group = groups[index]!
      for (const point of anonymous) {
        if (![...(group.anchors ?? []), ...(group.viaAnchors ?? [])].some(anchor => touchesAnchor(point, anchor)) &&
          !group.traces.some(trace => touchesRoute(point, trace.route))) fail(`anonymous terminal in ${connection.name} lacks a saved physical anchor/copper in ${group.name}`)
      }
      const existing = owners.get(index)
      if (existing && !sameConnection(existing, connection)) fail(`current connections ${existing.name} and ${connection.name} split saved group ${group.name}`)
      if (!existing) owners.set(index, connection)
    }
    for (const index of owners.keys()) {
      const previous = emitted.get(index)
      if (previous && !sameConnection(emittedOwners.get(index)!, owners.get(index)!)) {
        fail(`later phase changes the electrical identity of ${groups[index]!.name}`)
      }
      if (previous && !previous.every(id => input.traces?.some(trace => trace.pcb_trace_id === id))) {
        fail(`previously replayed ${groups[index]!.name} is absent; create a fresh adapter per board render`)
      }
    }
    const pending = [...owners.keys()].filter(index => !emitted.has(index))
    function currentSourceTraceId(owner: SimpleRouteJson["connections"][number]) {
      if (owner.source_trace_id) return owner.source_trace_id
      const terminalIds = new Set(owner.pointsToConnect.map(point => point.pcb_port_id).filter(Boolean))
      const identities = new Set([owner.name, owner.netConnectionName, owner.rootConnectionName, ...(owner.mergedConnectionNames ?? [])].filter(Boolean))
      // A named-net SRJ connection has no source_trace_id. Its current terminal
      // obstacles carry the authoritative net membership and current trace IDs.
      for (const obstacle of input.obstacles) {
        if (!terminalIds.has(obstacle.circuitJsonMetadata?.pcb_port_id)) continue
        if (!obstacle.connectedTo.some(id => identities.has(id))) continue
        const sourceTraceId = obstacle.connectedTo.find(id => id.startsWith("source_trace_"))
        if (sourceTraceId) return sourceTraceId
      }
      return fail(`current connection ${owner.name} has no authoritative source trace`)
    }
    const traces: SimplifiedPcbTrace[] = pending.flatMap(index => {
      const owner = owners.get(index)!, group = groups[index]!
      const sourceTraceId = currentSourceTraceId(owner)
      return group.traces.map(trace => {
        const route = trace.route.map(point => {
          const usedLayers = point.route_type === "wire" ? [point.layer] : [...(point.layers ?? []), point.from_layer, point.to_layer]
          if (usedLayers.some(layer => !layers.includes(layer))) fail(`saved copper in ${group.name} uses an unavailable board layer`)
          // Whitelist geometric fields: old port, source, group, and pour IDs never enter the new circuit.
          if (point.route_type === "wire") return { route_type: "wire" as const, x: point.x, y: point.y, width: point.width, layer: point.layer,
            ...(point.width_interpolation_mode ? { width_interpolation_mode: point.width_interpolation_mode } : {}) }
          return { route_type: "via" as const, x: point.x, y: point.y, from_layer: point.from_layer, to_layer: point.to_layer,
            ...(point.layers ? { layers: [...point.layers] } : {}),
            ...(point.via_diameter !== undefined ? { via_diameter: point.via_diameter } : {}),
            ...(point.via_hole_diameter !== undefined ? { via_hole_diameter: point.via_hole_diameter } : {}) }
        })
        return { type: "pcb_trace" as const, pcb_trace_id: `saved_${index}_${trace.id}`, connection_name: owner.name,
          // Bind every branch to a real current source trace on this electrical net.
          source_trace_id: sourceTraceId, route }
      })
    })
    const handlers: Record<string, ((event: any) => void)[]> = { complete: [], error: [], progress: [] }
    const autorouter: GenericLocalAutorouter = {
      input, isRouting: false,
      on(event, handler) { handlers[event]!.push(handler) },
      start() {
        if (autorouter.isRouting) return
        autorouter.isRouting = true
        queueMicrotask(() => {
          if (!autorouter.isRouting) return
          for (const index of pending) {
            emitted.set(index, groups[index]!.traces.map(trace => `saved_${index}_${trace.id}`))
            const owner = owners.get(index)!
            emittedOwners.set(index, { ...owner, pointsToConnect: [...owner.pointsToConnect] })
          }
          autorouter.isRouting = false
          for (const handler of handlers.complete!) handler({ type: "complete", traces })
        })
      },
      stop() { autorouter.isRouting = false },
      solveSync() { return fail("this adapter requires the standard asynchronous phase renderer") },
    }
    return autorouter
  }
}

export const createSavedAutorouter = savedAutorouter
