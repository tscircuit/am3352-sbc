import { checkPcbTraceSelfShorts } from "@tscircuit/checks";
import { circlePolygon, copperPolygonsTouch, getPlatedHolePolygon, getPourPolygon, getSmtPadPolygon, getViaPolygon } from "@tscircuit/circuit-json-util";
import type { AnyCircuitElement } from "circuit-json";
import { nativeElectricalOwnership } from "./native-electrical-ownership";

const epsilon = 1e-7;
const samePoint = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) <= epsilon;

/** Check the complete native path, including attachments and layer handoffs.
 * The native self-short checker normally covers only length-matched buses;
 * check-only singleton buses also cover ordinary two-terminal signal paths. */
export function auditNativeTracePaths(circuitJson: AnyCircuitElement[]) {
  const failures: string[] = [];
  const foreignInnerSegments: { traceId: string; pointIndex: number; layer: string }[] = [];
  const invalidTransitions: { traceId: string; pointIndex: number }[] = [];
  const nonconventionalTurns: { traceId: string; pointIndex: number; angleDegrees: number }[] = [];
  let selfShorts: ReturnType<typeof checkPcbTraceSelfShorts> = [];
  try {
    const ownership = nativeElectricalOwnership(circuitJson);
    const ground = circuitJson.filter(e => e.type === "source_net").find(e => e.name === "GND");
    if (!ground) failures.push("Missing GND source net");
    const vias = circuitJson.filter(e => e.type === "pcb_via");
    const pours = circuitJson.filter(e => e.type === "pcb_copper_pour");
    const rotations = new Map(circuitJson.filter(e => e.type === "pcb_component").map(e => [e.pcb_component_id, e.rotation]));
    const traces = circuitJson.filter(e => e.type === "pcb_trace");
    const timedSourceIds = new Set(circuitJson.flatMap(e => e.type === "source_bus" && e.max_length_skew !== undefined ? e.source_trace_ids : []));
    const timedTraceIds = new Set(traces.filter(trace => trace.source_trace_id && timedSourceIds.has(trace.source_trace_id)).map(trace => trace.pcb_trace_id));
    for (const trace of traces) {
      const isGround = !!ground && ownership.areIdsConnected(trace.pcb_trace_id, ground.source_net_id);
      let direction: { x: number; y: number } | undefined;
      for (const [i, point] of trace.route.entries()) {
        const previous = trace.route[i - 1];
        const next = trace.route[i + 1];
        let valid = true;
        if (point.route_type === "wire") {
          if (!isGround && point.layer !== "top" && point.layer !== "bottom") foreignInnerSegments.push({ traceId: trace.pcb_trace_id, pointIndex: i, layer: point.layer });
          valid = [point.x, point.y, point.width].every(Number.isFinite) && point.width > 0;
          if (previous?.route_type === "wire") {
            if (previous.layer !== point.layer) valid = false;
            else {
              const length = Math.hypot(point.x - previous.x, point.y - previous.y);
              if (length > epsilon) {
                const current = { x: (point.x - previous.x) / length, y: (point.y - previous.y) / length };
                if (direction) {
                  const angle = Math.acos(Math.max(-1, Math.min(1, direction.x * current.x + direction.y * current.y))) * 180 / Math.PI;
                  if (angle > 45.2 + 1e-7) nonconventionalTurns.push({ traceId: trace.pcb_trace_id, pointIndex: i, angleDegrees: angle });
                }
                direction = current;
              }
            }
          } else direction = undefined;
        } else if (point.route_type === "via") {
          direction = undefined;
          const matching = vias.filter(via => samePoint(via, point) && via.layers.includes(point.from_layer) && via.layers.includes(point.to_layer) &&
            ownership.areIdsConnected(via.pcb_via_id, trace.pcb_trace_id));
          const contactsGroundPour = (layer: string) => isGround && matching.length === 1 && pours.some(pour => pour.layer === layer &&
            !!pour.source_net_id && ownership.areIdsConnected(pour.source_net_id, ground!.source_net_id) &&
            copperPolygonsTouch(getViaPolygon(matching[0], matching[0].outer_diameter, matching[0].hole_diameter), getPourPolygon(pour)));
          valid = [point.x, point.y].every(Number.isFinite) && point.from_layer !== point.to_layer && matching.length === 1 &&
            (previous?.route_type === "wire" ? previous.layer === point.from_layer && samePoint(previous, point) : !previous && contactsGroundPour(point.from_layer)) &&
            (next?.route_type === "wire" ? next.layer === point.to_layer && samePoint(next, point) : !next && contactsGroundPour(point.to_layer));
        } else if (point.route_type === "through_pad") {
          direction = undefined;
          const pad = circuitJson.find(e => (e.type === "pcb_smtpad" && e.pcb_smtpad_id === point.pcb_smtpad_id) ||
            (e.type === "pcb_plated_hole" && e.pcb_plated_hole_id === point.pcb_plated_hole_id));
          valid = [point.start.x, point.start.y, point.end.x, point.end.y, point.width].every(Number.isFinite) && point.width > 0 &&
            previous?.route_type === "wire" && next?.route_type === "wire" && samePoint(previous, point.start) && samePoint(next, point.end) &&
            previous.layer === point.start_layer && next.layer === point.end_layer && !!pad && (pad.type === "pcb_smtpad" || pad.type === "pcb_plated_hole");
          if (valid && pad && (pad.type === "pcb_smtpad" || pad.type === "pcb_plated_hole")) {
            const layers = pad.type === "pcb_smtpad" ? [pad.layer] : pad.layers;
            const polygon = pad.type === "pcb_smtpad" ? getSmtPadPolygon(pad) : getPlatedHolePolygon(pad, pad.pcb_component_id ? rotations.get(pad.pcb_component_id) : 0);
            valid = layers.includes(point.start_layer) && layers.includes(point.end_layer) &&
              copperPolygonsTouch(circlePolygon(point.start, epsilon), polygon) && copperPolygonsTouch(circlePolygon(point.end, epsilon), polygon);
          }
        } else valid = false;
        if (!valid) invalidTransitions.push({ traceId: trace.pcb_trace_id, pointIndex: i });
      }
    }
    const sourceById = new Map(circuitJson.filter(e => e.type === "source_trace").map(e => [e.source_trace_id, e]));
    const powerNets = circuitJson.filter(e => e.type === "source_net").filter(e => e.is_ground || e.is_power || e.name === "GND");
    // Multi-terminal and power networks may legitimately contain branch
    // junctions. Their real pad-to-pad continuity and shorts are checked by the
    // physical graph; a branch traversal is not a length-matched simple path.
    const selfGuardSourceIds = new Set(traces.flatMap(trace => {
      const id = trace.source_trace_id;
      if (!id) return [];
      if (timedSourceIds.has(id)) return [id];
      const source = sourceById.get(id);
      if (source?.connected_source_port_ids?.length !== 2 || powerNets.some(net => ownership.areIdsConnected(trace.pcb_trace_id, net.source_net_id))) return [];
      return [id];
    }));
    const sourceTraceIds = [...selfGuardSourceIds];
    const checkBuses = sourceTraceIds.map((id, index) => ({ type: "source_bus" as const, source_bus_id: `routed_board_self_check_${index}`, source_trace_ids: [id], max_length_skew: 0 }));
    selfShorts = checkPcbTraceSelfShorts([...structuredClone(circuitJson), ...checkBuses]);
    if (foreignInnerSegments.length) failures.push("Non-GND signal copper uses a layer other than top/bottom");
    if (invalidTransitions.length) failures.push("Native paths contain invalid wires or discontinuous/unmaterialized layer transitions");
    if (nonconventionalTurns.some(turn => timedTraceIds.has(turn.traceId))) failures.push("Native timed copper contains bends sharper than the 45.2 degree routing limit");
    if (selfShorts.length) failures.push("Native routed traces shortcut their own physical copper paths");
  } catch (error) {
    failures.push(`Native path audit failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { pass: failures.length === 0, failures, foreignInnerSegments, invalidTransitions, nonconventionalTurns, selfShorts };
}
