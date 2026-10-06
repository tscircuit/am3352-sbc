"""Search short CPU escapes on a fine local grid, preserving both reference layers.
Candidates require a fresh native build and every incremental acceptance audit.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
# Incorporate pending, explicit replay copper so exploratory escapes respect
# routes added since the last native render. Actual acceptance requires rebuild.
native_names={e.get('name') for e in c if e['type']=='source_trace'}
pending_vias=[]
for cached in json.loads((ROOT/'design/control-routes.json').read_text()):
 if cached['name'] in native_names:continue
 owner=next(k for k,v in labels.items() if v==cached['net'])
 for a,b in zip(cached['route'],cached['route'][1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:
   geoms.append((LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(max(a['width'],b['width'])/2,quad_segs=12),[a['layer']],owner))
 for p in cached['route']:
  if p['route_type']=='via':
   g=Point(p['x'],p['y']).buffer(p.get('via_diameter',.3)/2,quad_segs=32);geoms.append((g,['top','inner1','inner2','bottom'],owner));pending_vias.append(g.buffer(.253))
from scipy.ndimage import label
from shapely import contains_xy
reference=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());protected={}
for layer,outer in [('inner1','top'),('inner2','bottom')]:
 planes=[];lines=[]
 for e in reference:
  if e['type']=='pcb_copper_pour' and e['layer']==outer:
   b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
  if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
   for a,b in zip(e['route'],e['route'][1:]):
    if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']==layer:lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
 protected[outer]=unary_union(planes).intersection(unary_union(lines).buffer(.1))
allpad=list(pending_vias)
for e in c:
 if e['type']=='pcb_smtpad':
  if e.get('points'):
   allpad.append(Polygon([(v['x'],v['y']) for v in e['points']]).buffer(.16));continue
  x,y=e['x'],e['y'];r=e.get('radius',0);w,h=e.get('width',2*r),e.get('height',2*r)
  g=rotate(box(x-w/2,y-h/2,x+w/2,y+h/2),e.get('ccw_rotation',0),origin=(x,y));allpad.append(g.buffer(.16))
 if e['type']=='pcb_via':allpad.append(Point(e['x'],e['y']).buffer(e['outer_diameter']/2+.253))
allpad=unary_union(allpad);routes=json.loads((ROOT/'design/remaining-routes.json').read_text());serial=max(int(r['name'].split('_')[-1]) for r in routes)+1;report=[]
for name,selector in json.loads(os.environ['PIN_OPTIONS']).items():
 t=next(t for t in terminals if t['selector']==selector);n=t['net'];a=(t['x'],t['y']);area=Point(a).buffer(10)
 foreign=[(g,ls) for g,ls,k in geoms if k!=n and g.intersects(area)]
 top=unary_union([g for g,ls in foreign if 'top' in ls]).buffer(.153,quad_segs=32).union(protected['top'].buffer(.183,quad_segs=32));prepare(top)
 drill=unary_union([g for g,ls in foreign]).buffer(.253,quad_segs=32).union(allpad).union(unary_union(list(protected.values())).buffer(.283,quad_segs=32));prepare(drill)
 step=.05;radius=120;xx=a[0]+np.arange(-radius,radius+1)*step;yy=a[1]+np.arange(-radius,radius+1)*step
 blocked=contains_xy(top,xx[None,:],yy[:,None]);via=contains_xy(drill,xx[None,:],yy[:,None]);regions,_=label(~blocked,np.ones((3,3)));reg=regions[radius,radius]
 if not reg or not np.any((regions==reg)&~via):report.append({'net':name,'found':False,'reason':'No reachable via on local grid'});print(report[-1],flush=True);continue
 def point(k):return (float(xx[k[0]]),float(yy[k[1]]))
 start=(radius,radius);queue=[(0,start)];cost={start:0};parent={};seen=set();end=None
 while queue:
  d,k=heapq.heappop(queue)
  if k in seen:continue
  seen.add(k);p=point(k)
  if d>8:break
  if k!=start and not via[k[1],k[0]]:end=k;break
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]:
   q=(k[0]+dx,k[1]+dy);nd=d+step*math.hypot(dx,dy)
   if not(0<=q[0]<=2*radius and 0<=q[1]<=2*radius) or blocked[q[1],q[0]] or nd>=cost.get(q,math.inf):continue
   if top.intersects(LineString([p,point(q)])):continue
   cost[q]=nd;parent[q]=k;heapq.heappush(queue,(nd,q))
 if end is None:report.append({'net':name,'found':False,'reason':'Exact segment search failed'});print(report[-1],flush=True);continue
 path=[end]
 while path[-1]!=start:path.append(parent[path[-1]])
 path=[point(k) for k in reversed(path)];simple=[path[0]];i=0
 while i<len(path)-1:
  j=len(path)-1
  while j>i+1 and top.intersects(LineString([path[i],path[j]])):j-=1
  simple.append(path[j]);i=j
 b=simple[-1];world=[[x,y,0] for x,y in simple]+[[b[0],b[1],2]];angle=-math.radians(t['rotation']);origin=t['origin'];way=[]
 def local(p):
  x,y=p[0]-origin[0],p[1]-origin[1];return {'x':x*math.cos(angle)-y*math.sin(angle),'y':x*math.sin(angle)+y*math.cos(angle)}
 for p in simple[1:]:way.append(local(p))
 way.append({**local(b),'via':True,'fromLayer':'top','toLayer':'inner2'})
 r={'name':f'REMAINING_{serial}','net':name,'from':t['selector'],'to':'net.'+name,'toPoint':local(b),'width':.1,'waypoints':way,'world':world};routes.append(r);serial+=1
 for p,q in zip(simple,simple[1:]):geoms.append((LineString([p,q]).buffer(.05,quad_segs=32),['top'],n))
 g=Point(b).buffer(.15,quad_segs=32);geoms.append((g,['top','inner1','inner2','bottom'],n));allpad=allpad.union(g.buffer(.253))
 report.append({'net':name,'found':True,'via':b,'surfaceLengthMm':sum(math.dist(p,q) for p,q in zip(simple,simple[1:]))});print(report[-1],flush=True)
(ROOT/'output/pin-remap-escape-proposal.json').write_text(json.dumps(report,indent=2)+'\n')
