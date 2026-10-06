"""Translate selected decouplers minimally to clear diagnosed signal drill sites.
Retain existing power-via locations, check every affected native segment, then
require a fresh native render and the normal independent audits.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate
places=json.loads((ROOT/'design/decoupling-placement.json').read_text());routes=json.loads((ROOT/'design/remaining-routes.json').read_text())
courtyards=[e for e in c if e['type']=='pcb_courtyard_rect' and e['layer']=='bottom']
def court(e):
 q=e['center'];return rotate(box(q['x']-e['width']/2,q['y']-e['height']/2,q['x']+e['width']/2,q['y']+e['height']/2),e.get('ccw_rotation',0),origin=(q['x'],q['y']))
source_names={e['source_trace_id']:e.get('name','') for e in c if e['type']=='source_trace'}
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[]
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner2':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1));ground=next(k for k,v in labels.items() if v=='GND');moves=[]
for refname,site in [('C_U1_F12',(-4.8,4.1)),('C_U1_H11',(-.1,-5.0))]:
 cid=next(k for k,v in pc.items() if sc.get(v['source_component_id'])==refname);ownpads=[e for e in c if e['type']=='pcb_smtpad' and e['pcb_component_id']==cid]
 def pad(e):return rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
 attached=[e for e in c if e['type']=='pcb_trace' and (source_names.get(e.get('source_trace_id'),'').startswith('T_'+refname+'_') or (refname=='C_U1_F12' and source_names.get(e.get('source_trace_id'))=='REMAINING_82'))]
 removed=[pad(e) for e in ownpads]
 for t in attached:
  for a,b in zip(t['route'],t['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:removed.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=12))
 keys={g.wkb for g in removed};fixed=[(g,ls,n) for g,ls,n in geoms if g.wkb not in keys]
 trees={n:STRtree([g for g,ls,k in fixed if k!=n and 'bottom' in ls]) for n in {net(e) for e in ownpads}}
 candidates=sorted([(x*.05,y*.05) for x in range(-20,21) for y in range(-20,21) if x or y],key=lambda q:q[0]**2+q[1]**2);selected=None
 for dx,dy in candidates:
  if any(translate(court(a),dx,dy).intersection(court(b)).area>1e-8 for a in courtyards if a['pcb_component_id']==cid for b in courtyards if b['pcb_component_id']!=cid):continue
  changed=[(translate(pad(e),dx,dy),net(e)) for e in ownpads];traces=[]
  for t in attached:
   route=[dict(p) for p in t['route']]
   for endpoint in route:
    if any(math.hypot(endpoint['x']-p['x'],endpoint['y']-p['y'])<1e-5 for p in ownpads):endpoint['x']+=dx;endpoint['y']+=dy
   for a,b in zip(route,route[1:]):
    if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:changed.append((LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=16),net(t)))
   traces.append(route)
  if any(g.distance(Point(site))<.253 for g,n in changed):continue
  if any(any(g.distance(trees[n].geometries[i])<.103 for i in trees[n].query(g.buffer(.104))) for g,n in changed):continue
  if any(n!=ground and g.buffer(.133).intersection(protected).area>1e-7 for g,n in changed):continue
  selected=(dx,dy,changed,traces);break
 if selected is None:moves.append({'component':refname,'site':site,'found':False});continue
 dx,dy,changed,traces=selected;places[refname]['x']+=dx;places[refname]['y']+=dy
 for r in routes:
  if r['from'].startswith('.'+refname+' >'):
   assert not r['waypoints'],'Manual branch needs world-frame regeneration'
   r['world'][0][0]+=dx;r['world'][0][1]+=dy
 for e in courtyards:
  if e['pcb_component_id']==cid:e['center']['x']+=dx;e['center']['y']+=dy
 geoms=fixed+[(g,['bottom'],n) for g,n in changed]
 moves.append({'component':refname,'site':site,'found':True,'dx':dx,'dy':dy})
(ROOT/'design/decoupling-placement.json').write_text(json.dumps(places,indent=2)+'\n');(ROOT/'design/remaining-routes.json').write_text(json.dumps(routes,indent=2)+'\n');(ROOT/'output/cpu-via-site-decoupler-moves.json').write_text(json.dumps(moves,indent=2)+'\n');print(json.dumps(moves))
