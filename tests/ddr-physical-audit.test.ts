import { expect, test } from "bun:test";
import { auditDdrPhysicalGeometry } from "../design/ddr-physical-audit";
import type { SimpleRouteJson, Trace, Via, Wire } from "../design/vendor/bus-lanes-outer.js";

const layers = ["top","inner1","inner2","bottom"];
const wire = (x: number,y: number,layer = "top"): Wire => ({route_type:"wire",x,y,layer,width:0.1});
const via = (x: number,y: number,from_layer = "top",to_layer = "bottom"): Via => ({
  route_type:"via",x,y,from_layer,to_layer,layers:[...layers],via_diameter:0.3,via_hole_diameter:0.15,
});
const trace = (name: string,route: Trace["route"]): Trace => ({
  type:"pcb_trace",pcb_trace_id:`trace_${name}`,connection_name:name,source_trace_id:name,route,
});
function fixture(bridge = false) {
  const supplied = trace("power",[
    wire(-2,-2),wire(0,-2),via(0,-2),wire(0,-2,"bottom"),wire(2,-2,"bottom"),
  ]);
  const input: SimpleRouteJson = {
    layerCount:4,allowedLayers:["top","bottom"],minTraceWidth:0.1,
    minViaPadDiameter:0.3,minViaHoleDiameter:0.15,minTraceToPadEdgeClearance:0.1,
    minViaHoleEdgeToViaHoleEdgeClearance:0.15,minBoardEdgeClearance:0.2,
    bounds:{minX:-3,maxX:3,minY:-3,maxY:3},
    connections:[{name:"signal",pointsToConnect:[wire(-2,0),wire(2,0)]}],traces:[supplied],
    obstacles:[{
      type:"rect",shape:"circle",center:{x:0,y:-2},width:0.3,height:0.3,layers:[...layers],connectedTo:["power","fixed_via"],
      circuitJsonMetadata:{pcb_via_id:"fixed_via"},
    } as SimpleRouteJson["obstacles"][number]],
  };
  const candidate = trace("signal",bridge ? [
    wire(-2,0),wire(-1.5,0),via(-1.5,0),wire(-1.5,0,"bottom"),wire(1.5,0,"bottom"),
    via(1.5,0,"bottom","top"),wire(1.5,0),wire(2,0),
  ] : [wire(-2,0),wire(2,0)]);
  const nativeCircuitJson = [{type:"pcb_via",pcb_via_id:"fixed_via",x:0,y:-2,outer_diameter:0.3,hole_diameter:0.15,layers:[...layers]}];
  return {input,traces:[candidate],supplied,nativeCircuitJson};
}

test("audits native zero-via and outer bridges against supplied copper without inventing power-via endpoints", () => {
  for (const bridge of [false,true]) {
    const value = fixture(bridge),original = structuredClone(value);
    const report = auditDdrPhysicalGeometry(value.input,value.traces,{nativeCircuitJson:value.nativeCircuitJson});
    expect(report.pass).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.fixedBaselineIssues).toEqual([]);
    expect(report.counts.candidateDrills).toBe(bridge?2:0);
    // One actual supplied barrel appears in both the fixed route and native obstacle.
    expect(report.counts.suppliedDrills).toBe(1);
    expect(report.provenance.assumedNativeViaDrillCount).toBe(0);
    expect(value).toEqual(original);
    expect(value.input.traces![0]).toBe(value.supplied);
  }
});

test("checks candidate versus fixed trace pairs even when the validator reports the fixed owner first", () => {
  const value = fixture();
  value.input.traces = [trace("power",[wire(0,-2),wire(0,2)])];
  value.input.obstacles = [];
  const report = auditDdrPhysicalGeometry(value.input,value.traces);
  expect(report.fixedBaselineIssues).toEqual([]);
  expect(report.pass).toBe(false);
  expect(report.issues.some(issue => issue.code === "different-net-trace-clearance" && issue.traceId === "trace_power" && issue.otherTraceId === "trace_signal")).toBe(true);
});

test("checks all original native pad copper and fails closed on pre-existing fixed-only errors", () => {
  const pad = {type:"rect",shape:"circle" as const,center:{x:0,y:0},width:0.4,height:0.4,layers:["top"],connectedTo:["foreign"]};
  const candidateConflict = fixture(); candidateConflict.input.obstacles.push(pad);
  const candidateReport = auditDdrPhysicalGeometry(candidateConflict.input,candidateConflict.traces);
  expect(candidateReport.pass).toBe(false);
  expect(candidateReport.issues.some(issue => issue.code === "trace-obstacle-clearance")).toBe(true);
  const baselineConflict = fixture(); baselineConflict.input.obstacles.push({...pad,center:{x:-1,y:-2}});
  const baselineReport = auditDdrPhysicalGeometry(baselineConflict.input,baselineConflict.traces);
  expect(baselineReport.pass).toBe(false);
  expect(baselineReport.fixedBaselineIssues.some(issue => issue.code === "trace-obstacle-clearance")).toBe(true);
  expect(baselineReport.issues).toEqual([]);
});

