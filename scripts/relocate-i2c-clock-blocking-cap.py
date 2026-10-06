"""Translate selected decouplers minimally to clear diagnosed signal drill sites.
Retain existing power-via locations, check every affected native segment, then
require a fresh native render and the normal independent audits.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate, rotate
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
for refname,site in [('C_U1_F12',(-4.95,4.8))]:
 cid=next(k for k,v in pc.items() if sc.get(v['source_component_id'])==refname);ownpads=[e for e in c if e['type']=='pcb_smtpad' and e['pcb_component_id']==cid]
 def pad(e):return rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
 attached=[e for e in c if e['type']=='pcb_trace' and (source_names.get(e.get('source_trace_id'),'').startswith('T_'+refname+'_'))]
 removed=[pad(e) for e in ownpads]
 for t in attached:
  for a,b in zip(t['route'],t['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:removed.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=12))
 keys={g.wkb for g in removed};fixed=[(g,ls,n) for g,ls,n in geoms if g.wkb not in keys]
 trees={n:STRtree([g for g,ls,k in fixed if k!=n and 'bottom' in ls]) for n in {net(e) for e in ownpads}}
 center=pc[cid]['center'];origin=(center['x'],center['y'])
 candidates=sorted([(angle,x*.2,y*.2) for angle in [0,90,180,270] for x in range(-35,36) for y in range(-35,36) if angle or x or y],key=lambda q:q[1]**2+q[2]**2+(0 if q[0]==0 else .01));selected=None
 owncourt=[court(a) for a in courtyards if a['pcb_component_id']==cid];othercourt=unary_union([court(b) for b in courtyards if b['pcb_component_id']!=cid]);drills=unary_union([Point(e['x'],e['y']).buffer(e['hole_diameter']/2+.103) for e in c if e['type']=='pcb_via'])
 supply=net(ownpads[0]);targets=[t for t in terminals if t['net']==supply and t['selector'].startswith('.PG_') and t['selector'].endswith('.bottom')];selected_feed=None
 foreign=unary_union([g for g,ls,n in fixed if n!=supply and 'bottom' in ls]);feed_block=foreign.buffer(.153,quad_segs=16).union(protected.buffer(.183,quad_segs=32));prepare(feed_block)
 for angle,dx,dy in candidates:
  moved=lambda g:translate(rotate(g,angle,origin=origin),dx,dy)
  newpad={e['pcb_smtpad_id']:moved(Point(e['x'],e['y'])) for e in ownpads}
  if any(moved(a).intersection(othercourt).area>1e-8 for a in owncourt):continue
  if any(moved(pad(e)).intersects(drills) for e in ownpads):continue
  changed=[(moved(pad(e)),net(e)) for e in ownpads];traces=[]
  for t in attached:
   if source_names.get(t.get('source_trace_id'),'').startswith('T_'+refname+'_pin1') or source_names.get(t.get('source_trace_id'))=='REMAINING_82':continue
   route=[dict(p) for p in t['route']]
   for endpoint in route:
    for padentry in ownpads:
     if math.hypot(endpoint['x']-padentry['x'],endpoint['y']-padentry['y'])<1e-5:
      npad=newpad[padentry['pcb_smtpad_id']];endpoint['x']=npad.x;endpoint['y']=npad.y;break
   for a,b in zip(route,route[1:]):
    if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']:changed.append((LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(a['width']/2,quad_segs=16),net(t)))
   traces.append(route)
  if any(g.distance(Point(q))<.253 for g,n in changed for q in [(-.1,-4.85),(-.1,-4.05),(-4.9,5.65),(-4.95,4.8)]):continue
  if any(any(g.distance(trees[n].geometries[i])<.103 for i in trees[n].query(g.buffer(.104))) for g,n in changed):continue
  if any(n!=ground and g.buffer(.133).intersection(protected).area>1e-7 for g,n in changed):continue
  a=newpad[ownpads[0]['pcb_smtpad_id']];target=next((t for t in sorted(targets,key=lambda t:math.hypot(t['x']-a.x,t['y']-a.y)) if math.hypot(t['x']-a.x,t['y']-a.y)<5 and not feed_block.intersects(LineString([(a.x,a.y),(t['x'],t['y'])])) and not any(moved(pad(e)).buffer(.153).intersects(LineString([(a.x,a.y),(t['x'],t['y'])])) for e in ownpads if net(e)!=supply)),None)
  if target is None:continue
  selected_feed=(a,target)
  selected=(angle,dx,dy,changed,traces,newpad);break
 if selected is None:moves.append({'component':refname,'site':site,'found':False});continue
 esc['traces']=[t for t in esc['traces'] if t['name']!='T_'+refname+'_pin1']
 (ROOT/'design/power-escapes.json').write_text(json.dumps(esc,indent=2)+'\n')
 angle,dx,dy,changed,traces,newpad=selected;places[refname]['x']+=dx;places[refname]['y']+=dy;places[refname]['rotation']=(places[refname]['rotation']+angle)%360
 for r in routes:
  if r['from'].startswith('.'+refname+' >'):
   assert not r['waypoints'],'Manual branch needs world-frame regeneration'
   old=Point(r['world'][0][:2]);new=translate(rotate(old,angle,origin=origin),dx,dy);r['world'][0][0]=new.x;r['world'][0][1]=new.y
 for e in courtyards:
  if e['pcb_component_id']==cid:e['center']['x']+=dx;e['center']['y']+=dy;e['ccw_rotation']=(e.get('ccw_rotation',0)+angle)%360
 geoms=fixed+[(g,['bottom'],n) for g,n in changed]
 moves.append({'component':refname,'site':site,'found':True,'dx':dx,'dy':dy,'rotationChange':angle})
 a,target=selected_feed;serial=max(int(r['name'].split('_')[-1]) for r in routes)+1;name=f'REMAINING_{serial}';start=next(t for t in terminals if t['selector']==f'.{refname} > .pin1');world=[[a.x,a.y,3],[target['x'],target['y'],3]];r={'name':name,'net':labels[supply],'from':start['selector'],'to':target['selector'],'width':.1,'waypoints':[],'world':world};routes.append(r)
 cached=[r for r in json.loads((ROOT/'design/control-routes.json').read_text()) if r['name']!='REMAINING_82'];cached.append({'name':name,'net':labels[supply],'from':start['selector'],'route':[{'route_type':'wire','x':q[0],'y':q[1],'layer':'bottom','width':.1} for q in world],'startPortId':start['port_id'],'endPortId':target['port_id']});(ROOT/'design/control-routes.json').write_text(json.dumps(cached,indent=2)+'\n');moves[-1]['feed']=r
(ROOT/'design/decoupling-placement.json').write_text(json.dumps(places,indent=2)+'\n');(ROOT/'design/remaining-routes.json').write_text(json.dumps(routes,indent=2)+'\n');(ROOT/'output/cpu-via-site-decoupler-moves.json').write_text(json.dumps(moves,indent=2)+'\n');print(json.dumps(moves))
