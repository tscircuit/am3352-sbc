"""Search short CPU escapes on a fine local grid, preserving both reference layers.
Candidates require a fresh native build and every incremental acceptance audit.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
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
allpad=[]
for e in c:
 if e['type']=='pcb_smtpad':
  if e.get('layer')=='bottom':continue
  if e.get('points'):
   allpad.append(Polygon([(v['x'],v['y']) for v in e['points']]).buffer(.16));continue
  x,y=e['x'],e['y'];r=e.get('radius',0);w,h=e.get('width',2*r),e.get('height',2*r)
  g=rotate(box(x-w/2,y-h/2,x+w/2,y+h/2),e.get('ccw_rotation',0),origin=(x,y));allpad.append(g.buffer(.16))
 if e['type']=='pcb_via':allpad.append(Point(e['x'],e['y']).buffer(e['outer_diameter']/2+.253))
allpad=unary_union(allpad);routes=json.loads((ROOT/'design/remaining-routes.json').read_text());serial=max(int(r['name'].split('_')[-1]) for r in routes)+1;report=[]

for name in os.environ.get('ESCAPE_NETS','EMU1').split(','):
 t=next(t for t in terminals if labels.get(t['net'])==name and t['selector'].startswith('.U1 >'));n=t['net'];a=(t['x'],t['y']);area=Point(a).buffer(5)
 foreign=[(g,ls,k) for g,ls,k in geoms if k!=n and g.intersects(area)]
 top=unary_union([g for g,ls,k in foreign if 'top' in ls]).buffer(.153,quad_segs=32).union(protected['top'].buffer(.183,quad_segs=32))
 drill=unary_union([g for g,ls,k in foreign if ls!=['bottom']]).buffer(.253,quad_segs=32).union(allpad).union(unary_union(list(protected.values())).buffer(.283,quad_segs=32))
 step=.05;radius=80;xx=a[0]+np.arange(-radius,radius+1)*step;yy=a[1]+np.arange(-radius,radius+1)*step
 blocked=contains_xy(top,xx[None,:],yy[:,None]);via=contains_xy(drill,xx[None,:],yy[:,None]);regions,_=label(~blocked,np.ones((3,3)));reg=regions[radius,radius];ys,xs=np.where((regions==reg)&(reg>0)&~via)
 sites=sorted([(float(xx[x]),float(yy[y])) for x,y in zip(xs,ys)],key=lambda p:math.dist(a,p));selected=[]
 for p in sites:
  if any(math.dist(p,q['site'])<.3 for q in selected):continue
  obstructions={}
  for g,ls,k in foreign:
   if ls==['bottom'] and g.distance(Point(p))<.253:obstructions[labels.get(k,k)]=min(obstructions.get(labels.get(k,k),99),g.distance(Point(p)))
  selected.append({'site':p,'bottomObstructions':obstructions})
  if len(selected)>=12:break
 report.append({'net':name,'reachableIgnoringBottom':len(sites),'sites':selected});print(json.dumps(report[-1]),flush=True)
(ROOT/'output/cpu-bottom-access-latest.json').write_text(json.dumps(report,indent=2)+'\n')