test("detects same-owner manufactured drill conflicts that copper-net DRC cannot exempt", () => {
  const value = fixture(true);
  value.input.traces = [];
  value.input.obstacles = [{...value.input.obstacles[0],center:{x:-1.225,y:0},connectedTo:["signal","fixed_via"]}];
  const report = auditDdrPhysicalGeometry(value.input,value.traces);
  expect(report.pass).toBe(false);
  expect(report.issues.some(issue => issue.code === "drill-clearance" && issue.actualMm! < issue.requiredMm!)).toBe(true);
  expect(report.provenance.assumedNativeViaDrillCount).toBe(1);
});

test("preserves distinct native via and plated-drill clearances", () => {
  const value = fixture(true);
  value.input.traces = [];
  value.input.minViaHoleEdgeToViaHoleEdgeClearance = 0.1;
  Object.assign(value.input,{minPlatedHoleDrillEdgeToDrillEdgeClearance:0.15});
  value.input.obstacles = [{...value.input.obstacles[0],center:{x:-1.24,y:0},connectedTo:["signal","fixed_via"]}];
  // The actual drill-edge gap is .11 mm: it clears the native .10 mm via rule.
  const viaReport = auditDdrPhysicalGeometry(value.input,value.traces);
  expect(viaReport.pass).toBe(true);
  expect(viaReport.provenance.drillClearanceMm).toBe(0.1);
  expect(viaReport.provenance.platedDrillClearanceMm).toBe(0.15);
  Object.assign(value.input.obstacles[0],{circuitJsonMetadata:{pcb_plated_hole_id:"fixed_plated"}});
  const capture = [{type:"pcb_plated_hole",pcb_plated_hole_id:"fixed_plated",shape:"circle",x:-1.24,y:0,hole_diameter:0.15,outer_diameter:0.3,layers:[...layers]}];
  const platedReport = auditDdrPhysicalGeometry(value.input,value.traces,{nativeCircuitJson:capture});
  expect(platedReport.pass).toBe(false);
  expect(platedReport.issues.some(issue => issue.code === "drill-clearance" && issue.requiredMm === 0.15)).toBe(true);
});

test("uses actual native plated-hole/slot drills and rejects missing capture metadata", () => {
  const value = fixture(true);
  value.input.traces = [];
  value.input.obstacles = [{
    type:"rect",center:{x:-1.5,y:0.6},width:0.4,height:0.8,layers:[...layers],connectedTo:["signal"],
    circuitJsonMetadata:{pcb_plated_hole_id:"native_slot"},
  } as SimpleRouteJson["obstacles"][number]];
  const slot = {type:"pcb_plated_hole",pcb_plated_hole_id:"native_slot",shape:"pill",x:-1.5,y:0.6,hole_width:0.2,hole_height:0.8,layers:[...layers]};
  const report = auditDdrPhysicalGeometry(value.input,value.traces,{nativeCircuitJson:[slot]});
  expect(report.provenance.conservativePlatedDrillCount).toBe(0);
  expect(report.issues.some(issue => issue.code === "drill-clearance")).toBe(true);
  const missing = auditDdrPhysicalGeometry(value.input,value.traces,{nativeCircuitJson:[]});
  expect(missing.pass).toBe(false);
  expect(missing.fixedBaselineIssues.some(issue => issue.code === "native-drill-capture-mismatch")).toBe(true);
});

test("requires captured native via pads and barrel layers to match the original obstacle field", () => {
  for (const mismatch of [{outer_diameter:0.5},{layers:["top"]}]) {
    const value = fixture();
    Object.assign(value.nativeCircuitJson[0],mismatch);
    const report = auditDdrPhysicalGeometry(value.input,value.traces,{nativeCircuitJson:value.nativeCircuitJson});
    expect(report.pass).toBe(false);
    expect(report.fixedBaselineIssues.some(issue => issue.code === "native-drill-capture-mismatch")).toBe(true);
  }
});

