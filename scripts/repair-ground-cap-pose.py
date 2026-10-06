"""Move an isolated ground pad while retaining all existing supply copper.
Search placement only; require a fresh native render and independent audits.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate
name=os.environ['TARGET_CAP'];comp=next(e for e in pc.values() if sc.get(e['source_component_id'])==name);cid=comp['pcb_component_id'];origin=(comp['center']['x'],comp['center']['y']);oldangle=comp['rotation']
pads=[e for e in c if e['type']=='pcb_smtpad' and e['pcb_component_id']==cid];pos=next(e for e in pads if '1' in e['port_hints']);neg=next(e for e in pads if '2' in e['port_hints']);positive=net(pos);ground=net(neg)
shape=lambda e:rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
pp0=shape(pos);np0=shape(neg);base=[(g,ls,n) for g,ls,n in geoms if not g.equals(pp0) and not g.equals(np0)]
foreign={n:unary_union([g for g,ls,k in base if 'bottom' in ls and k!=n]) for n in [positive,ground]}
for g in foreign.values():prepare(g)
courts={e['pcb_component_id']:rotate(box(e['center']['x']-e['width']/2,e['center']['y']-e['height']/2,e['center']['x']+e['width']/2,e['center']['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['center']['x'],e['center']['y'])) for e in c if e['type']=='pcb_courtyard_rect' and e['layer']=='bottom'}
other=unary_union([g for k,g in courts.items() if k!=cid]).buffer(.001);prepare(other)
drills=unary_union([Point(e['x'],e['y']).buffer(e['hole_diameter']/2+.005) for e in c if e['type']=='pcb_via']);prepare(drills)
def pour(e):
 b=e['brep_shape'];return Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']])
main=max([pour(e) for e in c if e['type']=='pcb_copper_pour' and e['layer']=='bottom' and net(e)==ground],key=lambda g:g.area).buffer(-.02);prepare(main)
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());lines=[]
for e in ref:
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner2':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union([pour(e) for e in ref if e['type']=='pcb_copper_pour' and e['layer']=='bottom']).intersection(unary_union(lines).buffer(.1));prepare(protected)
radius=float(os.environ.get('POSE_RADIUS','3'));count=round(radius/.1);steps=sorted([(x*.1,y*.1) for x in range(-count,count+1) for y in range(-count,count+1) if x*x+y*y<=count*count],key=lambda p:p[0]**2+p[1]**2);found=None
for dx,dy in steps:
 for delta in [0,90,-90,180]:
  pp=translate(rotate(pp0,delta,origin=origin),dx,dy);npad=translate(rotate(np0,delta,origin=origin),dx,dy);court=translate(rotate(courts[cid],delta,origin=origin),dx,dy)
  if court.intersects(other) or pp.intersects(drills) or npad.intersects(drills):continue
  if pp.distance(foreign[positive])<.103 or npad.distance(foreign[ground])<.103 or not main.contains(npad.centroid):continue
  line=LineString([pp.centroid,(pos['x'],pos['y'])]);copper=line.buffer(.075,quad_segs=24)
  if line.length>3 or copper.distance(foreign[positive])<.103 or copper.distance(npad)<.103:continue
  if pp.union(copper).buffer(.133,quad_segs=24).intersection(protected).area>1e-7:continue
  found=(dx,dy,delta,pp.centroid);break
 if found:break
if not found:raise RuntimeError(f'No valid pose for {name} within {radius} mm')
dx,dy,delta,p=found;neworigin=(origin[0]+dx,origin[1]+dy);newangle=(oldangle+delta)%360
def reframe(x,y):
 a=math.radians(oldangle);wx=origin[0]+x*math.cos(a)-y*math.sin(a);wy=origin[1]+x*math.sin(a)+y*math.cos(a);b=math.radians(-newangle);xx=wx-neworigin[0];yy=wy-neworigin[1];return {'x':xx*math.cos(b)-yy*math.sin(b),'y':xx*math.sin(b)+yy*math.cos(b)}
def oldpad():
 a=math.radians(-oldangle);xx=pos['x']-origin[0];yy=pos['y']-origin[1];return reframe(xx*math.cos(a)-yy*math.sin(a),xx*math.sin(a)+yy*math.cos(a))
places=json.loads((ROOT/'design/decoupling-placement.json').read_text());esc=json.loads((ROOT/'design/power-escapes.json').read_text());routes=json.loads((ROOT/'design/remaining-routes.json').read_text());saved=json.loads((ROOT/'design/control-routes.json').read_text());selector='.'+name+' > .pin1'
assert not any(r['from']==selector or (r.get('endPortId') and r['endPortId']==pos.get('pcb_port_id')) for r in saved)
for e in esc['traces']:
 if e['from']==selector:e['waypoints']=[oldpad()]+[{**w,**reframe(w['x'],w['y'])} for w in e['waypoints']]
for r in routes:
 if r['from']==selector:
  r['waypoints']=[oldpad()]+[{**w,**reframe(w['x'],w['y'])} for w in r['waypoints']]
  if r.get('toPoint'):r['toPoint']=reframe(r['toPoint']['x'],r['toPoint']['y'])
  r['world']=[[p.x,p.y,3]]+r['world']
 elif r['to']==selector:
  t=next(t for t in terminals if t['selector']==r['from']);a=math.radians(-t['rotation']);xx=pos['x']-t['origin'][0];yy=pos['y']-t['origin'][1];r['toPoint']={'x':xx*math.cos(a)-yy*math.sin(a),'y':xx*math.sin(a)+yy*math.cos(a)};r['to']='net.'+r['net']
places[name]={'x':neworigin[0],'y':neworigin[1],'rotation':newangle}
for f,d in [('decoupling-placement.json',places),('power-escapes.json',esc),('remaining-routes.json',routes)]: (ROOT/'design'/f).write_text(json.dumps(d,indent=2)+'\n')
report={'name':name,'translation':[dx,dy],'rotation':newangle,'positiveExtensionMm':math.dist([p.x,p.y],[pos['x'],pos['y']]),'nativeAuditRequired':True};(ROOT/'output/ground-cap-pose.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
