import { describe, test, expect } from "bun:test";
import type { SimpleRouteJson, Trace } from "@tscircuit/bus-lanes-solver";
import { DDR_RULES, ddrTimingGroups, ddrPairs, ddrTraceName } from "../design/ddr-rules";
import { sharedNets } from "../design/ddr-netlist";
import { assertDdrConstraints, auditDdrGeometry } from "../design/ddr-compliance";

function fixture() {
 const names=Object.fromEntries(sharedNets.map((n,i)=>[`c${i}`,ddrTraceName(n)]));
 const id=(name:string)=>Object.keys(names).find(k=>names[k]===name)!;
 const input:SimpleRouteJson={layerCount:4,minTraceWidth:.1,allowedLayers:["inner1","inner2"],obstacles:[],bounds:{minX:-40,maxX:40,minY:-40,maxY:40},
 connections:sharedNets.map((signal,i)=>{const ca=ddrTimingGroups[2].signals.includes(signal);return {name:`c${i}`,pointsToConnect:[{x:0,y:0,layer:"top"},{x:ca?14:20,y:ca?14:0,layer:"top"}]};}),
 buses:ddrTimingGroups.map(g=>({busId:g.name,name:g.name,connectionNames:g.signals.map(id),maxLengthSkew:g.maxLengthSkew,allowedLayers:["inner1","inner2"]})),
 differentialPairs:ddrPairs.map(p=>({connectionNames:p.signals.map(id) as [string,string],lengthTolerance:DDR_RULES.pairSkewMm})),
 };
 const traces:Trace[]=input.connections.map(c=>{
  const [a,b]=c.pointsToConnect,ca=b.y!==0, layer="inner1";
  const wire=(x:number,y:number,l=layer)=>({route_type:"wire" as const,x,y,layer:l,width:.1});
  return {connection_name:c.name,route:[wire(a.x,a.y,"top"),wire(.25,0,"top"),{route_type:"via",x:.25,y:0,from_layer:"top",to_layer:layer},wire(.25,0),
   ...(ca?[wire(.25,-3.81),wire(b.x-.25,-3.81),wire(b.x-.25,b.y)]:[wire(b.x-.25,b.y)]),
   {route_type:"via",x:b.x-.25,y:b.y,from_layer:layer,to_layer:"top"},wire(b.x-.25,b.y,"top"),wire(b.x,b.y,"top")]};
 });
 return {input,traces,names};
}

describe("DDR timing acceptance",()=>{
 test("groups cover both bytes and clocked CA exactly once, leaving RESET separate",()=>{
  const members=ddrTimingGroups.flatMap(g=>g.signals);
  expect(ddrTimingGroups.map(g=>g.signals.length)).toEqual([11,11,24]);
  expect(new Set(members).size).toBe(46);
  expect(members.includes("DDR_RESETn")).toBe(false);
 });
 test("accepts a synthetic pad-to-pad timing-compliant fixture (not a copper DRC test)",()=>{
  const f=fixture(); expect(auditDdrGeometry(f.input,f.traces,f.names).failures).toEqual([]);
 });
 test("rejects pairs-only seeding and missing DM even if the solver claims success",()=>{
  const f=fixture(); f.input.buses=[];
  expect(()=>assertDdrConstraints(f.input,f.names)).toThrow("DDR_BYTE0");
  const g=fixture();g.input.buses![0].connectionNames.splice(8,1);
  expect(()=>assertDdrConstraints(g.input,g.names)).toThrow("DDR_BYTE0");
 });
 test("rejects perfect skew when all byte routes exceed DQLM",()=>{
  const f=fixture();
  const ids=new Set(f.input.buses![0].connectionNames);
  for(const t of f.traces.filter(t=>ids.has(t.connection_name)))t.route.splice(4,0,{route_type:"wire",x:.25,y:-10,width:.1,layer:"inner1"},{route_type:"wire",x:.25,y:0,width:.1,layer:"inner1"});
  const result=auditDdrGeometry(f.input,f.traces,f.names);
  expect(result.groups[0].skewPass).toBe(true);
  expect(result.groups[0].absoluteLengthPass).toBe(false);
  expect(result.pass).toBe(false);
 });
 test("rejects endpoint, carrier layer, and missing-route errors",()=>{
  const f=fixture(); f.traces[0].route[0].x=5;
  expect(auditDdrGeometry(f.input,f.traces,f.names).pass).toBe(false);
  const g=fixture(); for(const p of g.traces[0].route)if(p.route_type==="wire"&&p.layer==="inner1")p.layer="bottom";
  expect(auditDdrGeometry(g.input,g.traces,g.names).pass).toBe(false);
  const h=fixture();h.traces.pop();expect(auditDdrGeometry(h.input,h.traces,h.names).pass).toBe(false);
 });
 test("rejects invalid tolerances and duplicate differential pair members",()=>{
  const f=fixture(); f.input.buses![0].maxLengthSkew=NaN;
  expect(()=>assertDdrConstraints(f.input,f.names)).toThrow("DDR_BYTE0");
  const g=fixture();g.input.differentialPairs![0].connectionNames[1]=g.input.differentialPairs![0].connectionNames[0];
  expect(()=>assertDdrConstraints(g.input,g.names)).toThrow("DDR_DQS_PAIR0");
 });
 test("an unrouted byte cannot pass its group audit with zero lengths",()=>{
  const f=fixture();
  const byteIds=new Set(f.input.buses![0].connectionNames);
  const audit=auditDdrGeometry(f.input,f.traces.filter(t=>!byteIds.has(t.connection_name)),f.names);
  expect(audit.groups[0].pass).toBe(false);
  expect(audit.groups[0].routingPass).toBe(false);
  expect(audit.groups[1].pass).toBe(true);
 });
});
