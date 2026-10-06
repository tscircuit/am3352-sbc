"""Partition top copper without introducing a split beneath saved inner1 signals.
This reserves reference regions only; emitted copper/connectivity still requires
independent checks after obstacles and thermal reliefs are generated.
"""
import json
from pathlib import Path
from shapely.geometry import Point,LineString,Polygon,box
from shapely.ops import unary_union,nearest_points
root=Path(__file__).resolve().parent.parent
c=json.loads((root/'output/baseline.circuit.json').read_text());m=json.loads((root/'output/copper-net-map.json').read_text());ids=m['identities'];labels=m['labels'];ddr=next(k for k,v in labels.items() if v=='DDR_1V5')
board=box(-49.6,-39.6,49.6,39.6);parts=[box(-49.6,-39.6,49.6,-12.4),box(-23,-13,-14,-1)];signals=[]
for e in c:
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner1':
    line=LineString([(a['x'],a['y']),(b['x'],b['y'])]);signals.append(line);parts.append(line.buffer(.5))
 if e['type']=='pcb_port' and ids.get(e['pcb_port_id'])==ddr:parts.append(Point(e['x'],e['y']).buffer(.7))
 if e['type']=='pcb_via' and ids.get(e['pcb_via_id'])==ddr:parts.append(Point(e['x'],e['y']).buffer(.7))
region=unary_union(parts)
while region.geom_type=='MultiPolygon':
 gs=sorted(region.geoms,key=lambda g:g.area,reverse=True);a=gs[0];b=min(gs[1:],key=lambda g:a.distance(g));p,q=nearest_points(a,b);region=unary_union([region,LineString([p,q]).buffer(.5)])
# Fill enclosed holes; the opposing supply uses only the exterior complement.
region=Polygon(region.exterior).intersection(board).simplify(.005,preserve_topology=True)
other=board.difference(region.buffer(.3,join_style=2))
def outline(p):return [{'x':round(x,6),'y':round(y,6)} for x,y in list(p.exterior.coords)[:-1]]
regions=[{'name':'TOP_DDR_REFERENCE','net':'DDR_1V5','outline':outline(region)}]
for i,p in enumerate(other.geoms if other.geom_type=='MultiPolygon' else [other]):
 if p.area>.5:
  assert len(p.interiors)==0
  regions.append({'name':f'TOP_3V3_{i}','net':'V3V3','outline':outline(p)})
minimum=min(region.boundary.distance(s) for s in signals)
assert minimum>.49,minimum
(root/'design/power-pour-regions.json').write_text(json.dumps(regions,indent=2)+'\n')
report={'topRegions':len(regions),'minimumSavedInner1SignalDistanceToSplitMm':minimum,'netClearanceMm':.3,'nativeCopperAuditRequired':True}
(root/'output/power-region-report.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