const selfContactRoutes = {
  crossing: [[-2,0],[0,0],[0,1],[-1,1],[-1,-1],[1,-1],[1,0],[2,0]],
  touching: [[-2,0],[0,0],[0,1],[-1,1],[-1,0.1],[1,0.1],[1,0],[2,0]],
  retracing: [[-2,0],[0,0],[0,0],[-1,0],[2,0]],
};
for (const layer of ["top","bottom"])
  for (const [kind,points] of Object.entries(selfContactRoutes))
    test(`rejects ${layer} ${kind} copper in the approval audit, including an untimed signal`, () => {
      const value = fixture();
      value.input.connections[0].pointsToConnect = [wire(-2,0,layer),wire(2,0,layer)];
      value.traces[0].route = points.map(([x,y]) => wire(x,y,layer));
      const before = structuredClone(value);
      const report = auditDdrPhysicalGeometry(value.input,value.traces);
      expect(report.pass).toBe(false);
      expect(report.issues.some(issue => issue.code === "self-short")).toBe(true);
      expect(value).toEqual(before);
    });

test("accepts smooth sampled curves and rejects a sharp joined turn hidden behind repeated points", () => {
  const smooth = fixture();
  smooth.traces[0].route = Array.from({length:13},(_,index) => wire(Math.cos(index*Math.PI/12),Math.sin(index*Math.PI/12)));
  smooth.traces[0].curvedSegments = Array.from({length:12},(_,index) => index+1);
  smooth.input.connections[0].pointsToConnect = [smooth.traces[0].route[0] as Wire,smooth.traces[0].route.at(-1)! as Wire];
  expect(auditDdrPhysicalGeometry(smooth.input,smooth.traces).pass).toBe(true);
  const sharp = fixture();
  sharp.traces[0].route = [wire(-2,0),wire(0,0),wire(0,0),wire(0,1),wire(2,1),wire(2,0)];
  expect(auditDdrPhysicalGeometry(sharp.input,sharp.traces).issues.some(issue => issue.code === "nonconventional-turn")).toBe(true);
});

test("rejects dropped routes, duplicate IDs, implicit layers, and incomplete manufactured metadata", () => {
  const missing = fixture();
  expect(auditDdrPhysicalGeometry(missing.input,[]).pass).toBe(false);
  const duplicate = fixture(); duplicate.traces.push(structuredClone(duplicate.traces[0]));
  expect(auditDdrPhysicalGeometry(duplicate.input,duplicate.traces).issues.some(issue => issue.code === "duplicate-trace-id")).toBe(true);
  const implicit = fixture(true); implicit.traces[0].route.splice(2,1);
  expect(auditDdrPhysicalGeometry(implicit.input,implicit.traces).issues.some(issue => issue.code === "disconnected-handoff")).toBe(true);
  const missingSpan = fixture(true); delete (missingSpan.traces[0].route[2] as Via).layers;
  expect(auditDdrPhysicalGeometry(missingSpan.input,missingSpan.traces).issues.some(issue => issue.code === "invalid-manufactured-via")).toBe(true);
  const wrongWidth = fixture(); (wrongWidth.traces[0].route[0] as Wire).width = 0.11;
  expect(auditDdrPhysicalGeometry(wrongWidth.input,wrongWidth.traces).issues.some(issue => issue.code === "invalid-outer-wire")).toBe(true);
});

test("keeps native board-edge clearance and rejects unsupported polygon outlines", () => {
  const edge = fixture(); edge.traces[0].route = [wire(-2,0),wire(2.9,0),wire(2,0)];
  expect(auditDdrPhysicalGeometry(edge.input,edge.traces).issues.some(issue => issue.code === "board-edge-clearance")).toBe(true);
  const polygon = fixture(); polygon.input.outline = [{x:-3,y:-3},{x:3,y:-3},{x:0,y:3}];
  expect(auditDdrPhysicalGeometry(polygon.input,polygon.traces).issues.some(issue => issue.code === "unsupported-board-outline")).toBe(true);
  const missingCorner = fixture(); missingCorner.input.outline = [{x:-3,y:-3},{x:3,y:-3},{x:3,y:3}];
  expect(auditDdrPhysicalGeometry(missingCorner.input,missingCorner.traces).issues.some(issue => issue.code === "unsupported-board-outline")).toBe(true);
  const rectangle = fixture(); rectangle.input.outline = [{x:-3,y:-3},{x:3,y:-3},{x:3,y:3},{x:-3,y:3},{x:-3,y:-3}];
  expect(auditDdrPhysicalGeometry(rectangle.input,rectangle.traces).pass).toBe(true);
});
