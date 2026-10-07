import { test, expect } from "bun:test";
import { pcb_trace_route_point_via } from "circuit-json";
import { auditNativePeripheralGeometry } from "../design/native-peripheral-geometry";

function fixture() {
  const json: any[] = [{ type: "pcb_board", num_layers: 4, allow_blind_and_buried_vias: false, center: { x: 5, y: 20 }, width: 40, height: 80, min_trace_width: .1, min_via_pad_diameter: .3, min_via_hole_diameter: .15, min_trace_to_pad_edge_clearance: .1, min_board_edge_clearance: .2 }];
  const pairs = [
    ...[0, 1].flatMap(i => ["CPU", "PORT"].map(s => ({ name: `USB${i}_${s}`, signals: [`USB${i}_DP_${s}`, `USB${i}_DM_${s}`], skew: .15, gap: .1 }))),
    ...["CK", "D0", "D1", "D2"].flatMap(c => ["TX", "PORT"].map(s => ({ name: `TMDS_${c}_${s}`, signals: [`TMDS_${c}_P_${s}`, `TMDS_${c}_N_${s}`], skew: .127, gap: .18 }))),
  ];
  pairs.forEach((pair, i) => {
    const ids = pair.signals.map((name, side) => {
      const id = `source_${name}`, y = i * 3 + side * (.1 + pair.gap), traceId = `trace_${name}`;
      const ports = [0, 10].map((x, end) => {
        const port = `port_${name}_${end}`, sourcePort = `source_${port}`, component = `package_${i}_${end}`;
        json.push({ type: "pcb_port", pcb_port_id: port, source_port_id: sourcePort, pcb_component_id: component, layers: ["top"], x, y });
        json.push({ type: "pcb_smtpad", pcb_smtpad_id: `pad_${port}`, pcb_port_id: port, pcb_component_id: component, shape: "rect", width: .1, height: .1, layer: "top", x, y });
        return sourcePort;
      });
      const wire = (x: number, layer = "top") => ({ route_type: "wire", x, y, width: .1, layer });
      const via = (x: number, from_layer: string, to_layer: string) => ({ route_type: "via", x, y, from_layer, to_layer, via_diameter: .3, via_hole_diameter: .15, layers: ["top", "inner1", "inner2", "bottom"] });
      const offset = side ? .225 : -.225;
      const route = i === 0 ? [wire(0), wire(offset), via(offset, "top", "bottom"), wire(offset, "bottom"), wire(10 + offset, "bottom"), via(10 + offset, "bottom", "top"), wire(10 + offset), wire(10)] : [wire(0), wire(10)];
      json.push({ type: "source_trace", source_trace_id: id, name, connected_source_port_ids: ports });
      json.push({ type: "pcb_trace", pcb_trace_id: traceId, source_trace_id: id, route });
      route.filter(p => p.route_type === "via").forEach((p: any, n) => json.push({ type: "pcb_via", pcb_via_id: `${traceId}_via_${n}`, pcb_trace_id: traceId, x: p.x, y: p.y, from_layer: p.from_layer, to_layer: p.to_layer, outer_diameter: .3, hole_diameter: .15, layers: p.layers }));
      return id;
    });
    json.push({ type: "source_bus", source_bus_id: `bus_${i}`, name: pair.name, source_trace_ids: ids, max_length_skew: pair.skew });
  });
  return json;
}

