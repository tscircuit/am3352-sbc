"""Incremental copper routing with exact obstacle checks and through-via clearance.
Routes from the current emitted board, never reroutes saved DDR or pairs. Results
remain candidates until native copper, connectivity, and timing audits pass.
"""
from pathlib import Path
import fcntl
_lock_file=open(Path(__file__).resolve().parent.parent/"output/router.lock", "w")
try:fcntl.flock(_lock_file,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:raise SystemExit("Another router owns this candidate")
# Reuse the board geometry loader; no routing is executed by this prefix.
loader=(Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0]
exec(compile(loader,str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely import intersects_xy
from shapely.ops import nearest_points
import re
def is_power(name):return bool(re.match(r"^(VDD|V[13]|A3V3|RTC_1V8|DDR_1V5|SYS_|VIN_|PD_VBUS|PD_VDD|USB[01]_VBUS|HDMI_(PVDD|TVDD|5V)|SW[123]$)",name))
LAYERS=['top','inner1','inner2','bottom']; STEP=float(os.environ.get('ROUTE_GRID','.1')); W=round(99/STEP)+1;H=round(79/STEP)+1;N=W*H
xs=np.arange(W)*STEP-49.5;ys=np.arange(H)*STEP-39.5
class DSU:
 def __init__(self,n):self.p=list(range(n))
 def find(self,i):
  while self.p[i]!=i:self.p[i]=self.p[self.p[i]];i=self.p[i]
  return i
 def join(self,a,b):self.p[self.find(a)]=self.find(b)
seed_routes=json.loads((ROOT/'design/remaining-routes.json').read_text()) if (ROOT/'design/remaining-routes.json').exists() and not os.environ.get('AUDIT_NATIVE') else []
# Preserve net identity for direct port-to-port signal traces without source_net.
for e in c:
 if e['type']=='source_trace' and e.get('name') and net(e) not in labels:labels[net(e)]=e['name']
# Resume previously checked geometric candidates as fixed copper.
native_trace_names={e.get('name') for e in c if e['type']=='source_trace'}
for route in seed_routes:
 if route['name'] in native_trace_names:continue
 owner=next(k for k,v in labels.items() if v==route['net'])
 for a,b in zip(route['world'],route['world'][1:]):
  if a[2]==b[2]:geoms.append((LineString([a[:2],b[:2]]).buffer(route['width']/2,quad_segs=16),[LAYERS[a[2]]],owner))
  else:geoms.append((Point(a[0],a[1]).buffer(.15,quad_segs=32),LAYERS,owner))
# Include pours only in physical component discovery. They are recomputed after
# explicit routing, rather than treated as uncrossable obstacles on both surfaces.
pour_geoms=[]
for e in c:
 if e['type']=='pcb_copper_pour':
  b=e['brep_shape'];pour_geoms.append((Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]),[e['layer']],net(e)))
merged=[]
for n in set(n for g,ls,n in geoms):
 for l in LAYERS:
  gs=[g for g,ls,k in geoms if n==k and l in ls]
  if gs:merged.append((unary_union(gs),[l],n))
if os.environ.get('RESERVE_GROUND_CORRIDOR'):
 ground_id=next(k for k,v in labels.items() if v=='GND')
 merged.append((LineString([(5.62,3.8),(4.8,4.4)]).buffer(.08),['bottom'],ground_id))
print('loaded',len(geoms),'copper pieces',flush=True)
# Keep new drill sites out of all SMT pads, including same-net pads.
allpads=unary_union([g for g,ls,n in geoms if False]) # replaced below from pads
pad_obstacles=[]
for e in c:
 if e['type']=='pcb_via':
  pad_obstacles.append(Point(e['x'],e['y']).buffer(e['outer_diameter']/2+.253,quad_segs=32));continue
 if e['type'] not in ['pcb_smtpad','pcb_plated_hole','pcb_hole']:continue
 if os.environ.get('IGNORE_CPU_DECOUPLERS') and e['type']=='pcb_smtpad' and e.get('layer')=='bottom' and sc.get(pc[e['pcb_component_id']]['source_component_id'],'').startswith('C_U1_'):continue
 # A conservative bounding box is sufficient for disallowing via-in-pad.
 if e.get('points'):
  px=[p['x'] for p in e['points']];py=[p['y'] for p in e['points']];pad_obstacles.append(box(min(px),min(py),max(px),max(py)).buffer(.16))
 else:
  x=e.get('x',e.get('center',{}).get('x'));y=e.get('y',e.get('center',{}).get('y'));r=e.get('radius',e.get('outer_diameter',e.get('hole_diameter',0))/2)
  w=e.get('width',e.get('outer_width',e.get('rect_pad_width',r*2)));h=e.get('height',e.get('outer_height',e.get('rect_pad_height',r*2)))
  g=rotate(box(x-w/2,y-h/2,x+w/2,y+h/2),e.get('ccw_rotation',e.get('rect_ccw_rotation',0)),origin=(x,y)).buffer(.16)
  pad_obstacles.append(g)
for r in seed_routes:
 for a,b in zip(r['world'],r['world'][1:]):
  if a[2]!=b[2]:pad_obstacles.append(Point(a[:2]).buffer(.403,quad_segs=32))
allpads=unary_union(pad_obstacles)
# For supply repairs, route directly between existing via barrels on an inner
# layer. This avoids carving the bottom ground plane or adding more drills.
inner_bridges=bool(os.environ.get('INNER_POWER_BRIDGES'))
if inner_bridges or os.environ.get('EXISTING_POWER_VIAS'):
 for t in terminals:
  if not t['selector'].startswith('.PG_VIA_'):continue
  via=next((e for e in c if e['type']=='pcb_via' and math.hypot(e['x']-t['x'],e['y']-t['y'])<1e-7 and net(e)==t['net'] and set(e['layers'])==set(LAYERS)),None)
  if via:t['layers']=['inner1','inner2'] if inner_bridges or os.environ.get('PREFER_INNER_POWER') else LAYERS;t['existingViaId']=via['pcb_via_id']
# Prioritize difficult CPU signal escapes before long power trunks.
requested=os.environ.get('ROUTE_NETS','').split(',') if os.environ.get('ROUTE_NETS') else None
nets_to_route=[]
for n in set(t['net'] for t in terminals):
 name=labels.get(n,n)
 if os.environ.get('SIGNALS_ONLY') and (name=='GND' or is_power(name)):continue
 if requested and name not in requested:continue
 ts=[t for t in terminals if t['net']==n]
 if len(ts)<2:continue
 own=[(g,ls) for g,ls,k in geoms+pour_geoms if k==n]
 if not own:continue
 tree=STRtree([g for g,ls in own]);ds=DSU(len(own))
 for i,(g,ls) in enumerate(own):
  for j in tree.query(g.buffer(1e-7)):
   j=int(j)
   if j<i and set(ls)&set(own[j][1]) and g.distance(own[j][0])<1e-7:ds.join(i,j)
 valid=[]
 for t in ts:
  hit=next((int(i) for i in tree.query(Point(t['x'],t['y']).buffer(.002)) if set(t['layers'])&set(own[int(i)][1]) and own[int(i)][0].distance(Point(t['x'],t['y']))<.002),None)
  if hit is None:continue
  t['component']=ds.find(hit);valid.append(t)
 # Flow-through ESD pins connect inside the package; never bypass it with PCB copper.
 for component in c:
  if component['type']!='source_component_internal_connection':continue
  members=[t for t in valid if ports[t['port_id']]['source_port_id'] in component['source_port_ids']]
  for t in members[1:]:ds.join(members[0]['component'],t['component'])
 for t in valid:t['component']=ds.find(t['component'])
 groups=sorted(set(t['component'] for t in valid));idx={g:i for i,g in enumerate(groups)}
 for t in valid:t['component']=idx[t['component']]
 if len(groups)>1:
  # A branch may terminate on existing same-net copper, not only at a pad.
  # This avoids re-entering a congested BGA merely to join its escaped trace.
  if any(e['type']=='source_net' and e['name']==name for e in c):
   for i,(g,ls) in enumerate(own):
    root=ds.find(i)
    if root not in idx:continue
    if g.area>25:
     interior=g.buffer(-.12)
     if interior.is_empty:continue
     for terminal in list(valid):
      if terminal.get('virtual') or terminal['component']==idx[root]:continue
      target=nearest_points(Point(terminal['x'],terminal['y']),interior)[1]
      valid.append({'x':target.x,'y':target.y,'layers':ls,'selector':'existing pour','net':n,'component':idx[root],'virtual':True})
     continue
    p=g.representative_point()
    valid.append({'x':p.x,'y':p.y,'layers':ls,'selector':'existing copper','net':n,'component':idx[root],'virtual':True})
  nets_to_route.append((n,name,valid,len(groups)))
def priority(item):
 _,name,ts,count=item
 return (4 if name=='GND' else 3 if is_power(name) else 0 if name.startswith('LCD_') else 1 if any(t['selector'].startswith('.U1 >') for t in ts) else 2,count,name)
escape_failures={r['net'] for r in json.loads((ROOT/'output/cpu-escape-report.json').read_text()) if not r['escaped']} if (ROOT/'output/cpu-escape-report.json').exists() else set()
nets_to_route.sort(key=lambda item:(0 if item[1] in escape_failures and not is_power(item[1]) and item[1]!='GND' else 1,priority(item)))
if os.environ.get('AUDIT_ONLY'):
 import hashlib
 report={'circuitSha256':hashlib.sha256((ROOT/'output/baseline.circuit.json').read_bytes()).hexdigest(),'remainingNetworks':[{'net':name,'components':count,'groups':[[t['selector'] for t in ts if t['component']==i] for i in range(count)]} for n,name,ts,count in nets_to_route], 'allViasThrough':all(set(e['layers'])==set(LAYERS) for e in c if e['type']=='pcb_via'),'nativeOnly':bool(os.environ.get('AUDIT_NATIVE'))}
 (ROOT/'output/physical-connectivity-audit.json').write_text(json.dumps(report,indent=2)+'\n')
 print('Physical disconnected networks:',len(nets_to_route),'all vias through:',report['allViasThrough'],flush=True)
 raise SystemExit(0)
print('unconnected networks',[(name,count) for n,name,ts,count in nets_to_route],flush=True)
routes=seed_routes;reports=[];additional=[]
route_serial=max([int(r["name"].rsplit("_",1)[1]) for r in routes]+[int(n.rsplit("_",1)[1]) for n in native_trace_names if n and n.startswith("REMAINING_")],default=-1)+1
limit=int(os.environ.get('ROUTE_SEARCH_LIMIT','160000'));time_limit=float(os.environ.get('ROUTE_NET_SECONDS','35'))
saved_reference_copper={}
if os.environ.get('PROTECT_INNER1_REFERENCE'):
 reference_base=json.loads((ROOT/'output/reference-baseline.audit.json').read_text())
 for signal,reference in [('inner1','top'),('inner2','bottom')]:
  lines=[];planes=[]
  for e in reference_base:
   if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
    for a,b in zip(e['route'],e['route'][1:]):
     if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']==signal:lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
   if e['type']=='pcb_copper_pour' and e['layer']==reference:
    b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
  saved_reference_copper[reference]=unary_union(planes).intersection(unary_union(lines).buffer(.1))
 print('reference protection prepared',flush=True)
for n,name,ts,count in nets_to_route:
 started=time.monotonic();ds=DSU(count)
 width=float(os.environ.get('POWER_WIDTH','.15')) if is_power(name) or name=='GND' else float(os.environ.get('SIGNAL_WIDTH', '.14' if re.match(r'^(LCD_|MMC0_|SPI0_)',name) else '.1'))
 # Keep power on outer layers; signals may use inner layers around fixed DDR.
 allowed=([0] if os.environ.get('POWER_TOP_ONLY') else [0,3]) if is_power(name) or name=='GND' else [0,1,2,3]
 if os.environ.get('POWER_ALL_LAYERS') and (is_power(name) or name=='GND'):allowed=[0,1,2,3]
 if inner_bridges:allowed=[1,2]
 no_vias=(inner_bridges and not os.environ.get('INNER_POWER_BRIDGE_VIAS')) or any(e['type']=='source_trace' and net(e)==n and e.get('max_via_count')==0 for e in c)
 length_limits=[e['max_length'] for e in c if e['type']=='source_trace' and net(e)==n and 'max_length' in e] if not is_power(name) and name!='GND' else []
 length_limit=min(length_limits,default=math.inf)
 if is_power(name) and os.environ.get('POWER_MAX_LENGTH'):length_limit=min(length_limit,float(os.environ['POWER_MAX_LENGTH']))
 margin=width/2+.103
 # Protect actual reference copper, allowing reuse of pre-existing antipads.
 # Blanket signal-distance keepouts incorrectly trap existing supply vias.
 reference_protection={l:Polygon() for l in LAYERS};protected_copper=[]
 for reference,copper in saved_reference_copper.items():
  if (reference=='top' and name=='DDR_1V5') or (reference=='bottom' and name=='GND'):continue
  protected_copper.append(copper)
  reference_protection[reference]=copper.buffer(width/2+.133,quad_segs=32)
 obstacles=[];masks=[]
 for l in LAYERS:
  obs=unary_union([g for g,ls,k in merged+additional if k!=n and l in ls]).buffer(margin,quad_segs=16)
  if not reference_protection[l].is_empty:obs=obs.union(reference_protection[l])
  prepare(obs);obstacles.append(obs);masks.append(contains_xy(obs,xs[None,:],ys[:,None]))
 # Through holes must clear foreign copper on every layer, not just endpoints.
 vo=unary_union([g for g,ls,k in merged+additional if k!=n]).buffer(.253,quad_segs=16).union(allpads)
 if protected_copper:vo=vo.union(unary_union(protected_copper).buffer(.283,quad_segs=32))
 prepare(vo);via_mask=contains_xy(vo,xs[None,:],ys[:,None])
 # Existing same-net through barrels are usable layer transitions. They are
 # excluded from NEW drilling sites above, but must not disconnect their net.
 reused_barrels={}
 if os.environ.get('REUSE_OWN_VIAS'):
  points=[(e['x'],e['y']) for e in c if e['type']=='pcb_via' and net(e)==n and set(e['layers'])==set(LAYERS)]
  points += [tuple(a[:2]) for r in seed_routes if r['net']==name for a,b in zip(r['world'],r['world'][1:]) if a[2]!=b[2]]
  for x,y in points:
   ix=round((x+49.5)/STEP);iy=round((y+39.5)/STEP)
   if 0<=ix<W and 0<=iy<H and math.hypot(xs[ix]-x,ys[iy]-y)<1e-7:
    reused_barrels[iy*W+ix]=(x,y);via_mask[iy,ix]=False
 def xyz(key):
  layer=key//N;k=key%N;return (float(xs[k%W]),float(ys[k//W]),layer)
 def clear(p,q,l):return not obstacles[l].intersects(LineString([p[:2],q[:2]]))
 def anchors(t):
  x=round((t['x']+49.5)/STEP);y=round((t['y']+39.5)/STEP);out=[]
  for layer in allowed:
   if LAYERS[layer] not in t['layers']:continue
   for dy in range(-2,3):
    for dx in range(-2,3):
     xx=x+dx;yy=y+dy
     if 0<=xx<W and 0<=yy<H and not masks[layer][yy,xx]:
      p=(float(xs[xx]),float(ys[yy]))
      if clear((t['x'],t['y']),p,layer):out.append(layer*N+yy*W+xx)
  return out
 for t in ts:t['anchors']=anchors(t)
 # Cheap free-space connectivity rejects unreachable pairs before A*.
 # Eight-neighbor labeling over-approximates diagonal segment clearance:
 # disjoint labels prove no grid route; joined labels still require exact A*.
 from scipy.ndimage import label
 regions={};region_count=1
 for layer in allowed:
  region,num=label(~masks[layer],structure=np.ones((3,3)))
  regions[layer]=region+region_count;region_count+=num+1
 reachable=DSU(region_count)
 if not no_vias and len(allowed)>1:
  free=np.flatnonzero(~via_mask)
  joins=np.unique(np.column_stack([regions[l].ravel()[free] for l in allowed]),axis=0)
  for row in joins:
   for other in row[1:]:reachable.join(int(row[0]),int(other))
 def region_ids(anchor_keys):
  return {reachable.find(int(regions[k//N][(k%N)//W,(k%N)%W])) for k in anchor_keys if k//N in regions}
 candidates=[]
 for a in [t for t in ts if not t.get('virtual') and (not inner_bridges or (t.get('existingViaId') and t['selector'].endswith('.top')))]:
  if os.environ.get('ROUTE_FROM_PATTERN') and not re.search(os.environ['ROUTE_FROM_PATTERN'],a['selector']):continue
  for component in set(t['component'] for t in ts):
   if component==a['component']:continue
   nearest=sorted([b for b in ts if b['component']==component and (not os.environ.get('ROUTE_TO_PATTERN') or re.search(os.environ['ROUTE_TO_PATTERN'],b['selector']))],key=lambda b:math.hypot(a['x']-b['x'],a['y']-b['y']))[:8]
   candidates.extend((math.hypot(a['x']-b['x'],a['y']-b['y']),a,b) for b in nearest)
 candidates.sort(key=lambda v:v[0]);failures=[];added=0
 for distance,a,b in candidates:
  if ds.find(a['component'])==ds.find(b['component']):continue
  if time.monotonic()-started>time_limit:break
  points=None
  ac=region_ids([k for k in a['anchors'] if LAYERS[k//N] in (a['layers'] if inner_bridges or a.get('existingViaId') else a['layers'][:1])]);bc=region_ids(b['anchors'])
  if not ac&bc:failures.append({'from':a['selector'],'to':b['selector'],'disconnectedFreeSpace':True});continue
  for l in allowed:
   if os.environ.get('PREFER_INNER_SIGNALS') and not is_power(name) and l in [0,3] and distance>2:continue
   if LAYERS[l] in (a['layers'] if inner_bridges or a.get('existingViaId') else a['layers'][:1]) and LAYERS[l] in b['layers'] and distance<=length_limit and clear((a['x'],a['y']),(b['x'],b['y']),l):points=[(a['x'],a['y'],l),(b['x'],b['y'],l)];break
  if points is None and a['anchors'] and b['anchors']:
   starts=[k for k in a['anchors'] if LAYERS[k//N] in (a['layers'] if inner_bridges or a.get('existingViaId') else a['layers'][:1])];ends=set(b['anchors']);goallayers={k//N for k in ends};queue=[];cost={};travel={};parent={};seen=set()
   def heuristic(p):return math.hypot(p[0]-b['x'],p[1]-b['y'])+(0 if p[2] in goallayers else 2)
   for key in starts:
    p=xyz(key);g=math.hypot(p[0]-a['x'],p[1]-a['y']);cost[key]=g;travel[key]=g;heapq.heappush(queue,(g+1.6*heuristic(p),g,key))
   while queue and len(seen)<limit and time.monotonic()-started<time_limit:
    _,g,key=heapq.heappop(queue)
    if key in seen:continue
    seen.add(key);p=xyz(key);l=p[2];k=key%N;x=k%W;y=k//W
    if key in ends and travel[key]+math.hypot(p[0]-b['x'],p[1]-b['y'])<=length_limit:
     path=[key]
     while path[-1] in parent:path.append(parent[path[-1]])
     points=[(a['x'],a['y'],path[-1]//N)]+[xyz(k) for k in reversed(path)]+[(b['x'],b['y'],key//N)];break
    nexts=[]
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
     xx=x+dx;yy=y+dy
     if 0<=xx<W and 0<=yy<H and not masks[l][yy,xx]:nexts.append((l*N+yy*W+xx,STEP*math.hypot(dx,dy)))
    if not no_vias and not via_mask[y,x]:
     nexts.extend((ll*N+k,2) for ll in allowed if ll!=l and not masks[ll][y,x])
    for nxt,move in nexts:
     if nxt in seen:continue
     q=xyz(nxt)
     prefer_inner=(os.environ.get('PREFER_INNER_POWER') and is_power(name)) or (os.environ.get('PREFER_INNER_SIGNALS') and not is_power(name))
     multiplier=4 if prefer_inner and q[2]==l and l in [0,3] else 1
     ng=g+move*multiplier
     path_length=travel[key]+(math.dist(p[:2],q[:2]) if q[2]==l else 0)
     if ng>=cost.get(nxt,math.inf) or path_length>length_limit:continue
     if q[2]==l and not clear(p,q,l):continue
     cost[nxt]=ng;travel[nxt]=path_length;parent[nxt]=key;heapq.heappush(queue,(ng+1.6*heuristic(q),ng,nxt))
  if points is None:
   failures.append({'from':a['selector'],'to':b['selector'],'missingAnchors':not(a['anchors'] and b['anchors'])});continue
  # Simplify only within a layer; validate all long segments after simplification.
  simp=[points[0]];i=0
  while i<len(points)-1:
   if points[i][2]!=points[i+1][2]:simp.append(points[i+1]);i+=1;continue
   end=i+1
   while end+1<len(points) and points[end+1][2]==points[i][2]:end+=1
   j=end
   while j>i+1 and not clear(points[i],points[j],points[i][2]):j-=1
   if math.dist(simp[-1][:2],points[j][:2])>1e-8:simp.append(points[j])
   i=j
  assert sum(math.dist(p[:2],q[:2]) for p,q in zip(simp,simp[1:]))<=length_limit+1e-7
  # Use the component frame used by core's manual pcbPath renderer.
  angle=-math.radians(a['rotation']);origin=a['origin'];waypoints=[];route_geoms=[]
  for i,p in enumerate(simp[1:-1],1):
   dx=p[0]-origin[0];dy=p[1]-origin[1];w={'x':dx*math.cos(angle)-dy*math.sin(angle),'y':dx*math.sin(angle)+dy*math.cos(angle)}
   if p[2]!=simp[i-1][2]:w.update(via=True,fromLayer=LAYERS[simp[i-1][2]],toLayer=LAYERS[p[2]])
   waypoints.append(w)
  for p,q in zip(simp,simp[1:]):
   if p[2]==q[2]:
    assert clear(p,q,p[2]);route_geoms.append((LineString([p[:2],q[:2]]).buffer(width/2,quad_segs=16),[LAYERS[p[2]]],n))
   else:
    assert not vo.intersects(Point(p[0],p[1])) or any(math.dist(p[:2],v)<1e-7 for v in reused_barrels.values());route_geoms.append((Point(p[0],p[1]).buffer(.15,quad_segs=32),LAYERS,n))
  record={'name':f'REMAINING_{route_serial}','net':name,'from':a['selector'],'to':b['selector'],'width':width,'waypoints':waypoints,'world':simp}
  if b.get('virtual'):
   dx=b['x']-origin[0];dy=b['y']-origin[1]
   record['to']=f'net.{name}'
   record['toPoint']={'x':dx*math.cos(angle)-dy*math.sin(angle),'y':dx*math.sin(angle)+dy*math.cos(angle)}
  record['reusedViaCenters']=[list(v) for v in reused_barrels.values() if any(p[2]!=q[2] and math.dist(p[:2],v)<1e-7 for p,q in zip(simp,simp[1:]))]
  if a.get('existingViaId'):record['startExistingViaId']=a['existingViaId']
  if b.get('existingViaId'):record['endExistingViaId']=b['existingViaId']
  routes.append(record);route_serial+=1
  new_via_keepouts=[g.buffer(.253,quad_segs=16) for g,ls,_ in route_geoms if len(ls)==4]
  if new_via_keepouts:
   allpads=allpads.union(unary_union(new_via_keepouts));vo=vo.union(allpads);prepare(vo);via_mask=contains_xy(vo,xs[None,:],ys[:,None])
  additional.extend(route_geoms);ds.join(a['component'],b['component']);added+=1
  (ROOT/'design/remaining-routes.json').write_text(json.dumps(routes,indent=2)+'\n')
  print(name,'joined',added,'remaining',len(set(ds.find(i) for i in range(count))),'seconds',round(time.monotonic()-started,1),flush=True)
 reports.append({'net':name,'initialComponents':count,'remainingComponents':len(set(ds.find(i) for i in range(count))),'routesAdded':added,'seconds':time.monotonic()-started,'failures':failures,'groups':[[t['selector'] for t in ts if ds.find(t['component'])==g] for g in sorted(set(ds.find(i) for i in range(count)))]})
 (ROOT/'output/remaining-report.json').write_text(json.dumps(reports,indent=2)+'\n')
 print('NET',name,reports[-1]['remainingComponents'],round(time.monotonic()-started,1),flush=True)
print('TOTAL',len(routes),flush=True)
