import { describe, test, expect } from "bun:test";
import type { SimpleRouteJson, Trace, Via, Wire } from "../design/vendor/bus-lanes-outer.js";
import { DDR_RULES, ddrTimingGroups, ddrPairs, ddrTraceName } from "../design/ddr-rules";
import { sharedNets } from "../design/ddr-netlist";
import { assertDdrConstraints, auditDdrGeometry } from "../design/ddr-compliance";

// These deliberately overlapping routes isolate the timing/route-structure
// audit. Physical clearance and pair coupling require the adapter's other gates.
function fixture(transitions: 0 | 2 | 4 = 2) {
  const names = Object.fromEntries(sharedNets.map((name,index) => [`c${index}`,ddrTraceName(name)]));
  const id = (name: string) => Object.keys(names).find(key => names[key] === name)!;
  const input: SimpleRouteJson = {
    layerCount: 4, minTraceWidth: 0.1, allowedLayers: ["top","bottom"],
    minViaPadDiameter: 0.3, minViaHoleDiameter: 0.15,
    obstacles: [], bounds: {minX:-40,maxX:40,minY:-40,maxY:40},
    connections: sharedNets.map((signal,index) => {
      const ca = ddrTimingGroups[2].signals.includes(signal);
      return {name:`c${index}`,pointsToConnect:[{x:0,y:0,layer:"top"},{x:ca?14:20,y:ca?14:0,layer:"top"}]};
    }),
    buses: ddrTimingGroups.map(group => ({
      busId:group.name,name:group.name,connectionNames:group.signals.map(id),
      maxLengthSkew:group.maxLengthSkew,allowedLayers:["top","bottom"],
    })),
    differentialPairs: ddrPairs.map(pair => ({connectionNames:pair.signals.map(id) as [string,string],lengthTolerance:DDR_RULES.pairSkewMm})),
  };
  const traces: Trace[] = input.connections.map(connection => {
    const [a,b] = connection.pointsToConnect, ca = b.y !== 0;
    const wire = (x: number,y: number,layer = "bottom"): Wire => ({route_type:"wire",x,y,layer,width:0.1});
    const via = (x: number,y: number,from_layer: string,to_layer: string): Via => ({
      route_type:"via",x,y,from_layer,to_layer,layers:["top","inner1","inner2","bottom"],via_diameter:0.3,via_hole_diameter:0.15,
    });
    let route: Trace["route"];
    if (!transitions) route = [wire(a.x,a.y,"top"),...(ca?[wire(0,-3.81,"top"),wire(b.x,-3.81,"top")]:[]),wire(b.x,b.y,"top")];
    else route = [
      wire(a.x,a.y,"top"),wire(0.25,0,"top"),via(0.25,0,"top","bottom"),wire(0.25,0),
      ...(transitions === 4 ? [wire(1,0),via(1,0,"bottom","top"),wire(1,0,"top"),wire(2,0,"top"),via(2,0,"top","bottom"),wire(2,0)] : []),
      ...(ca?[wire(transitions === 4?2:0.25,-3.81),wire(b.x-0.25,-3.81),wire(b.x-0.25,b.y)]:[wire(b.x-0.25,b.y)]),
      via(b.x-0.25,b.y,"bottom","top"),wire(b.x-0.25,b.y,"top"),wire(b.x,b.y,"top"),
    ];
    return {type:"pcb_trace",pcb_trace_id:`trace_${connection.name}`,connection_name:connection.name,source_trace_id:connection.name,route};
  });
  return {input,traces,names,id};
}
const wires = (trace: Trace) => trace.route.filter((point): point is Wire => point.route_type === "wire");
const vias = (trace: Trace) => trace.route.filter((point): point is Via => point.route_type === "via");
const audit = (value: ReturnType<typeof fixture>) => auditDdrGeometry(value.input,value.traces,value.names);

function extraByteLength(value: ReturnType<typeof fixture>, extraMm: number) {
  const byte = new Set(value.input.buses![0].connectionNames);
  for (const trace of value.traces.filter(trace => byte.has(trace.connection_name!))) {
    trace.route.splice(4,0,
      {route_type:"wire",x:0.25,y:-extraMm/2,width:0.1,layer:"bottom"},
      {route_type:"wire",x:0.25,y:0,width:0.1,layer:"bottom"});
  }
}

