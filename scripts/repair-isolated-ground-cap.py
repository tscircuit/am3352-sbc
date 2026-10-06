"""Move one decoupler off a ground island, retaining its old supply stub copper.
Only accept a placement that clears emitted copper/courtyards and adds no new
positive-pad obstruction beneath saved inner2 routes. Native validation follows.
"""
from pathlib import Path
source=(Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0]
source=source.replace("typ=e['type'];g=None;layers=", "typ=e['type'];g=None;layers=")
exec(compile(source,str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate
name='C_U1_F14';component=next(e for e in c if e['type']=='pcb_component' and sc.get(e['source_component_id'])==name);cid=component['pcb_component_id']
pads=[e for e in c if e['type']=='pcb_smtpad' and e['pcb_component_id']==cid]
pos=next(e for e in pads if '1' in e['port_hints']);neg=next(e for e in pads if '2' in e['port_hints']);positive=net(pos);ground=net(neg)
# Remove only the two old pads from the obstacle list; keep all old tracks.
oldshapes=[box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2) for e in pads]
base=[(g,ls,n) for g,ls,n in geoms if not any(g.equals(h) for h in oldshapes)]
foreign={n:unary_union([g for g,ls,k in base if k!=n and 'bottom' in ls]) for n in [positive,ground]}
courts=[]
for e in c:
 if e['type']=='pcb_courtyard_rect' and e.get('layer')=='bottom' and e.get('pcb_component_id')!=cid:
  x=e['center']['x'];y=e['center']['y'];courts.append(rotate(box(x-e['width']/2,y-e['height']/2,x+e['width']/2,y+e['height']/2),e.get('ccw_rotation',0),origin=(x,y)))
othercourts=unary_union(courts)
owncourt=next(e for e in c if e['type']=='pcb_courtyard_rect' and e.get('pcb_component_id')==cid);x=owncourt['center']['x'];y=owncourt['center']['y'];court=box(x-owncourt['width']/2,y-owncourt['height']/2,x+owncourt['width']/2,y+owncourt['height']/2)
pours=[]
for e in c:
 if e['type']=='pcb_copper_pour' and net(e)==ground and e['layer']=='bottom':
  b=e['brep_shape'];pours.append(Polygon([(v['x'],v['y']) for v in b['outer_ring']['vertices']], [[(v['x'],v['y']) for v in h['vertices']] for h in b['inner_rings']]))
main=max(pours,key=lambda g:g.area).buffer(-.05)
signals=[]
for e in c:
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner2':signals.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(.1))
reference=unary_union(signals);oldvoid=oldshapes[0].buffer(.13)
options=sorted([(dx*.05,dy*.05) for dx in range(-20,21) for dy in range(-20,21)],key=lambda p:p[0]**2+p[1]**2)
for dx,dy in options:
 positive_pad=translate(oldshapes[0],dx,dy);ground_pad=translate(oldshapes[1],dx,dy);newpoint=(pos['x']+dx,pos['y']+dy)
 if positive_pad.distance(foreign[positive])<.103 or ground_pad.distance(foreign[ground])<.103:continue
 connector=LineString([newpoint,(pos['x'],pos['y'])]).buffer(.05)
 if connector.distance(foreign[positive])<.103 or ground_pad.distance(connector)<.103:continue
 if translate(court,dx,dy).intersects(othercourts.buffer(.001)):continue
 if not main.contains(Point(neg['x']+dx,neg['y']+dy)):continue
 if positive_pad.union(connector).buffer(.13).difference(oldvoid).intersection(reference).area>1e-7:continue
 break
else:raise RuntimeError('No acceptable local relocation within 1 mm on each axis')
places=json.loads((ROOT/'design/decoupling-placement.json').read_text());escapes=json.loads((ROOT/'design/power-escapes.json').read_text());routes=json.loads((ROOT/'design/remaining-routes.json').read_text())
backup={'placement':places[name],'escapes':[e for e in escapes['traces'] if name in e['from']],'routes':[r for r in routes if name in r['from'] or name in r['to']]}
assert not any(name in r['from'] for r in routes)
# Preserve any incoming branch at its old physical endpoint.
for r in routes:
 if name not in r['to']:continue
 t=next(t for t in terminals if t['selector']==r['from']);end=r['world'][-1];angle=-math.radians(t['rotation']);xx=end[0]-t['origin'][0];yy=end[1]-t['origin'][1]
 r['toPoint']={'x':xx*math.cos(angle)-yy*math.sin(angle),'y':xx*math.sin(angle)+yy*math.cos(angle)};r['to']='net.'+r['net']
newcenter=(component['center']['x']+dx,component['center']['y']+dy);angle=-math.radians(component['rotation']);xx=pos['x']-newcenter[0];yy=pos['y']-newcenter[1]
for e in escapes['traces']:
 if e['from']=='.'+name+' > .pin1':
  assert not e['waypoints'];e['waypoints']=[{'x':xx*math.cos(angle)-yy*math.sin(angle),'y':xx*math.sin(angle)+yy*math.cos(angle)}]
places[name]['x']=newcenter[0];places[name]['y']=newcenter[1]
for filename,data in [('decoupling-placement.json',places),('power-escapes.json',escapes),('remaining-routes.json',routes)]: (ROOT/'design'/filename).write_text(json.dumps(data,indent=2)+'\n')
report={'component':name,'translationMm':[dx,dy],'distanceMm':math.hypot(dx,dy),'oldSupplyCopperRetained':True,'newReferenceVoidAreaMm2':0,'nativeValidationRequired':True,'backup':backup}
(ROOT/'output/ground-cap-relocation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='backup'}))
