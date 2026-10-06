"""Search RTC load-cap and ground-via poses in board-world mm, X right/Y up.
Candidate geometry only; native copper, clocks, reference and supply gates follow.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.ops import nearest_points
refs=['C_RTCX1','C_RTCX2'];capids={cid for cid,p in pc.items() if sc.get(p.get('source_component_id')) in refs}
remove=[]
for e in c:
 if e['type']=='pcb_smtpad' and e['pcb_component_id'] in capids:remove.append(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2))
oldvias=[v for v in esc['vias'] if v['name'] in ['PG_VIA_230','PG_VIA_231']]
remove += [Point(v['x'],v['y']).buffer(.15,quad_segs=32) for v in oldvias]
oldtr={e['source_trace_id'] for e in c if e['type']=='source_trace' and e.get('name') in ['T_C_RTCX1_pin2','T_C_RTCX2_pin2']}
for e in c:
 if e['type']=='pcb_trace' and e.get('source_trace_id') in oldtr:
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer'] and (a['x'],a['y'])!=(b['x'],b['y']):remove.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=12))
geoms=[(g,ls,n) for g,ls,n in geoms if not any(g.equals(r) for r in remove)]
layers=['top','inner1','inner2','bottom'];native_names={e.get('name') for e in c if e['type']=='source_trace'}
for r in json.loads((ROOT/'design/remaining-routes.json').read_text()):
 if r['name'] in native_names:continue
 n=next(k for k,v in labels.items() if v==r['net'])
 for a,b in zip(r['world'],r['world'][1:]):
  if a[2]==b[2] and a[:2]!=b[:2]:geoms.append((LineString([a[:2],b[:2]]).buffer(r['width']/2,quad_segs=12),[layers[a[2]]],n))
  elif a[2]!=b[2]:geoms.append((Point(a[:2]).buffer(.15,quad_segs=32),layers,n))
courts=[]
for e in c:
 if e['type']=='pcb_courtyard_rect' and e['layer']=='top' and e['pcb_component_id'] not in capids:
  x=e['center']['x'];y=e['center']['y'];courts.append(rotate(box(x-e['width']/2,y-e['height']/2,x+e['width']/2,y+e['height']/2),e.get('ccw_rotation',0),origin=(x,y)))
othercourts=unary_union(courts)
ground=next(k for k,n in labels.items() if n=='GND')
# Preserve actual top reference copper close to saved inner1 traces.
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[]
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='top':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner1':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1));results=[]
for index,name in enumerate(refs):
 clock=next(k for k,n in labels.items() if n==('RTC_XTALIN' if index==0 else 'RTC_XTALOUT'))
 signal=unary_union([g for g,ls,n in geoms if n==clock and 'top' in ls])
 sf=unary_union([g for g,ls,n in geoms if n!=clock and 'top' in ls]);gf=unary_union([g for g,ls,n in geoms if n!=ground and 'top' in ls]);vf=unary_union([g for g,ls,n in geoms if n!=ground]);alltop=unary_union([g for g,ls,n in geoms if 'top' in ls])
 candidates=[]
 for x in np.arange(-9.5,-8.45,.05):
  for y in np.arange(-4.2,-.7,.05):
   for angle in [0,90,180,270]:
    court=rotate(box(x-.93,y-.47,x+.93,y+.47),angle,origin=(x,y))
    if court.distance(othercourts)<.02:continue
    spad=rotate(box(x-.78,y-.32,x-.24,y+.32),angle,origin=(x,y));gpad=rotate(box(x+.24,y-.32,x+.78,y+.32),angle,origin=(x,y))
    if spad.distance(sf)<.103 or gpad.distance(gf)<.103:continue
    if spad.distance(protected)<.133 or gpad.distance(protected)<.133:continue
    a=spad.centroid;target=nearest_points(a,signal)[1];sw=LineString([a,target]).buffer(.05,quad_segs=16)
    if sw.distance(sf)<.103 or sw.distance(protected)<.133:continue
    gp=gpad.centroid
    for dx,dy in [(.6,0),(-.6,0),(0,.6),(0,-.6),(.5,.5),(.5,-.5),(-.5,.5),(-.5,-.5),(0,.8),(0,-.8),(.8,0),(-.8,0)]:
     vp=Point(gp.x+dx,gp.y+dy);via=vp.buffer(.15,quad_segs=32);gw=LineString([gp,vp]).buffer(.05,quad_segs=16)
     if via.distance(vf)<.103 or via.distance(protected)<.133 or via.distance(spad)<.103 or via.distance(gpad)<.003 or via.distance(sw)<.103:continue
     if gw.distance(gf)<.103 or gw.distance(spad)<.103 or gw.distance(sw)<.103 or gw.distance(protected)<.133:continue
     candidates.append((a.distance(target)+.1*math.hypot(dx,dy),float(x),float(y),angle,(vp.x,vp.y),spad,gpad,sw,gw,via,court,(a.x,a.y),(target.x,target.y)))
 if not candidates:print(json.dumps({'name':name,'found':False}),flush=True);raise SystemExit(2)
 best=min(candidates,key=lambda q:q[0]);_,x,y,angle,vp,spad,gpad,sw,gw,via,court,start,end=best
 results.append({'name':name,'x':x,'y':y,'rotation':angle,'groundVia':oldvias[index]['name'],'viaPoint':vp,'signalBranch':[start,end],'candidateCount':len(candidates)})
 geoms += [(spad,['top'],clock),(gpad,['top'],ground),(sw,['top'],clock),(gw,['top'],ground),(via,layers,ground)];othercourts=othercourts.union(court)
 print(json.dumps(results[-1]),flush=True)
(ROOT/'output/rtc-cap-pose-candidates.json').write_text(json.dumps(results,indent=2)+'\n')
