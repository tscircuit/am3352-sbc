"""Connect each separate top VCC pour to the main VCC pour through bottom bridges."""
import json,math,heapq,os
from pathlib import Path
root=Path(__file__).resolve().parent.parent
scope={'__file__':str(root/'scripts/route-power-escapes.py')}
exec((root/'scripts/route-power-escapes.py').read_text().split('power={')[0].replace('output/placement.circuit.json',os.environ.get('BOARD_CIRCUIT','output/board-ddr.circuit.json')),scope)
j=scope['js'];padseg=scope['padseg'];ptseg=scope['ptseg'];segdist=scope['segdist'];netbypcb=scope['netbypcb']
net='DDR_1V5';es=json.loads((root/'design/power-escapes.json').read_text());pl=json.loads((root/'design/ram-placement.json').read_text());angle=math.radians(pl['rotation'])
ram=lambda n:n=='U3' or n.startswith('C_DDR') or n in ['R_ZQ','R_VREF_H','R_VREF_L','C_VREF','R_DDR_RST']
rv={e['via'] for e in es['traces'] if ram(e['from'].split(' > ')[0][1:])}
vs=[]
for v in es['vias']:
 x,y=v['x'],v['y']
 if v['name'] in rv:x,y=pl['x']+x*math.cos(angle)-(y+27)*math.sin(angle),pl['y']+x*math.sin(angle)+(y+27)*math.cos(angle)
 vs.append(dict(v,x=x,y=y))
physical_vias=[]
for v in j:
 if v['type']!='pcb_via':continue
 match=next((p for p in vs if math.hypot(p['x']-v['x'],p['y']-v['y'])<1e-6),None)
 physical_vias.append((v['x'],v['y'],v['outer_diameter']/2,match['net'] if match else '__DDR__'))
source={e['source_trace_id']:e for e in j if e['type']=='source_trace'};net_names=scope['nets'];segments=[]
for t in j:
 if t['type']!='pcb_trace':continue
 s=source.get(t.get('source_trace_id'),{});ids=s.get('connected_source_net_ids',[]);owner=net_names.get(ids[0]) if len(ids)==1 else '__OTHER__'
 for a,b in zip(t['route'],t['route'][1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='bottom':segments.append(((a['x'],a['y']),(b['x'],b['y']),owner))
pads=[p for p in scope['pads'] if p['layer']=='bottom' and netbypcb.get(p.get('pcb_port_id'))!=net]
def inside(p,v):
 x,y=p;hit=False
 for a,b in zip(v,v[1:]+v[:1]):
  if (a['y']>y)!=(b['y']>y) and x<(b['x']-a['x'])*(y-a['y'])/(b['y']-a['y'])+a['x']:hit=not hit
 return hit
def contains(e,p):
 b=e['brep_shape'];return inside(p,b['outer_ring']['vertices']) and not any(inside(p,h['vertices']) for h in b.get('inner_rings',[]))
def area(v):return abs(sum(a['x']*b['y']-b['x']*a['y'] for a,b in zip(v,v[1:]+v[:1]))/2)
def pour_area(e):
 b=e['brep_shape'];return area(b['outer_ring']['vertices'])-sum(area(h['vertices']) for h in b.get('inner_rings',[]))
pours=sorted([e for e in j if e['type']=='pcb_copper_pour' and e['layer']=='top' and net_names[e['source_net_id']]==net],key=pour_area,reverse=True)
main=pours[0];targets=[v for v in vs if v['net']==net and contains(main,(v['x'],v['y']))]
def clear(a,b):
 return not(any(padseg(p,a,b)<.151 for p in pads) or any(ptseg((x,y),a,b)<r+.151 for x,y,r,n in physical_vias if n!=net) or any(segdist(a,b,c,d)<.201 for c,d,n in segments if n!=net) or any(padseg(p,a,b)<.151 for p in scope['through']))
bridges=[];report=[]
for island in pours[1:]:
 candidates=[v for v in vs if v['net']==net and contains(island,(v['x'],v['y']))]
 if not candidates:raise RuntimeError('VCC island has no breakout via: '+island['pcb_copper_pour_id'])
 via=min(candidates,key=lambda v:min(math.hypot(v['x']-t['x'],v['y']-t['y']) for t in targets));a=(via['x'],via['y']);near=sorted(targets,key=lambda t:math.dist(a,(t['x'],t['y'])))
 route=None;end=None
 for t in near:
  b=(t['x'],t['y'])
  if clear(a,b):route=[a,b];end=t;break
 if route is None:
  def point(k):return (a[0]+k[0]*.2,a[1]+k[1]*.2)
  def heuristic(b):return min(math.dist(b,(t['x'],t['y'])) for t in near)
  queue=[(heuristic(a),0,(0,0))];cost={(0,0):0};parents={};visited=set()
  while queue and len(visited)<25000:
   _,g,k=heapq.heappop(queue)
   if k in visited:continue
   visited.add(k);b=point(k)
   end=next((t for t in near if math.dist(b,(t['x'],t['y']))<.41 and clear(b,(t['x'],t['y']))),None)
   if end:
    keys=[k]
    while keys[-1]!=(0,0):keys.append(parents[keys[-1]])
    points=[point(k) for k in reversed(keys)]+[(end['x'],end['y'])];route=[]
    for p in points:
     if route and math.dist(p,route[-1])<1e-8:continue
     if len(route)>1:
      c,d=route[-2:]
      if abs((d[0]-c[0])*(p[1]-d[1])-(d[1]-c[1])*(p[0]-d[0]))<1e-9:route.pop()
     route.append(p)
    break
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
    n=(k[0]+dx,k[1]+dy);d=point(n);ng=g+.2*math.hypot(dx,dy)
    if max(abs(n[0]),abs(n[1]))>60 or n in visited or ng>=cost.get(n,math.inf) or not clear(b,d):continue
    cost[n]=ng;parents[n]=k;heapq.heappush(queue,(ng+heuristic(d),ng,n))
 if route is None:raise RuntimeError('Cannot bridge VCC island '+island['pcb_copper_pour_id'])
 name='VCC_BRIDGE_'+str(len(bridges))
 bridges.append({'name':name,'fromVia':via['name'],'toVia':end['name'],'waypoints':[{'x':p[0]-a[0],'y':p[1]-a[1]} for p in route[1:-1]]})
 report.append({'name':name,'fromPour':island['pcb_copper_pour_id'],'toMainPour':main['pcb_copper_pour_id'],'fromVia':via['name'],'toVia':end['name'],'route':[{'x':p[0],'y':p[1]} for p in route]})
 segments.extend((c,d,net) for c,d in zip(route,route[1:]))
(root/'design/power-bridges.json').write_text(json.dumps(bridges,indent=2)+'\n')
(root/'output/power-plane-connectivity.json').write_text(json.dumps({'topVccPourRegions':len(pours),'bridges':report,'physicalIntegrationVerified':False},indent=2)+'\n')
print('Bridged',len(bridges),'VCC islands')
