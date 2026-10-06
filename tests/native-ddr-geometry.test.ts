import { expect, test } from "bun:test";
import { nativeDdrGeometryInput } from "../design/native-ddr-geometry";
import { ddrTracePaths } from "../design/ddr-trace-paths";

function nativeFixture() {
  const wire = (x:number,y:number,layer="top")=>({route_type:"wire",x,y,layer,width:0.1});
  return [
    {type:"pcb_board",num_layers:4,center:{x:0,y:0},width:20,height:20,min_trace_width:0.1,min_via_pad_diameter:0.3,min_via_hole_diameter:0.15},
    {type:"source_component",source_component_id:"cpu",name:"U1"},
    {type:"source_component",source_component_id:"ram",name:"U3"},
    {type:"source_port",source_port_id:"sp0",source_component_id:"cpu",name:"G1"},
    {type:"source_port",source_port_id:"sp1",source_component_id:"ram",name:"B2"},
    {type:"source_trace",source_trace_id:"ddr0",name:"DDR_ODT",connected_source_port_ids:["sp0","sp1"]},
    {type:"pcb_port",pcb_port_id:"pp0",source_port_id:"sp0",x:0,y:0,layers:["top"]},
    {type:"pcb_port",pcb_port_id:"pp1",source_port_id:"sp1",x:5,y:0,layers:["top"]},
    {type:"pcb_trace",pcb_trace_id:"route0",source_trace_id:"ddr0",route:[wire(0,0),wire(0.3,0.3),{route_type:"via",x:0.3,y:0.3},wire(0.3,0.3,"bottom"),wire(4.7,0.3,"bottom"),{route_type:"via",x:4.7,y:0.3},wire(4.7,0.3),wire(5,0)]},
    ...[0.3,4.7].map((x,index)=>({type:"pcb_via",pcb_via_id:`barrel${index}`,pcb_trace_id:"route0",source_trace_id:"ddr0",x,y:0.3,layers:["top","inner1","inner2","bottom"],outer_diameter:0.3,hole_diameter:0.15})),
  ] as Record<string,any>[];
}

test("native route handoffs recover actual manufactured barrel dimensions and adjacent plane continuity",()=> {
  const json = nativeFixture(),result=nativeDdrGeometryInput(json);
  const vias=result.traces[0].route.filter(point=>point.route_type === "via");
  expect(vias.map(via=>[via.from_layer,via.to_layer,via.via_diameter,via.via_hole_diameter,via.layers])).toEqual([
    ["top","bottom",0.3,0.15,["top","inner1","inner2","bottom"]],
    ["bottom","top",0.3,0.15,["top","inner1","inner2","bottom"]],
  ]);
  json.find(element=>element.pcb_via_id === "barrel0")!.outer_diameter=0.4;
  expect(nativeDdrGeometryInput(json).traces[0].route[2]).toHaveProperty("via_diameter",0.4);
});

test("native audit rejects stale route barrel declarations and missing or ambiguous real barrels",()=> {
  const json = nativeFixture(),trace=json.find(element=>element.type === "pcb_trace")!;
  trace.route[2].via_diameter=0.6;
  expect(()=>nativeDdrGeometryInput(json)).toThrow("disagrees");
  delete trace.route[2].via_diameter;
  expect(()=>nativeDdrGeometryInput(json.filter(element=>element.pcb_via_id !== "barrel0"))).toThrow("no unique physical barrel");
  json.push({...json.find(element=>element.pcb_via_id === "barrel0"),pcb_via_id:"duplicate"});
  expect(()=>nativeDdrGeometryInput(json)).toThrow("no unique physical barrel");
});

test("native audit cannot substitute an unrelated barrel or contradictory physical span",()=> {
  const json=nativeFixture(),barrel=json.find(element=>element.pcb_via_id === "barrel0")!;
  barrel.pcb_trace_id="other_route";
  expect(()=>nativeDdrGeometryInput(json)).toThrow("does not own");
  barrel.pcb_trace_id="route0";
  json.find(element=>element.type === "pcb_trace")!.route[2].layers=["top","inner1"];
  expect(()=>nativeDdrGeometryInput(json)).toThrow("barrel span");
});

test("saved-path conversion resolves the native source selector and reverses physical transitions together",()=> {
  const json=nativeFixture(),{input,traces}=nativeDdrGeometryInput(json);
  const forward=ddrTracePaths(input,traces,json);
  expect(forward[0].connection).toBe(".U1 > .G1");
  const reversed=traces.map(trace=>({...trace,route:trace.route.toReversed().map(point=>point.route_type === "via"?{...point,from_layer:point.to_layer,to_layer:point.from_layer}:point)}));
  expect(ddrTracePaths(input,reversed,json)).toEqual(forward);
  expect(()=>ddrTracePaths(input,traces,json.filter(element=>element.source_component_id !== "cpu"))).toThrow("native selector");
});
