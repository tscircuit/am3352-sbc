import { expect, test } from "bun:test";
import { checkPcbTraceSelfShorts } from "@tscircuit/checks";
import { pcb_board, pcb_copper_pour, pcb_trace, pcb_via, source_net, source_trace, type AnyCircuitElement } from "circuit-json";
import { auditNativeTracePaths } from "../scripts/native-trace-path-audit";

const wire = (x: number, y: number, layer: "top" | "bottom" | "inner1" = "top") => ({ route_type: "wire" as const, x, y, layer, width: 0.1 });
function fixture(route: unknown): AnyCircuitElement[] {
  return [
    pcb_board.parse({ type: "pcb_board", pcb_board_id: "board", width: 10, height: 8, center: { x: 0, y: 0 }, num_layers: 4 }),
    source_net.parse({ type: "source_net", source_net_id: "gnd", name: "GND", member_source_group_ids: [] }),
    source_trace.parse({ type: "source_trace", source_trace_id: "signal", connected_source_port_ids: ["first", "last"], connected_source_net_ids: [] }),
    pcb_trace.parse({ type: "pcb_trace", pcb_trace_id: "route", source_trace_id: "signal", route }),
  ];
}

test("ordinary native paths with conventional turns pass without mutation", () => {
  const json = fixture([wire(-2, 0), wire(-1, 0), wire(0, 1), wire(1, 1), wire(2, 0)]);
  const before = JSON.stringify(json);
  expect(auditNativeTracePaths(json)).toMatchObject({ pass: true, failures: [], selfShorts: [], invalidTransitions: [] });
  expect(JSON.stringify(json)).toBe(before);
});

test("ordinary right-angle bends remain legal while timed copper follows its angle contract", () => {
  const json = fixture([wire(-2, 0), wire(0, 0), wire(0, 2)]);
  expect(auditNativeTracePaths(json).pass).toBe(true);
  json.push({ type: "source_bus", source_bus_id: "timed", source_trace_ids: ["signal"], max_length_skew: 0 });
  const report = auditNativeTracePaths(json);
  expect(report.pass).toBe(false);
  expect(report.nonconventionalTurns[0]?.angleDegrees).toBeCloseTo(90, 8);
});

test("two-terminal untimed signals activate the native whole-path self-short checker", () => {
  const json = fixture([wire(-2, 0), wire(2, 0), wire(2, 1), wire(-1, 1), wire(-1, -1), wire(2, -1)]);
  expect(checkPcbTraceSelfShorts(json)).toEqual([]);
  const report = auditNativeTracePaths(json);
  expect(report.pass).toBe(false);
  expect(report.selfShorts).toHaveLength(1);
  expect(report.selfShorts[0]?.pcb_trace_id).toBe("route");
});

test("multi-terminal and supply branch junctions use the physical network gate", () => {
  const json = fixture([wire(-2, 0), wire(2, 0), wire(2, 1), wire(-1, 1), wire(-1, -1), wire(2, -1)]);
  const source = json.find(e => e.type === "source_trace")!;
  if (source.type !== "source_trace") throw new Error("Missing source");
  source.connected_source_port_ids.push("branch");
  expect(auditNativeTracePaths(json).selfShorts).toEqual([]);
  source.connected_source_port_ids.pop();
  source.connected_source_net_ids = ["gnd"];
  expect(auditNativeTracePaths(json).selfShorts).toEqual([]);
});

