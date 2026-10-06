"""Try standard 0201 core decouplers while preserving their existing power feeds.
All results require fresh native placement/copper/connectivity/reference audits.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate
places=json.loads((ROOT/'design/decoupling-placement.json').read_text());footprints={};report=[]
def pad(e):return rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
courts={}
for e in c:
 if e['type']=='pcb_courtyard_rect' and e['layer']=='bottom':
  x,y=e['center']['x'],e['center']['y'];courts[e['pcb_component_id']]=rotate(box(x-e['width']/2,y-e['height']/2,x+e['width']/2,y+e['height']/2),e.get('ccw_rotation',0),origin=(x,y))
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[]
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner2':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1));ground=next(k for k,v in labels.items() if v=='GND');drills=unary_union([Point(e['x'],e['y']).buffer(e['hole_diameter']/2+.103) for e in c if e['type']=='pcb_via']);sites=[Point(-.1,-4.85),Point(-.1,-4.05)]
for refname in ['C_U1_H11','C_U1_G6']:
 cid=next(k for k,v in pc.items() if sc.get(v['source_component_id'])==refname);pads=[e for e in c if e['type']=='pcb_smtpad' and e['pcb_component_id']==cid];power=next(e for e in pads if '1' in e['port_hints']);gnd=next(e for e in pads if '2' in e['port_hints']);supply=net(power);assert net(gnd)==ground;old=(power['x'],power['y']);center=pc[cid]['center'];keys={pad(e).wkb for e in pads};fixed=[(g,ls,n) for g,ls,n in geoms if g.wkb not in keys];trees={n:STRtree([g for g,ls,k in fixed if k!=n and 'bottom' in ls]) for n in [supply,ground]};othercourt=unary_union([g for k,g in courts.items() if k!=cid]);selected=None
 candidates=sorted([(angle,x*.1,y*.1) for angle in [0,90,180,270] for x in range(-30,31) for y in range(-30,31)],key=lambda q:q[1]**2+q[2]**2+(0 if q[0]==0 else .01))
 for angle,dx,dy in candidates:
  ox,oy=center['x']+dx,center['y']+dy
  trans=lambda g:translate(rotate(g,angle,origin=(0,0)),ox,oy)
  court=trans(box(-.7,-.35,.7,.35))
  if court.intersection(othercourt).area>1e-8:continue
  power_shape=trans(box(-.56,-.2,-.1,.2));ground_shape=trans(box(.1,-.2,.56,.2));point=trans(Point(-.33,0));feed=LineString([(point.x,point.y),old]).buffer(.05,quad_segs=16);changed=[(power_shape,supply),(ground_shape,ground),(feed,supply)]
  if any(g.intersects(drills) for g in [power_shape,ground_shape]):continue
  if any(g.distance(site)<.253 for g,n in changed for site in sites):continue
  if any(any(g.distance(trees[n].geometries[i])<.103 for i in trees[n].query(g.buffer(.104))) for g,n in changed):continue
  if feed.distance(ground_shape)<.103:continue
  if any(n!=ground and g.buffer(.133).intersection(protected).area>1e-7 for g,n in changed):continue
  selected=(ox,oy,angle,court,changed);break
 if not selected:report.append({'component':refname,'found':False});continue
 ox,oy,angle,court,changed=selected;places[refname]={'x':ox,'y':oy,'rotation':(angle+180)%360};footprints[refname]='0201';trace=next(t for t in esc['traces'] if t['name']==f'T_{refname}_pin1');assert not trace.get('waypoints');rad=-math.radians((angle+180)%360);vx,vy=old[0]-ox,old[1]-oy;trace['waypoints']=[{'x':vx*math.cos(rad)-vy*math.sin(rad),'y':vx*math.sin(rad)+vy*math.cos(rad)}];courts[cid]=court;geoms=fixed+[(g,['bottom'],n) for g,n in changed];report.append({'component':refname,'found':True,'footprint':'0201','center':[ox,oy],'rotation':angle,'retainedOldFeedJunction':old});print(report[-1],flush=True)
(ROOT/'design/decoupling-placement.json').write_text(json.dumps(places,indent=2)+'\n');(ROOT/'design/decoupler-footprints.json').write_text(json.dumps(footprints,indent=2)+'\n');(ROOT/'design/power-escapes.json').write_text(json.dumps(esc,indent=2)+'\n');(ROOT/'output/compact-decouplers-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if footprints:
 p=ROOT/'design/nets.tsx';s=p.read_text();s='import decouplerFootprints from "./decoupler-footprints.json";\n'+s;s=s.replace('name === "C_SYS_LOCAL"','(decouplerFootprints as Record<string, string>)[name] ?? (name === "C_SYS_LOCAL"',1).replace(': "0402"\n        }',': "0402")\n        }',1);p.write_text(s)
