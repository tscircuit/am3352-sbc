import type { SimpleRouteJson, Trace } from "./vendor/bus-lanes-outer.js";
import { exteriorPairSpacingReports } from "./vendor/bus-lanes-outer.js";
import { auditDdrGeometry, type SignalNames } from "./ddr-compliance";
import { DDR_RULES, ddrPairs, ddrTimingGroups, ddrTraceName } from "./ddr-rules";
import { sharedNets } from "./ddr-netlist";

/** Resolve DDR by actual source names and native pad ports, independently of
 * the routing connection order. The declared buses must survive materialization.
 * This measures geometry; the full-board audit separately checks native copper. */
export function nativeDdrGeometryInput(json: readonly Record<string,any>[]) {
  const board = json.find(element => element.type === "pcb_board");
  if (!board) throw new Error("Missing physical PCB board");
  const expected = new Set(sharedNets.map(ddrTraceName));
  const source = json.filter(element => element.type === "source_trace" && expected.has(element.name));
  const names: SignalNames = Object.fromEntries(source.map(element => [element.source_trace_id,element.name]));
  const ids = new Set(source.map(element => element.source_trace_id));
  const ports = new Map(json.filter(element => element.type === "pcb_port").map(element => [element.source_port_id,element]));
  const buses = json.filter(element => element.type === "source_bus");
  const barrels = json.filter(element=>element.type === "pcb_via");
  const traces = json.filter(element => element.type === "pcb_trace" && ids.has(element.source_trace_id))
    .map(element => ({...element,connection_name:element.source_trace_id,route:element.route.map((point:any,index:number)=> {
      if (point.route_type !== "via") return point;
      const matches = barrels.filter(via=>Math.hypot(via.x-point.x,via.y-point.y)<1e-7);
      if (matches.length !== 1) throw new Error(`DDR trace ${element.pcb_trace_id} has no unique physical barrel at its route handoff`);
      const via = matches[0];
      if (via.pcb_trace_id !== element.pcb_trace_id ||
          (via.source_trace_id !== undefined && via.source_trace_id !== element.source_trace_id))
        throw new Error(`DDR trace ${element.pcb_trace_id} does not own its native manufactured barrel`);
      if ((point.via_diameter !== undefined && point.via_diameter !== via.outer_diameter) ||
          (point.via_hole_diameter !== undefined && point.via_hole_diameter !== via.hole_diameter))
        throw new Error(`DDR trace ${element.pcb_trace_id} disagrees with its native manufactured barrel dimensions`);
      if (point.layers !== undefined && (!Array.isArray(point.layers) || !Array.isArray(via.layers) ||
          point.layers.length !== via.layers.length || point.layers.some((layer:string)=>!via.layers.includes(layer))))
        throw new Error(`DDR trace ${element.pcb_trace_id} disagrees with its native manufactured barrel span`);
      const physical = ["top","inner1","inner2","bottom"];
      const layers = Array.isArray(via.layers) && via.layers.length === 4 && physical.every(layer=>via.layers.includes(layer)) ? physical : via.layers;
      return {...point,from_layer:point.from_layer ?? element.route[index-1]?.layer,to_layer:point.to_layer ?? element.route[index+1]?.layer,
        layers,via_diameter:via.outer_diameter,via_hole_diameter:via.hole_diameter};
    })})) as Trace[];
  const width = board.min_trace_width;
  if (!Number.isFinite(width) || width <= 0) throw new Error("Missing native DDR trace width");
  const connections = source.map(element => ({name:element.source_trace_id,source_trace_id:element.source_trace_id,nominalTraceWidth:width,
    pointsToConnect:element.connected_source_port_ids.map((id:string) => {
      const pad = ports.get(id);
      if (!pad || pad.layers?.length !== 1) throw new Error(`Missing unique native SMT terminal for ${element.name}`);
      return {x:pad.x,y:pad.y,layer:pad.layers[0],pcb_port_id:pad.pcb_port_id};
    })}));
  const owner = new Map(connections.flatMap(connection => connection.pointsToConnect.map((point: any) => [point.pcb_port_id,connection.name] as const)));
  const obstacles = json.filter(element => element.type === "pcb_smtpad").map(pad => ({
    type:"rect" as const,shape:pad.shape === "circle" ? "circle" as const : undefined,
    componentId:pad.pcb_component_id,center:{x:pad.x,y:pad.y},layers:[pad.layer],
    width:pad.shape === "circle" ? pad.radius*2 : pad.width,
    height:pad.shape === "circle" ? pad.radius*2 : pad.height,
    ccwRotationDegrees:pad.ccw_rotation ?? 0,
    connectedTo:[pad.pcb_smtpad_id,pad.pcb_port_id,owner.get(pad.pcb_port_id)].filter((id):id is string=>typeof id === "string"),
    circuitJsonMetadata:{pcb_smtpad_id:pad.pcb_smtpad_id,pcb_port_id:pad.pcb_port_id},
  }));
  const declaredGroups = ddrTimingGroups.flatMap(group => {
    const bus = buses.find(element => element.name === group.name);
    return bus ? [{busId:bus.name,name:bus.name,connectionNames:bus.source_trace_ids,maxLengthSkew:bus.max_length_skew,allowedLayers:[...DDR_RULES.signalLayers],traceWidth:width}] : [];
  });
  const input: SimpleRouteJson = {
    layerCount:board.num_layers,allowedLayers:[...DDR_RULES.signalLayers],minTraceWidth:width,
    minViaPadDiameter:board.min_via_pad_diameter,minViaHoleDiameter:board.min_via_hole_diameter,
    minTraceToPadEdgeClearance:board.min_trace_to_pad_edge_clearance,
    minBoardEdgeClearance:board.min_board_edge_clearance,allowBlindAndBuriedVias:board.allow_blind_and_buried_vias,
    bounds:{minX:board.center.x-board.width/2,maxX:board.center.x+board.width/2,minY:board.center.y-board.height/2,maxY:board.center.y+board.height/2},
    obstacles,connections,buses:declaredGroups,
    traces:json.filter(element=>element.type === "pcb_trace" && !ids.has(element.source_trace_id)).map(element=>({...element,connection_name:element.source_trace_id})) as Trace[],
    differentialPairs:ddrPairs.flatMap(pair=> {
      const bus = buses.find(element=>element.name === pair.name);
      return bus ? [{connectionNames:bus.source_trace_ids as [string,string],lengthTolerance:bus.max_length_skew,traceGap:DDR_RULES.provisionalPairGapMm}] : [];
    }),
  };
  return {input,traces,names};
}

export function auditNativeDdrGeometry(json: readonly Record<string,any>[]) {
  const {input,traces,names} = nativeDdrGeometryInput(json);
  const timing = auditDdrGeometry(input,traces,names);
  const coupling = exteriorPairSpacingReports(input,traces);
  return {pass:timing.pass && coupling.length === 3 && coupling.every(pair=>pair.applicable && pair.matched),timing,coupling,input,traces,names};
}
