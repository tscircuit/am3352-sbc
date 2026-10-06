"""Route remaining supply components on outer copper, preserving saved signals.
Explicit traces carve clearance in regenerated pours. Uses independent Shapely
geometry for obstacles and refuses intersecting/under-clearance candidates.
"""
import json,math,heapq,os,time
from pathlib import Path
import numpy as np
from shapely.geometry import Point,Polygon,LineString,box
from shapely.affinity import rotate
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely import contains_xy,prepare
ROOT=Path(__file__).resolve().parent.parent
c=json.loads((ROOT/'output/baseline.circuit.json').read_text())
m=json.loads((ROOT/'output/copper-net-map.json').read_text()); ids=m['identities']; labels={k:v.removeprefix('ROUTED_') for k,v in m['labels'].items()}
net=lambda e:ids.get(e.get(e['type']+'_id',''),'?'+e.get(e['type']+'_id',''))
sp={e['source_port_id']:e for e in c if e['type']=='source_port'}
sc={e['source_component_id']:e['name'] for e in c if e['type']=='source_component'}
pc={e['pcb_component_id']:e for e in c if e['type']=='pcb_component'}
ports={e['pcb_port_id']:e for e in c if e['type']=='pcb_port'}
esc=json.loads((ROOT/'design/power-escapes.json').read_text())
# Selected supplies do not use RAM transformed vias; resolve manual names by
# the source port's emitted index and verify exact coordinates before use.
terminals=[]
for p in ports.values():
 s=sp[p['source_port_id']]; ref=sc.get(s['source_component_id']);comp=pc[p['pcb_component_id']]
 if ref is None and s['source_component_id'].startswith('source_manually_placed_via_'):
  i=int(s['source_component_id'].rsplit('_',1)[1]); v=esc['vias'][i]
  if math.hypot(p['x']-v['x'],p['y']-v['y'])>1e-5:continue
  ref=v['name']
 if ref:terminals.append({'x':p['x'],'y':p['y'],'layers':p['layers'],'selector':f'.{ref} > .{s["name"]}','net':net(p),'rotation':comp.get('rotation',0),'origin':(comp.get('display_offset_x',comp['center']['x']),comp.get('display_offset_y',comp['center']['y'])),'port_id':p['pcb_port_id']})
# Geometry list (shape, layers, logical net). Treat drills/holes as obstacles.
geoms=[]
for e in c:
 typ=e['type'];g=None;layers=e.get('layers',[e.get('layer')]);owner=net(e)
 if os.environ.get('IGNORE_CPU_DECOUPLERS') and typ=='pcb_smtpad' and e.get('layer')=='bottom' and sc.get(pc[e['pcb_component_id']]['source_component_id'],'').startswith('C_U1_'):continue
 if typ=='pcb_trace':
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer'] and (a['x'],a['y'])!=(b['x'],b['y']):
    geoms.append((LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(max(a['width'],b['width'])/2,quad_segs=12),[a['layer']],owner))
  continue
 if typ=='pcb_via':g=Point(e['x'],e['y']).buffer(e['outer_diameter']/2,quad_segs=32)
 elif typ=='pcb_keepout':
  if e['shape']!='rect':raise ValueError('Unsupported keepout shape')
  x=e['center']['x'];y=e['center']['y'];g=box(x-e['width']/2,y-e['height']/2,x+e['width']/2,y+e['height']/2);owner='keepout'
 elif typ in ('pcb_smtpad','pcb_plated_hole','pcb_hole'):
  x=e.get('x',e.get('center',{}).get('x'));y=e.get('y',e.get('center',{}).get('y'));shape=e.get('shape')
  if shape=='circle' or typ=='pcb_hole':g=Point(x,y).buffer(e.get('radius',e.get('outer_diameter',e.get('hole_diameter',0))/2),quad_segs=32)
  elif shape=='polygon':g=Polygon([(p['x'],p['y']) for p in e['points']])
  else:
   w=e.get('width',e.get('outer_width',e.get('rect_pad_width',0)));h=e.get('height',e.get('outer_height',e.get('rect_pad_height',0)))
   if not w or not h:raise ValueError(f'Unsupported pad {shape}')
   if shape in ['pill','rotated_pill']:
    r=e.get('radius',min(w,h)/2);g=box(x-w/2+r,y-h/2+r,x+w/2-r,y+h/2-r).buffer(r,quad_segs=24)
   else:g=box(x-w/2,y-h/2,x+w/2,y+h/2)
   angle=e.get('ccw_rotation',e.get('rect_ccw_rotation',0));g=rotate(g,angle,origin=(x,y))
  if typ=='pcb_hole':layers=['top','inner1','inner2','bottom'];owner='hole'
 if g is not None and not g.is_empty:geoms.append((g,layers,owner))
