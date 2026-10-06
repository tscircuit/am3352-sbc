"""Reconnect floating core decouplers by local, clearance-checked placement.
Uses existing bottom core copper, removes only each capacitor's unused stub/via,
and preserves baseline reference copper under the saved inner2 signals.
"""
from pathlib import Path
import fcntl
_lock=open(Path(__file__).resolve().parent.parent/'output/router.lock','w');fcntl.flock(_lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate
from shapely.ops import nearest_points
LAYERS=['top','inner1','inner2','bottom'];routes=json.loads((ROOT/'design/remaining-routes.json').read_text());escapes=json.loads((ROOT/'design/power-escapes.json').read_text());places=json.loads((ROOT/'design/decoupling-placement.json').read_text())
source_names={e['source_trace_id']:e.get('name','') for e in c if e['type']=='source_trace'}
for r in routes:
 if r['name'] in source_names.values():continue
 n=next(k for k,v in labels.items() if v==r['net'])
 for a,b in zip(r['world'],r['world'][1:]):
  if a[2]==b[2]:geoms.append((LineString([a[:2],b[:2]]).buffer(r['width']/2,quad_segs=16),[LAYERS[a[2]]],n))
  else:geoms.append((Point(a[:2]).buffer(.15,quad_segs=32),LAYERS,n))
core=next(k for k,v in labels.items() if v=='VDD_CORE');ground=next(k for k,v in labels.items() if v=='GND')
# Discover the physical core component containing the regulator.
own=[(g,ls) for g,ls,n in geoms if n==core];tree=STRtree([g for g,ls in own]);parent=list(range(len(own)))
def find(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
for i,(g,ls) in enumerate(own):
 for j in tree.query(g.buffer(1e-7)):
  j=int(j)
  if j<i and set(ls)&set(own[j][1]) and g.distance(own[j][0])<1e-7:parent[find(j)]=find(i)
t=next(t for t in terminals if t['selector']=='.U2 > .VDCDC3');root=next(find(i) for i,(g,ls) in enumerate(own) if 'top' in ls and g.distance(Point(t['x'],t['y']))<1e-7)
main_core=unary_union([g for i,(g,ls) in enumerate(own) if find(i)==root and 'bottom' in ls])
assert not main_core.is_empty
# Existing reference copper is the protected material, not an arbitrary whole
# strip around each signal: this permits reuse of existing pad/via antipads.
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[];gndpours=[]
def pour(e):
 b=e['brep_shape'];return Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']])
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom':planes.append(pour(e))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner2':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1));prepare(protected)
for e in c:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom' and net(e)==ground:gndpours.append(pour(e))
main_ground=max(gndpours,key=lambda g:g.area).buffer(-.02);prepare(main_ground)
courts={}
for e in c:
 if e['type']=='pcb_courtyard_rect' and e['layer']=='bottom':
  x=e['center']['x'];y=e['center']['y'];courts[e['pcb_component_id']]=rotate(box(x-e['width']/2,y-e['height']/2,x+e['width']/2,y+e['height']/2),e.get('ccw_rotation',0),origin=(x,y))