describe("DDR timing acceptance", () => {
  test("groups cover both bytes and clocked CA exactly once, leaving RESET separate", () => {
    const members = ddrTimingGroups.flatMap(group => group.signals);
    expect(ddrTimingGroups.map(group => group.signals.length)).toEqual([11,11,24]);
    expect(new Set(members).size).toBe(46);
    expect(members.includes("DDR_RESETn")).toBe(false);
    expect(DDR_RULES.signalLayers).toEqual(["top","bottom"]);
  });
  for (const transitions of [0,2,4] as const) {
    test(`accepts a synthetic timing-compliant outer fixture with ${transitions} transitions (not a copper DRC test)`, () => {
      const result = audit(fixture(transitions));
      expect(result.failures).toEqual([]);
      expect(result.pass).toBe(true);
      expect(result.groups.map(group => group.memberCount)).toEqual([11,11,24]);
      expect(result.measurements.every(measurement => measurement.viaCount === transitions)).toBe(true);
      expect(result.pairs.every(pair => pair.sameLayer)).toBe(true);
      expect(result.measurements.every(measurement => measurement.carrierLayer === (transitions?"bottom":"top"))).toBe(true);
      expect(result.fabricationReady).toBe(false);
    });
  }
  test("accepts reversed routes while still requiring both exact native pad layers", () => {
    const value = fixture();
    for (const trace of value.traces) trace.route = trace.route.toReversed().map(point => point.route_type === "via" ? {...point,from_layer:point.to_layer,to_layer:point.from_layer} : point);
    expect(audit(value).failures).toEqual([]);
  });
  test("rejects pairs-only seeding, missing DM, dropped pairs, and relaxed skew", () => {
    const value = fixture(); value.input.buses = [];
    expect(() => assertDdrConstraints(value.input,value.names)).toThrow("DDR_BYTE0");
    const missingDm = fixture(); missingDm.input.buses![0].connectionNames.splice(8,1);
    expect(() => assertDdrConstraints(missingDm.input,missingDm.names)).toThrow("DDR_BYTE0");
    const missingPair = fixture(); missingPair.input.differentialPairs!.pop();
    expect(() => assertDdrConstraints(missingPair.input,missingPair.names)).toThrow("DDR_CK_PAIR");
    const relaxedBus = fixture(); relaxedBus.input.buses![2].maxLengthSkew = DDR_RULES.addressClockSkewMm+0.01;
    expect(() => assertDdrConstraints(relaxedBus.input,relaxedBus.names)).toThrow("DDR_ADDR_CTRL_CK");
    const relaxedPair = fixture(); relaxedPair.input.differentialPairs![0].lengthTolerance = DDR_RULES.pairSkewMm+0.01;
    expect(() => assertDdrConstraints(relaxedPair.input,relaxedPair.names)).toThrow("DDR_DQS_PAIR0");
  });
  test("rejects dropped outer restrictions, nonfinite tolerances, and duplicate pair members", () => {
    const missingLayers = fixture(); delete missingLayers.input.allowedLayers;
    expect(() => assertDdrConstraints(missingLayers.input,missingLayers.names)).toThrow("outer-layer restriction");
    const innerBus = fixture(); innerBus.input.buses![0].allowedLayers = ["inner1"];
    expect(() => assertDdrConstraints(innerBus.input,innerBus.names)).toThrow("outer-layer restriction: DDR_BYTE0");
    const invalid = fixture(); invalid.input.buses![0].maxLengthSkew = NaN;
    expect(() => assertDdrConstraints(invalid.input,invalid.names)).toThrow("DDR_BYTE0");
    const duplicate = fixture(); duplicate.input.differentialPairs![0].connectionNames[1] = duplicate.input.differentialPairs![0].connectionNames[0];
    expect(() => assertDdrConstraints(duplicate.input,duplicate.names)).toThrow("DDR_DQS_PAIR0");
  });
  test("rejects perfect skew when all byte routes exceed the DQ/DM Manhattan ceiling", () => {
    const value = fixture(); extraByteLength(value,20);
    const result = audit(value);
    expect(result.groups[0].skewPass).toBe(true);
    expect(result.groups[0].absoluteLengthPass).toBe(false);
    expect(result.groups[0].maximumMm).toBe(20);
    expect(result.pass).toBe(false);
  });
  test("DQS Manhattan distance cannot raise the byte's DQ/DM length ceiling", () => {
    const value = fixture();
    for (const name of value.input.differentialPairs![0].connectionNames) {
      value.input.connections.find(connection => connection.name === name)!.pointsToConnect[1].x += 0.2;
      for (const point of value.traces.find(trace => trace.connection_name === name)!.route) if (point.x > 19) point.x += 0.2;
    }
    const result = audit(value);
    expect(result.groups[0].skewPass).toBe(true);
    expect(result.groups[0].maximumMm).toBe(20);
    expect(result.groups[0].absoluteLengthPass).toBe(false);
    expect(result.pairs[0].pass).toBe(true);
  });
  test("the 0.127 mm pair limit remains stricter than the 0.635 mm byte limit", () => {
    const value = fixture(), pair = value.input.differentialPairs![0];
    for (const name of pair.connectionNames) {
      value.input.connections.find(connection => connection.name === name)!.pointsToConnect[1].x -= 0.2;
      for (const point of value.traces.find(trace => trace.connection_name === name)!.route) if (point.x > 19) point.x -= 0.2;
    }
    value.traces.find(trace => trace.connection_name === pair.connectionNames[0])!.route.splice(4,0,
      {route_type:"wire",x:0.25,y:-0.09,width:0.1,layer:"bottom"},
      {route_type:"wire",x:0.25,y:0,width:0.1,layer:"bottom"});
    const result = audit(value);
    expect(result.groups[0].pass).toBe(true);
    expect(result.pairs[0].skewMm).toBeCloseTo(0.18,8);
    expect(result.pairs[0].pass).toBe(false);
    expect(result.pass).toBe(false);
  });
  test("retains CA Manhattan plus 7.62 mm nominal, 1.27 mm tolerance, and 63.5 mm cap", () => {
    const value = fixture();
    const result = audit(value).groups[2];
    expect(result.nominalMm).toBeCloseTo(35.62,8);
    expect(result.minimumMm).toBeCloseTo(34.35,8);
    expect(result.maximumMm).toBeCloseTo(36.89,8);
    for (const connection of value.input.connections.filter(connection => value.input.buses![2].connectionNames.includes(connection.name))) connection.pointsToConnect[1].x = 50;
    expect(audit(value).groups[2].maximumMm).toBe(63.5);
  });
  test("perfect CA skew does not excuse lengths below the TI nominal window", () => {
    const value = fixture(0), ca = new Set(value.input.buses![2].connectionNames);
    for (const trace of value.traces.filter(trace => ca.has(trace.connection_name!))) {
      trace.route = [trace.route[0],{route_type:"wire",x:14,y:0,layer:"top",width:0.1},trace.route.at(-1)!];
    }
    const result = audit(value);
    expect(result.groups[2].skewPass).toBe(true);
    expect(result.groups[2].routingPass).toBe(true);
    expect(result.groups[2].absoluteLengthPass).toBe(false);
    expect(result.pass).toBe(false);
  });
  test("rejects shifted coordinates, wrong endpoint layers, duplicate endpoints, and missing routes", () => {
    const shifted = fixture(); shifted.traces[0].route[0].x += 0.001;
    expect(audit(shifted).failures.some(failure => failure.includes("native pad coordinates and layers"))).toBe(true);
    const wrongLayer = fixture(); wires(wrongLayer.traces[0])[0].layer = "bottom";
    expect(audit(wrongLayer).pass).toBe(false);
    const repeated = fixture(); const route = repeated.traces[0].route; route[route.length-1] = {...route[0]};
    expect(audit(repeated).pass).toBe(false);
    const missing = fixture(); missing.traces.pop();
    expect(audit(missing).pass).toBe(false);
  });
  test("rejects inner copper and layer changes hidden by coincident wire vertices", () => {
    const inner = fixture(); for (const point of wires(inner.traces[0])) if (point.layer === "bottom") point.layer = "inner1";
    expect(audit(inner).failures.some(failure => failure.includes("not on TOP or BOTTOM"))).toBe(true);
    const implicit = fixture(); implicit.traces[0].route.splice(2,1);
    expect(audit(implicit).failures.some(failure => failure.includes("layer change without a via"))).toBe(true);
  });
  test("rejects displaced and wrong-layer wire/via handoffs at either side", () => {
    const displaced = fixture(); vias(displaced.traces[0])[0].x += 0.02;
    const result = audit(displaced);
    expect(result.failures.some(failure => failure.includes("wire-to-via handoff"))).toBe(true);
    expect(result.failures.some(failure => failure.includes("via-to-wire handoff"))).toBe(true);
    const wrongDeparture = fixture(); vias(wrongDeparture.traces[0])[0].from_layer = "bottom";
    expect(audit(wrongDeparture).pass).toBe(false);
    const wrongArrival = fixture(); wires(wrongArrival.traces[0])[2].layer = "top";
    expect(audit(wrongArrival).failures.some(failure => failure.includes("via-to-wire handoff"))).toBe(true);
  });
  test("requires explicit full manufactured spans and the native via land/drill dimensions", () => {
    for (const field of ["layers","via_diameter","via_hole_diameter"] as const) {
      const value = fixture(); delete vias(value.traces[0])[0][field];
      expect(audit(value).failures.some(failure => failure.includes("explicit full four-layer span"))).toBe(true);
    }
    const blind = fixture(); vias(blind.traces[0])[0].layers = ["top","bottom"];
    expect(audit(blind).pass).toBe(false);
    const wrongLand = fixture(); vias(wrongLand.traces[0])[0].via_diameter = 0.31;
    expect(audit(wrongLand).pass).toBe(false);
    const wrongHole = fixture(); vias(wrongHole.traces[0])[0].via_hole_diameter = 0.16;
    expect(audit(wrongHole).pass).toBe(false);
    const nativeDimensions = fixture(); nativeDimensions.input.minViaPadDiameter = 0.4; nativeDimensions.input.minViaHoleDiameter = 0.2;
    for (const trace of nativeDimensions.traces) for (const point of vias(trace)) { point.via_diameter = 0.4; point.via_hole_diameter = 0.2; }
    expect(audit(nativeDimensions).failures).toEqual([]);
  });
  test("requires finite positive native widths and follows bus/connection width precedence", () => {
    for (const width of [NaN,Infinity,0,-0.1,0.11,0.1+1e-8]) {
      const value = fixture(); wires(value.traces[0])[1].width = width;
      expect(audit(value).failures.some(failure => failure.includes("native signal width"))).toBe(true);
    }
    const native = fixture(); native.input.buses![0].traceWidth = 0.12;
    for (const trace of native.traces.filter(trace => native.input.buses![0].connectionNames.includes(trace.connection_name!))) for (const point of wires(trace)) point.width = 0.12;
    const reset = native.input.connections.find(connection => native.names[connection.name] === "DDR_RESETn_SIGNAL")!;
    reset.nominalTraceWidth = 0.14; reset.width = 0.16;
    for (const point of wires(native.traces.find(trace => trace.connection_name === reset.name)!)) point.width = 0.14;
    expect(audit(native).failures).toEqual([]);
  });
  test("rejects nonfinite route coordinates, even at isolated first/last vertices", () => {
    const value = fixture(); value.traces[0].route[0].x = NaN;
    expect(audit(value).failures.some(failure => failure.includes("nonfinite route coordinate"))).toBe(true);
    expect(audit(value).pass).toBe(false);
  });
  test("recovers paired carrier planes from actual geometry and validates coupled-section indices", () => {
    const value = fixture(4);
    for (const pair of value.input.differentialPairs!) for (const name of pair.connectionNames) value.traces.find(trace => trace.connection_name === name)!.coupledSection = [3,4];
    expect(audit(value).failures).toEqual([]);
    const pairName = value.input.differentialPairs![0].connectionNames[0];
    value.traces.find(trace => trace.connection_name === pairName)!.coupledSection = [0,1];
    const result = audit(value);
    expect(result.pairs[0].sameLayer).toBe(false);
    expect(result.failures.some(failure => failure.includes("invalid physical coupled carrier section"))).toBe(true);
    const mixed = fixture();
    const zero = fixture(0), first = mixed.input.differentialPairs![0].connectionNames[0];
    mixed.traces[mixed.traces.findIndex(trace => trace.connection_name === first)] = zero.traces.find(trace => trace.connection_name === first)!;
    expect(audit(mixed).pairs[0].sameLayer).toBe(false);
  });
  test("an unrouted byte cannot pass its group audit with zero lengths", () => {
    const value = fixture(), byteIds = new Set(value.input.buses![0].connectionNames);
    const result = auditDdrGeometry(value.input,value.traces.filter(trace => !byteIds.has(trace.connection_name!)),value.names);
    expect(result.groups[0].pass).toBe(false);
    expect(result.groups[0].routingPass).toBe(false);
    expect(result.groups[1].pass).toBe(true);
  });
});