print('geometry loaded',len(geoms),flush=True)
# Small trace segments union by net/layer to keep each routing query fast.
merged=[]
for n in set(n for g,ls,n in geoms):
 for l in ['top','bottom']:
  parts=[g for g,ls,k in geoms if k==n and l in ls]
  if parts:merged.append((unary_union(parts),[l],n))
# Keep original all-layer geometry for supply physical-component discovery.
class DSU:
 def __init__(self,n):self.p=list(range(n))
 def find(self,i):
  while self.p[i]!=i:self.p[i]=self.p[self.p[i]];i=self.p[i]
  return i
 def join(self,a,b):self.p[self.find(a)]=self.find(b)
routes=[];reports=[];additional=[]
STEP=float(os.environ.get('POWER_GRID','.1'));W=round(99/STEP)+1;H=round(79/STEP)+1
xs=np.arange(W)*STEP-49.5;ys=np.arange(H)*STEP-39.5
net_names=os.environ.get('POWER_NETS','VDD_MPU,VDD_CORE,RTC_1V8,A3V3,V1V8,V3V3').split(',')
for name in net_names:
 started=time.monotonic();n=next(k for k,v in labels.items() if v==name)
 own=[(g,ls) for g,ls,k in geoms if k==n]; tree=STRtree([g for g,ls in own]);ds=DSU(len(own))
 for i,(g,ls) in enumerate(own):
  for j in tree.query(g.buffer(1e-7)):
   j=int(j)
   if j<i and set(ls)&set(own[j][1]) and g.distance(own[j][0])<1e-7:ds.join(i,j)
 ts=[t for t in terminals if t['net']==n]
 for t in ts:
  hit=next((int(i) for i in tree.query(Point(t['x'],t['y']).buffer(.002)) if set(t['layers'])&set(own[int(i)][1]) and own[int(i)][0].distance(Point(t['x'],t['y']))<.002),None)
  if hit is None:raise ValueError('No copper for '+t['selector'])
  t['component']=ds.find(hit)
 groups=sorted(set(t['component'] for t in ts));idx={g:i for i,g in enumerate(groups)};connected=DSU(len(groups))
 for t in ts:t['component']=idx[t['component']]
 # Route nearest components first; a branch can merge many pins via old copper.
 candidates=[]
 for i,a in enumerate(ts):
  for b in ts[:i]:
   if a['component']==b['component']:continue
   for l in set(a['layers'])&set(b['layers'])&{'top','bottom'}:
    candidates.append((math.hypot(a['x']-b['x'],a['y']-b['y']),0 if l=='top' else 1,a,b,l))
 candidates.sort(key=lambda e:e[:2]);attempted=set();added=0;failures=[]
 width=float(os.environ.get('POWER_WIDTH','.15'));margin=width/2+.102
 obstacles={}; masks={}
 for l in ['top','bottom']:
  obstacle=unary_union([g for g,ls,k in merged+additional if k!=n and l in ls]).buffer(margin,quad_segs=12)
  prepare(obstacle);obstacles[l]=obstacle
  masks[l]=contains_xy(obstacle,xs[None,:],ys[:,None])
 def xy(k):return (float(xs[k%W]),float(ys[k//W]))
 def grid(p):return round((p['y']+39.5)/STEP)*W+round((p['x']+49.5)/STEP)
 for dist,_,a,b,l in candidates:
  if connected.find(a['component'])==connected.find(b['component']):continue
  pair=tuple(sorted((connected.find(a['component']),connected.find(b['component']))))+(l,)
  # Allow different endpoint choices, but bound pathological searches.
  token=(a['selector'],b['selector'],l)
  if token in attempted:continue
  attempted.add(token)
  start=(a['x'],a['y']);goal=(b['x'],b['y']);obs=obstacles[l]
  def clear(p,q):return not obs.intersects(LineString([p,q]))
  points=None
  if clear(start,goal):points=[start,goal]
  elif dist<60:
   def anchors(p):
    k=grid({'x':p[0],'y':p[1]});x=k%W;y=k//W;out=[]
    for dy in range(-2,3):
     for dx in range(-2,3):
      nx=x+dx;ny=y+dy
      if 0<=nx<W and 0<=ny<H and not masks[l][ny,nx]:
       q=xy(ny*W+nx)
       if clear(p,q):out.append(ny*W+nx)
    return out
   starts=anchors(start);ends=set(anchors(goal));queue=[];cost={};parent={};seen=set()
   for k in starts:
    g=math.dist(start,xy(k));cost[k]=g;heapq.heappush(queue,(g+math.dist(xy(k),goal),g,k))
   while queue and len(seen)<int(os.environ.get('POWER_SEARCH_LIMIT','18000')):
    _,g,k=heapq.heappop(queue)
    if k in seen:continue
    seen.add(k)
    if k in ends:
     path=[k]
     while path[-1] in parent:path.append(parent[path[-1]])
     points=[start]+[xy(k) for k in reversed(path)]+[goal];break
    x=k%W;y=k//W;p=xy(k)
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
     xx=x+dx;yy=y+dy;key=yy*W+xx
     if not(0<=xx<W and 0<=yy<H) or masks[l][yy,xx] or key in seen:continue
     ng=g+STEP*math.hypot(dx,dy)
     if ng>=cost.get(key,math.inf):continue
     q=xy(key)
     if not clear(p,q):continue
     cost[key]=ng;parent[key]=k;heapq.heappush(queue,(ng+math.dist(q,goal),ng,key))
  if points is None:
   failures.append({'from':a['selector'],'to':b['selector'],'layer':l})
   if time.monotonic()-started>float(os.environ.get('POWER_NET_SECONDS','150')):break
   continue
  # Remove unnecessary bends only if the full copper segment clears obstacles.
  simp=[points[0]];i=0
  while i<len(points)-1:
   j=len(points)-1
   while j>i+1 and not clear(points[i],points[j]):j-=1
   if math.dist(simp[-1],points[j])>1e-8:simp.append(points[j])
   i=j
  if not all(clear(p,q) for p,q in zip(simp,simp[1:])):raise ValueError('Geometry validation failed')
  angle=-math.radians(a['rotation']);waypoints=[]
  for p in simp[1:-1]:
   dx=p[0]-a['origin'][0];dy=p[1]-a['origin'][1];waypoints.append({'x':dx*math.cos(angle)-dy*math.sin(angle),'y':dx*math.sin(angle)+dy*math.cos(angle)})
  routes.append({'name':f'POWER_DIST_{len(routes)}','net':name,'from':a['selector'],'to':b['selector'],'layer':l,'width':width,'waypoints':waypoints,'world':simp})
  additional.append((LineString(simp).buffer(width/2,quad_segs=24),[l],n));connected.join(a['component'],b['component']);added+=1
  print(name,'joined',added,'remaining',len(set(connected.find(i) for i in range(len(groups)))),'seconds',round(time.monotonic()-started,1),flush=True)
  (ROOT/'design/power-distribution.json').write_text(json.dumps(routes,indent=2)+'\n')
 remaining=len(set(connected.find(i) for i in range(len(groups))))
 reports.append({'net':name,'initialComponents':len(groups),'remainingComponents':remaining,'routesAdded':added,'failedAttempts':len(failures),'seconds':time.monotonic()-started,'width':width})
 (ROOT/'output/power-distribution-report.json').write_text(json.dumps(reports,indent=2)+'\n')
 print('NET',reports[-1],flush=True)
print('TOTAL',len(routes),flush=True)