test("all 24 native routes and 12 original pairs pass on materialized outer copper", () => {
  const result = auditNativePeripheralGeometry(fixture());
  expect(result.failures).toEqual([]); expect(result.pass).toBe(true); expect(result.pairs).toHaveLength(12); expect(result.measurements).toHaveLength(24);
});
test("native route serialization recovers omitted solver via fields from the owned barrels", () => {
  const json = fixture();
  for (const trace of json.filter(e => e.type === "pcb_trace")) trace.route = trace.route.map((point: any) => {
    if (point.route_type !== "via") return point;
    const serialized = pcb_trace_route_point_via.parse({ ...point, outer_diameter: point.via_diameter });
    expect("layers" in serialized).toBe(false); expect("via_diameter" in serialized).toBe(false);
    return serialized;
  });
  for (const barrel of json.filter(e => e.type === "pcb_via")) { barrel.layers = ["top", "bottom", "inner1", "inner2"]; delete barrel.from_layer; delete barrel.to_layer; }
  const before = JSON.stringify(json);
  expect(auditNativePeripheralGeometry(json).pass).toBe(true);
  expect(JSON.stringify(json)).toBe(before);
});
test("a native plated USB terminal permits its bottom endpoint without an extra generated via", () => {
  const json = fixture();
  for (const [side, name] of ["USB0_DP_CPU", "USB0_DM_CPU"].entries()) {
    const trace = json.find(e => e.type === "pcb_trace" && e.source_trace_id === `source_${name}`);
    const offset = side ? .225 : -.225;
    trace.route = trace.route.slice(0, 5);
    const port = json.find(e => e.type === "pcb_port" && e.pcb_port_id === `port_${name}_1`);
    port.x = 10 + offset; port.layers = ["top", "bottom", "inner1", "inner2"];
    json.splice(json.findIndex(e => e.type === "pcb_smtpad" && e.pcb_port_id === port.pcb_port_id), 1);
    json.splice(json.findIndex(e => e.type === "pcb_via" && e.pcb_via_id === `${trace.pcb_trace_id}_via_1`), 1);
    json.push({ type: "pcb_plated_hole", pcb_plated_hole_id: `hole_${name}`, pcb_port_id: port.pcb_port_id, pcb_component_id: port.pcb_component_id, x: port.x, y: port.y, shape: "circle", outer_diameter: .1, hole_diameter: .05, layers: port.layers });
  }
  const result = auditNativePeripheralGeometry(json);
  expect(result.failures).toEqual([]); expect(result.pass).toBe(true);
  expect(result.measurements.filter(m => m.name === "USB0_DP_CPU" || m.name === "USB0_DM_CPU").map(m => m.viaCount)).toEqual([1, 1]);
});
test("missing route, forged endpoint and wrong wire plane fail", () => {
  for (const alter of [
    (j: any[]) => j.splice(j.findIndex(e => e.type === "pcb_trace"), 1),
    (j: any[]) => { j.find(e => e.type === "pcb_trace").route[0].x = 1; },
    (j: any[]) => { j.find(e => e.type === "pcb_trace").route[3].layer = "inner1"; },
  ]) { const j = fixture(); alter(j); expect(auditNativePeripheralGeometry(j).pass).toBe(false); }
});
test("native full-stack barrels must exist and retain original manufactured dimensions", () => {
  for (const alter of [
    (j: any[]) => j.splice(j.findIndex(e => e.type === "pcb_via"), 1),
    (j: any[]) => { j.find(e => e.type === "pcb_via").layers = ["top", "bottom"]; },
    (j: any[]) => { j.find(e => e.type === "pcb_via").hole_diameter = .2; },
  ]) { const j = fixture(); alter(j); expect(auditNativePeripheralGeometry(j).pass).toBe(false); }
});
test("duplicate, foreign-owned barrels and conflicting native route metadata fail", () => {
  for (const alter of [
    (j: any[]) => { j.push({ ...j.find(e => e.type === "pcb_via"), pcb_via_id: "duplicate_barrel" }); },
    (j: any[]) => { j.find(e => e.type === "pcb_via").pcb_trace_id = "foreign_trace"; },
    (j: any[]) => { j.find(e => e.type === "pcb_via").source_trace_id = "foreign_source_trace"; },
    (j: any[]) => { j.find(e => e.type === "pcb_trace").route.find((p: any) => p.route_type === "via").outer_diameter = .5; },
    (j: any[]) => { j.find(e => e.type === "pcb_trace").route.find((p: any) => p.route_type === "via").layers = ["top", "bottom"]; },
  ]) { const j = fixture(); alter(j); expect(auditNativePeripheralGeometry(j).pass).toBe(false); }
});
test("source pair omissions or relaxation and unanchored native ports fail", () => {
  for (const alter of [
    (j: any[]) => j.splice(j.findIndex(e => e.type === "source_bus"), 1),
    (j: any[]) => { j.find(e => e.type === "source_bus").max_length_skew = 1; },
    (j: any[]) => { j.find(e => e.type === "pcb_smtpad").pcb_port_id = "forged"; },
  ]) { const j = fixture(); alter(j); expect(auditNativePeripheralGeometry(j).pass).toBe(false); }
});
test("short coupled annotations cannot hide exterior separation", () => {
  const j = fixture(); const trace = j.find(e => e.type === "pcb_trace" && e.source_trace_id === "source_TMDS_CK_P_TX");
  const [a, b] = trace.route;
  trace.route = [a, { ...a, x: 2 }, { ...a, x: 2, y: a.y + 1 }, { ...a, x: 8, y: a.y + 1 }, { ...a, x: 8 }, b];
  trace.coupledSection = [0, 1];
  const result = auditNativePeripheralGeometry(j);
  expect(result.pass).toBe(false); expect(result.pairs.find(p => p.name === "TMDS_CK_TX")?.coupling?.matched).toBe(false);
});
