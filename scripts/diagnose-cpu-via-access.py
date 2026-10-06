"""Compare local BGA via access with and without the saved reference constraint."""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from scipy.ndimage import label
from shapely import contains_xy
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[]
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='top':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner1':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1));results=[]
for pin in ['E16','R1','J3','B11']:
 t=next(t for t in terminals if t['selector']==f'.U1 > .{pin}');n=t['net'];a=(t['x'],t['y']);area=Point(a).buffer(5)
 foreign=[(g,ls) for g,ls,k in geoms if k!=n and g.intersects(area)]
 top=unary_union([g for g,ls in foreign if 'top' in ls]).buffer(.153)
 via=unary_union([g for g,ls in foreign]).buffer(.253)
 # Do not infer permission for via-in-pad from same-net copper.
 own=unary_union([g for g,ls,k in geoms if k==n and g.intersects(area)]).buffer(.16)
 via=via.union(own)
 xs=a[0]+np.arange(-80,81)*.05;ys=a[1]+np.arange(-80,81)*.05
 states=[]
 for protect in [False,True]:
  barrier=top.union(protected.buffer(.183)) if protect else top
  drill=via.union(protected.buffer(.283)) if protect else via
  blocked=contains_xy(barrier,xs[None,:],ys[:,None]);regions,num=label(~blocked,structure=np.ones((3,3)))
  region=regions[80,80];openings=(regions==region)&(region>0)&~contains_xy(drill,xs[None,:],ys[:,None]);yy,xx=np.where(openings)
  sites=sorted([(float(xs[x]),float(ys[y])) for x,y in zip(xx,yy)],key=lambda p:math.dist(a,p))
  states.append({'protectReference':protect,'reachableCells':int(np.sum(regions==region)) if region else 0,'availableViaSites':len(sites),'nearestSites':sites[:5]})
 results.append({'pin':pin,'net':labels.get(n,n),'states':states})
print(json.dumps(results,indent=2));(ROOT/'output/cpu-via-access-diagnostic.json').write_text(json.dumps(results,indent=2))
