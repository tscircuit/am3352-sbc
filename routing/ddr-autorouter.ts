import { BusLanesPipelineSolver } from "@tscircuit/bus-lanes-solver"
import type { GenericLocalAutorouter, SimpleRouteJson, SimplifiedPcbTrace } from "@tscircuit/core"
import { compactRoutingInput } from "./compact-routing-input"

/** Official bus solver, including native-surface recovery for blocked dogbones.
 * Only the solver creates copper. Timing, coupling, placement, and clearance
 * constraints are passed through; partial output is never accepted.
 */
export async function ddrAutorouter(input: SimpleRouteJson): Promise<GenericLocalAutorouter> {
  const terminals = input.connections.flatMap(connection => connection.pointsToConnect)
  const margin = 12
  const bounds = {
    minX: Math.max(input.bounds.minX, Math.min(...terminals.map(point => point.x)) - margin),
    maxX: Math.min(input.bounds.maxX, Math.max(...terminals.map(point => point.x)) + margin),
    minY: Math.max(input.bounds.minY, Math.min(...terminals.map(point => point.y)) - margin),
    maxY: Math.min(input.bounds.maxY, Math.max(...terminals.map(point => point.y)) + margin),
  }
  // Restrict the DDR search to its package field plus room for matching. Every
  // physical obstacle remains present; this changes the search region only.
  const compact = { ...compactRoutingInput(input), bounds, allowedLayers: ["top", "bottom"] }
  // Each cohort is a complete timing bus, including its differential pairs.
  // Committed native output becomes immutable copper for the next cohort.
  const cohorts = [...(input.buses ?? [])].sort((a, b) => b.connectionNames.length - a.connectionNames.length)
    .map(bus => new Set(bus.connectionNames))
  const connectionNames = new Set(input.connections.map(connection => connection.name))
  const assigned = new Set<string>()
  for (const names of cohorts) for (const name of names) {
    if (!connectionNames.has(name) || assigned.has(name)) throw new Error(`DDR timing buses must partition active connections: ${name}`)
    assigned.add(name)
  }
  const covered = new Set(cohorts.flatMap(names => [...names]))
  const remaining = input.connections.filter(connection => !covered.has(connection.name))
  if (remaining.length) cohorts.push(new Set(remaining.map(connection => connection.name)))
  if (!cohorts.length) throw new Error("DDR routing input contains no connections")
  for (const pair of input.differentialPairs ?? []) {
    if (!cohorts.some(names => pair.connectionNames.every(name => names.has(name))))
      throw new Error("A DDR differential pair must stay within one complete timing cohort")
  }
  let cohortIndex = 0
  const completed: SimplifiedPcbTrace[] = []
  const makeSolver = () => {
    const names = cohorts[cohortIndex]!
    const childInput = {
      ...compact,
      connections: compact.connections.filter(connection => names.has(connection.name)),
      buses: compact.buses?.filter(bus => bus.connectionNames.every(name => names.has(name))),
      differentialPairs: compact.differentialPairs?.filter(pair => pair.connectionNames.every(name => names.has(name))),
      traces: [...(compact.traces ?? []), ...completed],
    }
    return new BusLanesPipelineSolver(
      childInput as unknown as ConstructorParameters<typeof BusLanesPipelineSolver>[0],
      { goal: "matched" },
    )
  }
  let solver = makeSolver()
  const handlers: Record<string, Array<(event: any) => void>> = { complete: [], error: [], progress: [] }
  let scheduled: ReturnType<typeof setTimeout> | undefined
  let beganAt = 0
  let progressAt = 0
  const emit = (name: string, event: unknown) => { for (const handler of handlers[name]!) handler(event) }
  const autorouter: GenericLocalAutorouter = {
    input, isRouting: false,
    on(event, handler) { handlers[event]!.push(handler) },
    start() {
      if (autorouter.isRouting) return
      autorouter.isRouting = true
      beganAt = Date.now()
      const tick = () => {
        if (!autorouter.isRouting) return
        try {
          for (let i = 0; i < 100 && !solver.solved && !solver.failed && Date.now() - beganAt < 200_000; i++) solver.step()
          // This method accepts only a complete internally validated matched
          // snapshot. It clears partial output when no such snapshot exists.
          if (!solver.solved && !solver.failed && Date.now() - beganAt >= 200_000) solver.tryFinalAcceptance()
          if (solver.solved) {
            completed.push(...solver.traces as unknown as SimplifiedPcbTrace[])
            cohortIndex++
            if (cohortIndex < cohorts.length) {
              if (Date.now() - beganAt >= 200_000) throw new Error("DDR routing budget ended before every timing cohort was complete")
              solver = makeSolver()
              scheduled = setTimeout(tick, 0)
              return
            }
            autorouter.isRouting = false
            emit("complete", { type: "complete", traces: completed })
            return
          }
          if (solver.failed || Date.now() - beganAt >= 200_000) {
            autorouter.isRouting = false
            emit("error", { type: "error", error: new Error(solver.error ?? "DDR autorouting ended without a complete validated matched solution") })
            return
          }
          if (Date.now() - progressAt >= 1_000) {
            progressAt = Date.now()
            // Bun can retain discarded search frontiers until after the worker
            // budget. Release them without affecting solver state or output.
            const runtime = globalThis as unknown as { Bun?: { gc: (force: boolean) => void } }
            runtime.Bun?.gc(true)
            emit("progress", { type: "progress", steps: solver.iterations, progress: (cohortIndex + (solver.progress ?? 0)) / cohorts.length, phase: solver.phase })
            if (solver.iterations % 1000 === 0) console.log(JSON.stringify({ solver: "DDR bus lanes", cohort: cohortIndex, phase: solver.phase, iterations: solver.iterations, seconds: (Date.now() - beganAt) / 1000 }))
          }
          scheduled = setTimeout(tick, 0)
        } catch (error) {
          autorouter.isRouting = false
          emit("error", { type: "error", error: error instanceof Error ? error : new Error(String(error)) })
        }
      }
      scheduled = setTimeout(tick, 0)
    },
    stop() { autorouter.isRouting = false; if (scheduled) clearTimeout(scheduled) },
    solveSync() { throw new Error("DDR routing uses the asynchronous native phase renderer") },
  }
  return autorouter
}
