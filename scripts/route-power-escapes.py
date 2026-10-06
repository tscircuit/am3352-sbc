"""Generate deterministic, net-aware power/GND escapes from placement.circuit.json.

BGA escapes reserve via sites first. Bottom decouplers must subsequently be
placed clear of those sites; audit:power is mandatory and rejects collisions.
The top fill is DDR_1V5, bottom is GND. Other rails remain isolated escape nets.
This generator does not claim power-distribution or signal-integrity signoff.
"""
import json, math, heapq
from pathlib import Path
root=Path(__file__).resolve().parent.parent;js=json.loads((root/'output/placement.circuit.json').read_text())
nets={e['source_net_id']:e['name'] for e in js if e['type']=='source_net'}
sc={e['source_component_id']:e['name'] for e in js if e['type']=='source_component'}
sp={e['source_port_id']:e for e in js if e['type']=='source_port'}
pp={e['source_port_id']:e for e in js if e['type']=='pcb_port'}
traces={e['source_trace_id']:e for e in js if e['type']=='source_trace'}
netbyport={}
for t in traces.values():
 if len(t['connected_source_net_ids'])==1:
  for pid in t['connected_source_port_ids']:netbyport[pid]=nets[t['connected_source_net_ids'][0]]
netbypcb={p['pcb_port_id']:netbyport.get(pid) for pid,p in pp.items()}
pads=[e for e in js if e['type']=='pcb_smtpad']
through=[e for e in js if e['type'] in ['pcb_plated_hole','pcb_hole']]
def ptseg(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];q=dx*dx+dy*dy;t=0 if not q else max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/q));return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
def segdist(a,b,c,d):
 def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 if cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0:return 0
 return min(ptseg(a,c,d),ptseg(b,c,d),ptseg(c,a,b),ptseg(d,a,b))
def geom(p):
 if p.get('points'):
  xs=[q['x'] for q in p['points']];ys=[q['y'] for q in p['points']];return (min(xs)+max(xs))/2,(min(ys)+max(ys))/2,(max(xs)-min(xs))/2,(max(ys)-min(ys))/2
 x=p.get('x',p.get('center',{}).get('x'));y=p.get('y',p.get('center',{}).get('y'))
 if p.get('shape')=='circle':return x,y,p.get('radius',p.get('outer_diameter',p.get('hole_diameter',0))/2),None
 w=p.get('width',p.get('outer_width',1))/2;h=p.get('height',p.get('outer_height',1))/2
 if p.get('shape','').startswith('rotated'):
  t=math.radians(p.get('ccw_rotation',0));w,h=abs(math.cos(t))*w+abs(math.sin(t))*h,abs(math.sin(t))*w+abs(math.cos(t))*h
 return x,y,w,h
def padpt(p,q):
 x,y,w,h=geom(p)
 return math.hypot(q[0]-x,q[1]-y)-w if h is None else math.hypot(max(0,abs(q[0]-x)-w),max(0,abs(q[1]-y)-h))
def padseg(p,a,b):
 x,y,w,h=geom(p)
 if h is None:return ptseg((x,y),a,b)-w
 if min(padpt(p,a),padpt(p,b))<=0:return 0
 v=[(x-w,y-h),(x+w,y-h),(x+w,y+h),(x-w,y+h)]
 return min(segdist(a,b,c,d) for c,d in zip(v,v[1:]+v[:1]))
power={'DDR_1V5','V3V3','VDD_CORE','VDD_MPU','V1V8','RTC_1V8','A3V3','SYS_5V','VIN_5V'}
placement=json.loads((root/'design/ram-placement.json').read_text())
seed_path=root/'design/power-via-seeds.json';seed_sites=json.loads(seed_path.read_text()) if seed_path.exists() else {}
def seed_world(v):
 a=math.radians(placement['rotation']);return (placement['x']+v['x']*math.cos(a)-(v['y']+27)*math.sin(a),placement['y']+v['x']*math.sin(a)+(v['y']+27)*math.cos(a))
selected=[]
for t in traces.values():
 if len(t['connected_source_port_ids'])!=1 or len(t['connected_source_net_ids'])!=1:continue
 pid=t['connected_source_port_ids'][0];p=pp[pid];net=nets[t['connected_source_net_ids'][0]];ref=sc[sp[pid]['source_component_id']]
 if (net=='GND' and p['layers']==['top']) or (net in power and p['layers']==['bottom']) or (net in power and ref in ['U1','U3']):selected.append((t,p,net,ref))
