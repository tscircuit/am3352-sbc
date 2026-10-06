"""Move a single ground breakout via, preserving a legal XTALOUT escape.
Candidate geometry only. No acceptance without native and supply audits.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
esc=json.loads((ROOT/'design/power-escapes.json').read_text());v=next(v for v in esc['vias'] if v['name']=='PG_VIA_83');linked=[t for t in esc['traces'] if t['via']==v['name']];assert len(linked)==1 and linked[0]['name']=='T_U1_V11' and not linked[0]['waypoints']
term=next(t for t in terminals if t['selector']=='.U1 > .V11');ground=term['net'];clock=next(k for k,n in labels.items() if n=='XTALOUT')
tr=next(e for e in c if e['type']=='source_trace' and e.get('name')=='T_U1_V11');traces=[e for e in c if e['type']=='pcb_trace' and e.get('source_trace_id')==tr['source_trace_id']]
removed=[Point(v['x'],v['y']).buffer(.15,quad_segs=32)]
for e in traces:
 for a,b in zip(e['route'],e['route'][1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:removed.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=12))
bridge=next(e for e in c if e['type']=='source_trace' and e.get('name')=='REMAINING_69')
bridge_geometry=[]
for e in c:
 if e['type']=='pcb_trace' and e.get('source_trace_id')==bridge['source_trace_id']:
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:
    g=LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=12);removed.append(g);bridge_geometry.append((g,['inner1'],net(e)))
base=[(g,ls,n) for g,ls,n in geoms if not any(g.equals(p) for p in removed)]
# The relocated supply link must clear all existing inner1 copper.
assert all(g.distance(h)>=.103-1e-7 for g,ls,n in bridge_geometry for h,layers,k in base if k!=n and 'inner1' in layers)
base+=bridge_geometry
pad_geoms=[]
for e in c:
 if e['type']=='pcb_smtpad':
  if e['shape']=='circle':pad_geoms.append(Point(e['x'],e['y']).buffer(e['radius']))
  elif e['shape']=='rect':pad_geoms.append(rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y'])))
  elif e.get('points'):pad_geoms.append(Polygon([(p['x'],p['y']) for p in e['points']]))
  elif e['shape'] in ['pill','rotated_pill']:
   pad_geoms.append(rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y'])))
  else:raise RuntimeError('Unsupported SMT pad')
pads=unary_union(pad_geoms)
escape=LineString([(6,1.2),(6.4,1.6),(7.7,1.6)]).buffer(.05,quad_segs=24)
conflicts=[labels.get(n,n) for g,ls,n in base if 'top' in ls and n!=clock and escape.distance(g)<.103-1e-7]
if conflicts:print(json.dumps({'escapeBlockedBy':sorted(set(conflicts))}));raise SystemExit(2)
foreign=unary_union([g for g,ls,n in base if n!=ground]);topforeign=unary_union([g for g,ls,n in base if n!=ground and 'top' in ls]);found=None
# Exact all-layer copper/drill exclusion; sample a local 0.05 mm grid.
sites=sorted([(x*.05,y*.05) for x in range(150,211) for y in range(0,61)],key=lambda p:math.dist(p,(8,1.2)))
for point in sites:
 via=Point(point).buffer(.15,quad_segs=32)
 if via.distance(foreign)<.103 or pads.distance(Point(point))<.16 or via.distance(escape)<.103:continue
 for path in [[(term['x'],term['y']),point],[(term['x'],term['y']),(7.9,1.2),point],[(term['x'],term['y']),(7.9,1.2),(8.5,1.7),point]]:
  line=LineString(path);wire=line.buffer(.05,quad_segs=24)
  if line.length>4.5 or wire.distance(topforeign)<.103 or wire.distance(escape)<.103:continue
  found=point;stub_path=path;break
 if found:break
if not found:print(json.dumps({'found':False}));raise SystemExit(2)
old=(v['x'],v['y']);v['x'],v['y']=found;assert term['rotation']==0 and term['origin']==(0,0);linked[0]['waypoints']=[{'x':p[0],'y':p[1]} for p in stub_path[1:-1]]
(ROOT/'design/power-escapes.json').write_text(json.dumps(esc,indent=2)+'\n')
report={'via':'PG_VIA_83','old':old,'new':found,'net':'GND','clockEscape':[[6,1.2],[6.4,1.6],[7.7,1.6]],'nativeValidationRequired':True};(ROOT/'output/oscillator-escape-candidate.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

start=next(t for t in terminals if t['selector']=='.PG_VIA_177 > .top');end=next(t for t in terminals if t['selector']=='.PG_VIA_179 > .top')
def barrel(t):
 e=next(e for e in c if e['type']=='pcb_via' and math.hypot(e['x']-t['x'],e['y']-t['y'])<1e-7 and net(e)==t['net'])
 assert set(e['layers'])=={'top','inner1','inner2','bottom'}
 return e['pcb_via_id']
saved=json.loads((ROOT/'design/control-routes.json').read_text());saved.append({'name':'REMAINING_69','net':'V1V8','from':start['selector'],'startPortId':start['port_id'],'endPortId':end['port_id'],'startExistingViaId':barrel(start),'endExistingViaId':barrel(end),'route':[{'route_type':'wire','x':t['x'],'y':t['y'],'width':.15,'layer':'inner1'} for t in [start,end]]});(ROOT/'design/control-routes.json').write_text(json.dumps(saved,indent=2)+'\n')
routes=json.loads((ROOT/'design/remaining-routes.json').read_text());r=next(r for r in routes if r['name']=='REMAINING_69');r['world']=[[t['x'],t['y'],1] for t in [start,end]];(ROOT/'design/remaining-routes.json').write_text(json.dumps(routes,indent=2)+'\n')