test("actual same-owner full-stack barrel establishes a coincident native handoff", () => {
  const json = fixture([wire(-2, 0), wire(-1, 0), { route_type: "via", x: -1, y: 0, from_layer: "top", to_layer: "bottom" }, wire(-1, 0, "bottom"), wire(0, 1, "bottom")]);
  json.push(pcb_via.parse({ type: "pcb_via", pcb_via_id: "barrel", pcb_trace_id: "route", source_trace_id: "signal", x: -1, y: 0,
    outer_diameter: 0.3, hole_diameter: 0.15, layers: ["top", "inner1", "inner2", "bottom"], from_layer: "top", to_layer: "bottom" }));
  expect(auditNativeTracePaths(json).pass).toBe(true);
  const trace = json.find(e => e.type === "pcb_trace")!;
  if (trace.type !== "pcb_trace") throw new Error("Missing route");
  const handoff = trace.route[3]!;
  if (handoff.route_type !== "wire") throw new Error("Missing wire");
  handoff.x += 0.01;
  expect(auditNativeTracePaths(json).invalidTransitions).toEqual([{ traceId: "route", pointIndex: 2 }]);
});

test("a missing or foreign manufactured barrel cannot support a transition", () => {
  const json = fixture([wire(-2, 0), wire(-1, 0), { route_type: "via", x: -1, y: 0, from_layer: "top", to_layer: "bottom" }, wire(-1, 0, "bottom"), wire(0, 1, "bottom")]);
  expect(auditNativeTracePaths(json).invalidTransitions).toHaveLength(1);
  json.push(pcb_via.parse({ type: "pcb_via", pcb_via_id: "barrel", source_net_id: "gnd", x: -1, y: 0,
    outer_diameter: 0.3, hole_diameter: 0.15, layers: ["top", "inner1", "inner2", "bottom"], from_layer: "top", to_layer: "bottom" }));
  expect(auditNativeTracePaths(json).invalidTransitions).toHaveLength(1);
});

test("a native ground fanout may terminate at its manufactured barrel into a real inner pour", () => {
  const json = fixture([wire(-2, 0), wire(-1, 0), { route_type: "via", x: -1, y: 0, from_layer: "top", to_layer: "inner1" }]);
  const source = json.find(e => e.type === "source_trace")!;
  if (source.type !== "source_trace") throw new Error("Missing source");
  source.connected_source_net_ids = ["gnd"];
  json.push(pcb_via.parse({ type: "pcb_via", pcb_via_id: "barrel", pcb_trace_id: "route", source_trace_id: "signal", x: -1, y: 0,
    outer_diameter: 0.3, hole_diameter: 0.15, layers: ["top", "inner1", "inner2", "bottom"], from_layer: "top", to_layer: "inner1" }));
  const pour = pcb_copper_pour.parse({ type: "pcb_copper_pour", pcb_copper_pour_id: "inner-ground", source_net_id: "gnd",
    layer: "inner1", shape: "rect", center: { x: 0, y: 0 }, width: 8, height: 6, covered_with_solder_mask: true });
  json.push(pour);
  expect(auditNativeTracePaths(json).pass).toBe(true);
  if (pour.shape !== "rect") throw new Error("Expected native rect pour");
  pour.center.x = 10;
  expect(auditNativeTracePaths(json).invalidTransitions).toEqual([{ traceId: "route", pointIndex: 2 }]);
});

test("inner wire points and direct layer changes fail independently of endpoint labels", () => {
  const json = fixture([wire(-2, 0), wire(-1, 0, "inner1"), wire(0, 0, "bottom")]);
  const report = auditNativeTracePaths(json);
  expect(report.pass).toBe(false);
  expect(report.foreignInnerSegments).toEqual([{ traceId: "route", pointIndex: 1, layer: "inner1" }]);
  expect(report.invalidTransitions).toHaveLength(2);
});

test("a claimed through-pad transition requires the native pad geometry", () => {
  const json = fixture([wire(-2, 0), wire(0, 0), { route_type: "through_pad", start: { x: 0, y: 0 }, end: { x: 0, y: 0 },
    start_layer: "top", end_layer: "bottom", width: 0.1, pcb_plated_hole_id: "missing" }, wire(0, 0, "bottom"), wire(1, 0, "bottom")]);
  expect(auditNativeTracePaths(json).invalidTransitions).toEqual([{ traceId: "route", pointIndex: 2 }]);
});
