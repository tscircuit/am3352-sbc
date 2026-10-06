"""Measure native PMIC-to-inductor switching copper.
Require short top-only routes and bounded narrow pin exits.
This geometry check does not replace regulator loop/thermal review.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import sys
names=['SW1','SW2','SW3']
reports=[]
for name in names:
 owner=next(k for k,v in labels.items() if v==name)
 traces=[e for e in c if e['type']=='pcb_trace' and net(e)==owner]
 vias=[e for e in c if e['type']=='pcb_via' and net(e)==owner]
 ts=[t for t in terminals if t['net']==owner and not t['selector'].startswith('.PG_VIA_')]
 lines=[];layers=set();minimum_width=math.inf;neck_length=0
 for e in traces:
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:
    layers.add(a['layer'])
    span=math.hypot(a['x']-b['x'],a['y']-b['y'])
    if span>1e-8:
     minimum_width=min(minimum_width,a['width'])
     if a['width']<.3499:neck_length+=span
    if math.hypot(a['x']-b['x'],a['y']-b['y'])>1e-8:lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
 union=unary_union(lines);graph={}
 def key(p):return tuple(round(v,7) for v in p)
 def edge(a,b):
  a=key(a);b=key(b);d=math.dist(a,b)
  graph.setdefault(a,{})[b]=d;graph.setdefault(b,{})[a]=d
 for line in union.geoms if hasattr(union,'geoms') else [union]:
  if line.is_empty:continue
  for a,b in zip(line.coords,list(line.coords)[1:]):edge(a,b)
 # Pad copper joins route endpoints to its pin center. Keep this distance in
 # the measured path instead of making the pad an artificial zero-length hop.
 for t in ts:
  center=(t['x'],t['y']);pads=[]
  for e in c:
   if e['type']!='pcb_smtpad' or e.get('pcb_port_id')!=t['port_id']:continue
   if e['shape']=='circle':g=Point(e['x'],e['y']).buffer(e['radius'],quad_segs=32)
   elif e['shape']=='rect':g=rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
   else:raise ValueError('Unsupported switching pad '+e['shape'])
   pads.append(g)
  pad=unary_union(pads)
  vertices=list(graph)
  for v in vertices:
   if pad.buffer(1e-7).covers(LineString([center,v])):edge(center,v)
  graph.setdefault(key(center),{})
 cpu=next(t for t in ts if t['selector'].startswith('.U2 >'))
 start=key((cpu['x'],cpu['y']));distances={start:0};queue=[(0,start)]
 while queue:
  d,p=heapq.heappop(queue)
  if d>distances[p]:continue
  for q,w in graph[p].items():
   if d+w<distances.get(q,math.inf):distances[q]=d+w;heapq.heappush(queue,(d+w,q))
 paths=[{'to':t['selector'],'lengthMm':distances.get(key((t['x'],t['y'])))} for t in ts if t is not cpu]
 limits=[e['max_length'] for e in c if e['type']=='source_trace' and net(e)==owner and 'max_length' in e]
 limit=6.0
 passed=all(p['lengthMm'] is not None and p['lengthMm']<=limit+1e-6 for p in paths) and not vias and layers=={'top'} and minimum_width>=.1499 and neck_length<=1.5+1e-7
 reports.append({'net':name,'from':cpu['selector'],'paths':paths,'maxLengthMm':limit,'vias':len(vias),'minimumWidthMm':minimum_width,'narrowExitLengthMm':neck_length,'maxNarrowExitLengthMm':1.5,'layers':sorted(layers),'pass':passed})
result={'pass':all(r['pass'] for r in reports),'switchingNodes':reports,'method':'Native centerline graph; pad connections include Euclidean distance. Physical connectivity is independently audited.'}
(ROOT/'output/switching-native-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
if not result['pass']:raise SystemExit(1)