# Solve BGA and bottom decoupler escapes first, then peripheral grounds.
selected.sort(key=lambda v:(0 if v[3] in ['U1','U3'] else 1 if v[1]['layers']==['bottom'] else 2))
# Reserve accepted DDR copper before choosing power/GND escape sites.
ddr_paths=json.loads((root/'design/ddr-routes.json').read_text())
peripheral_file=root/'design/peripheral-routes.json'
if peripheral_file.exists():ddr_paths+=json.loads(peripheral_file.read_text())
reserved_vias=[];reserved_segments=[]
for path in ddr_paths:
 route=path['route']
 for q in route:
  if q['route_type']=='via':reserved_vias.append((q['x'],q['y'],q.get('via_diameter',.3)/2))
 for a,b in zip(route,route[1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:
   reserved_segments.append(((a['x'],a['y']),(b['x'],b['y']),a['layer'],max(a.get('width',.1),b.get('width',.1))/2))
via=[];segments=[];paths=[];miss=[];report=[];direct_escapes=[];direct_report=[]
for t,p,net,ref in selected:
 a=(p['x'],p['y']);layer=p['layers'][0];end='bottom' if layer=='top' else 'top'
 nearby=[q for q in pads if abs(geom(q)[0]-a[0])<6 and abs(geom(q)[1]-a[1])<6 and not(ref in ['U1','U3'] and q['layer']=='bottom')] 
 candidates=[(a[0]+dx,a[1]+dy) for r in [.4,.6,.8,1,1.2,1.6,2,2.4,2.8,3.2,3.6,4] for dx,dy in [(r,r),(r,-r),(-r,r),(-r,-r),(r,0),(-r,0),(0,r),(0,-r)]]
 candidates=[(x,y) for x,y,n in via if n==net and math.hypot(x-a[0],y-a[1])<4.01]+candidates
 candidates.sort(key=lambda b:math.dist(a,b))
 if t["name"] in seed_sites:candidates.insert(0,seed_world(seed_sites[t["name"]]))
 found=None;route_points=None
 for b in candidates:
  if any(padpt(q,b)<.25-1e-7 for q in nearby if not(b==a and netbypcb.get(q.get("pcb_port_id"))==net)):continue
  if any(padpt(q,b)<.35 for q in through):continue
  if any(math.dist(b,(x,y))<.4-1e-7 for x,y,n in via if (x,y)!=b or n!=net):continue
  if any(math.dist(b,(x,y))<.15+r+.1-1e-7 or ptseg((x,y),a,b)<.05+r+.1-1e-7 for x,y,r in reserved_vias):continue
  if any(ptseg(b,c,d)<.15+w+.1-1e-7 for c,d,l,w in reserved_segments):continue
  if any(segdist(a,b,c,d)<.05+w+.1-1e-7 for c,d,l,w in reserved_segments if l==layer):continue
  if any(padseg(q,a,b)<.15-1e-7 for q in nearby if q['layer']==layer and netbypcb.get(q.get('pcb_port_id'))!=net):continue
  if any(ptseg((x,y),a,b)<.3-1e-7 for x,y,n in via if n!=net):continue
  if any(segdist(a,b,c,d)<.2-1e-7 for c,d,l,n in segments if l==layer and n!=net):continue
  if any(ptseg(b,c,d)<.3-1e-7 for c,d,l,n in segments if n!=net):continue
  found=b;break
 if found is None:
  # A surface dogleg can reach a free via site even when every straight
  # dogbone crosses reserved DDR copper on an inner layer.
  search_pads=[q for q in pads if abs(geom(q)[0]-a[0])<10 and abs(geom(q)[1]-a[1])<10 and not(ref in ['U1','U3'] and q['layer']=='bottom')]
  own_layer=[q for q in search_pads if q['layer']==layer and netbypcb.get(q.get('pcb_port_id'))!=net]
  def clear_edge(c,d):
   return not(any(padseg(q,c,d)<.15-1e-7 for q in own_layer) or any(padseg(q,c,d)<.15 for q in through) or any(ptseg((x,y),c,d)<.3-1e-7 for x,y,n in via if n!=net) or any(ptseg((x,y),c,d)<.05+r+.1-1e-7 for x,y,r in reserved_vias) or any(segdist(c,d,C,D)<.2-1e-7 for C,D,l,n in segments if l==layer and n!=net) or any(segdist(c,d,C,D)<.05+w+.1-1e-7 for C,D,l,w in reserved_segments if l==layer))
  def clear_site(b):
   return not(any(padpt(q,b)<.25-1e-7 for q in search_pads) or any(padpt(q,b)<.35 for q in through) or any(math.dist(b,(x,y))<.4-1e-7 for x,y,n in via) or any(math.dist(b,(x,y))<.15+r+.1-1e-7 for x,y,r in reserved_vias) or any(ptseg(b,c,d)<.3-1e-7 for c,d,l,n in segments if n!=net) or any(ptseg(b,c,d)<.15+w+.1-1e-7 for c,d,l,w in reserved_segments))
  def point(k):return (a[0]+k[0]*.2,a[1]+k[1]*.2)
  queue=[(0,(0,0))];cost={(0,0):0};parent={};visited=set()
  while queue and len(visited)<5000:
   distance,k=heapq.heappop(queue)
   if k in visited:continue
   visited.add(k);b=point(k)
   reuse=next(((x,y) for x,y,n in via if n==net and math.dist(b,(x,y))<.41 and clear_edge(b,(x,y))),None)
   if k!=(0,0) and (reuse is not None or clear_site(b)):
    found=reuse or b;keys=[k]
    while keys[-1]!=(0,0):keys.append(parent[keys[-1]])
    points=[point(k) for k in reversed(keys)];route_points=[]
    if reuse is not None and math.dist(points[-1],reuse)>1e-8:points.append(reuse)
    for q in points:
     if len(route_points)>1:
      c,d=route_points[-2:]
      if abs((d[0]-c[0])*(q[1]-d[1])-(d[1]-c[1])*(q[0]-d[0]))<1e-9:route_points.pop()
     route_points.append(q)
    break
   for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
    nxt=(k[0]+dx,k[1]+dy)
    if max(abs(nxt[0]),abs(nxt[1]))>40 or nxt in visited:continue
    d=point(nxt);value=distance+math.hypot(dx,dy)*.2
    if value>=cost.get(nxt,math.inf) or not clear_edge(b,d):continue
    cost[nxt]=value;parent[nxt]=k;heapq.heappush(queue,(value,nxt))
 # Do not terminate on an arbitrary same-net pour: it may be an isolated island.
 # A supply pin requires a via or an independently verified plane connection.
 if found is None:miss.append({'trace':t['name'],'net':net,'ref':ref});continue
 b=found
 if not any((x,y)==b for x,y,n in via):via.append((*b,net))
 route_points=route_points or [a,b]
 segments.extend((c,d,layer,net) for c,d in zip(route_points,route_points[1:]))
 paths.append({'connection':f'.{ref} > .{sp[p["source_port_id"]]["name"]}','route':[{'route_type':'wire','x':a[0],'y':a[1],'layer':layer,'width':.1},{'route_type':'wire','x':b[0],'y':b[1],'layer':layer,'width':.1},{'route_type':'via','x':b[0],'y':b[1],'from_layer':layer,'to_layer':end,'via_diameter':.3,'via_hole_diameter':.15},{'route_type':'wire','x':b[0],'y':b[1],'layer':end,'width':.1}]})
 report.append({'trace':t['name'],'net':net,'fromLayer':layer,'endLayer':end,'via':{'x':b[0],'y':b[1]},'waypoints':[{'x':c[0],'y':c[1]} for c in route_points[1:-1]],'requiresFilledCappedViaInPad':b==a,'reachesIntendedPlane':(end=='bottom' and net=='GND') or (end=='top' and net=='DDR_1V5')})
via_records=[{'name':f'PG_VIA_{i}','x':x,'y':y,'net':n} for i,(x,y,n) in enumerate(via)]
escapes=[{'name':r['trace'],'from':p['connection'],'via':next(v['name'] for v in via_records if abs(v['x']-r['via']['x'])<1e-7 and abs(v['y']-r['via']['y'])<1e-7),'layer':r['fromLayer'],'waypoints':[dict(w) for w in r['waypoints']],'directPlaneEndpoint':None} for p,r in zip(paths,report)]
escapes.extend(direct_escapes)
# Store RAM-associated vias in the canonical (0,-27,0 deg) frame used by JSX.
placement=json.loads((root/'design/ram-placement.json').read_text())
is_ram=lambda ref:ref=='U3' or ref.startswith('C_DDR') or ref in ['R_ZQ','R_VREF_H','R_VREF_L','C_VREF','R_DDR_RST']
ram_vias={e['via'] for e in escapes if is_ram(e['from'].split(' > ')[0][1:])}
angle=math.radians(placement['rotation'])
for v in via_records:
 if v['name'] not in ram_vias:continue
 dx=v['x']-placement['x'];dy=v['y']-placement['y']
 v['x']=dx*math.cos(angle)+dy*math.sin(angle)
 v['y']=-27-dx*math.sin(angle)+dy*math.cos(angle)
# pcbPath numeric points are component-local, even when its ends are selectors.
components={sc[e['source_component_id']]:e for e in js if e['type']=='pcb_component' and e.get('source_component_id') in sc}
for e in escapes:
 c=components[e['from'].split(' > ')[0][1:]];a=math.radians(c['rotation'])
 for w in [*e['waypoints'],*([e['directPlaneEndpoint']] if e['directPlaneEndpoint'] else [])]:
  dx=w['x']-c.get('display_offset_x',c['center']['x']);dy=w['y']-c.get('display_offset_y',c['center']['y']);w['x']=dx*math.cos(a)+dy*math.sin(a);w['y']=-dx*math.sin(a)+dy*math.cos(a)
(root/'design/power-escapes.json').write_text(json.dumps({'vias':via_records,'traces':escapes},indent=2)+'\n')
(root/'output/power-escape-audit.json').write_text(json.dumps({'requested':len(selected),'routed':len(paths)+len(direct_escapes),'vias':len(via),'unrouted':miss,'paths':report+direct_report,'fabricationReady':False},indent=2)+'\n')
print({'requested':len(selected),'routed':len(paths)+len(direct_escapes),'vias':len(via),'unrouted':len(miss)})