steps=sorted([(x*.05,y*.05) for x in range(-30,31) for y in range(-30,31) if x*x+y*y<=30*30],key=lambda p:p[0]**2+p[1]**2)
report=[];serial=max(int(r['name'].rsplit('_',1)[1]) for r in routes)+1
for name in ['C_U1_L8','C_U1_F6']:
 comp=next(e for e in pc.values() if sc.get(e['source_component_id'])==name);cid=comp['pcb_component_id'];center=(comp['center']['x'],comp['center']['y'])
 pads=[e for e in c if e['type']=='pcb_smtpad' and e['pcb_component_id']==cid];pos=next(e for e in pads if '1' in e['port_hints']);neg=next(e for e in pads if '2' in e['port_hints'])
 assert all(e['shape']=='rect' for e in pads)
 shape=lambda e:box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2)
 posshape=shape(pos);negshape=shape(neg)
 stub=next(t for t in escapes['traces'] if t['from']=='.'+name+' > .pin1');v=next(v for v in escapes['vias'] if v['name']==stub['via'])
 assert sum(t['via']==v['name'] for t in escapes['traces'])==1
 assert not any(name in r['from'] or name in r['to'] or v['name'] in r['from'] or v['name'] in r['to'] for r in routes)
 removed=[posshape,negshape,Point(v['x'],v['y']).buffer(.15,quad_segs=32)]
 for e in c:
  if e['type']=='pcb_trace' and source_names.get(e['source_trace_id'])==stub['name']:
   for a,b in zip(e['route'],e['route'][1:]):
    if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:removed.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=12))
 base=[(g,ls,n) for g,ls,n in geoms if not any(g.equals(h) for h in removed)]
 foreign={n:unary_union([g for g,ls,k in base if k!=n and 'bottom' in ls]) for n in [core,ground]}
 for g in foreign.values():prepare(g)
 othercourts=unary_union([g for k,g in courts.items() if k!=cid]);prepare(othercourts)
 drills=unary_union([Point(e['x'],e['y']).buffer(e['hole_diameter']/2+.005) for e in c if e['type']=='pcb_via' and math.hypot(e['x']-v['x'],e['y']-v['y'])>1e-7]);prepare(drills)
 found=None
 # Translation is minimized; orientation changes are allowed only locally.
 for dx,dy in steps:
  for delta in [0,90,-90,180]:
   pp=translate(rotate(posshape,delta,origin=center),dx,dy);npad=translate(rotate(negshape,delta,origin=center),dx,dy);court=translate(rotate(courts[cid],delta,origin=center),dx,dy)
   if court.intersects(othercourts.buffer(.001)):continue
   if pp.intersects(drills) or npad.intersects(drills):continue
   if pp.distance(foreign[core])<.103 or npad.distance(foreign[ground])<.103:continue
   start=pp.centroid
   if not main_ground.contains(npad.centroid):continue
   target_copper=main_core.buffer(-.01).difference(pp.buffer(.1))
   if target_copper.is_empty:continue
   target=nearest_points(start,target_copper)[1];line=LineString([start,target]);copper=line.buffer(.05,quad_segs=24)
   if line.length>3 or copper.distance(foreign[core])<.103 or copper.distance(npad)<.103:continue
   if pp.union(copper).buffer(.133,quad_segs=24).intersection(protected).area>1e-7:continue
   found=(dx,dy,delta,pp,npad,court,start,target,copper);break
  if found:break
 if not found:report.append({'component':name,'moved':False,'reason':'No valid pose within 1.5 mm and direct branch <=3 mm'});print(report[-1],flush=True);continue
 dx,dy,delta,pp,npad,court,start,target,copper=found;rotation=(comp['rotation']+delta)%360;newcenter=(center[0]+dx,center[1]+dy);angle=-math.radians(rotation);xx=target.x-newcenter[0];yy=target.y-newcenter[1]
 routes.append({'name':f'REMAINING_{serial}','net':'VDD_CORE','from':'.'+name+' > .pin1','to':'net.VDD_CORE','width':.1,'waypoints':[],'toPoint':{'x':xx*math.cos(angle)-yy*math.sin(angle),'y':xx*math.sin(angle)+yy*math.cos(angle)},'world':[[start.x,start.y,3],[target.x,target.y,3]]});serial+=1
 places[name]={'x':newcenter[0],'y':newcenter[1],'rotation':rotation}
 escapes['traces'].remove(stub);escapes['vias'].remove(v)
 geoms=base+[(pp,['bottom'],core),(npad,['bottom'],ground),(copper,['bottom'],core)];courts[cid]=court;main_core=main_core.union(pp).union(copper)
 item={'component':name,'moved':True,'translationMm':[dx,dy],'rotation':rotation,'distanceMm':math.hypot(dx,dy),'newBranchLengthMm':start.distance(target),'removedUnusedVia':v['name']};report.append(item);print(item,flush=True)
if any(r['moved'] for r in report):
 for filename,data in [('decoupling-placement.json',places),('power-escapes.json',escapes),('remaining-routes.json',routes)]: (ROOT/'design'/filename).write_text(json.dumps(data,indent=2)+'\n')
(ROOT/'output/floating-core-cap-relocation.json').write_text(json.dumps({'results':report,'nativeValidationRequired':True},indent=2)+'\n')
