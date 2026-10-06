"""Search a divider relocation preserving ground feed and DDR reference copper.
Emit only a proposal; native clearance/connectivity acceptance remains required.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from shapely.affinity import translate
refname='R_VREF_L';cid=next(k for k,v in pc.items() if sc.get(v['source_component_id'])==refname);comp=pc[cid];pads=[e for e in c if e['type']=='pcb_smtpad' and e['pcb_component_id']==cid]
def pad(e):return rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
power=next(e for e in pads if '1' in e['port_hints']);gnd=next(e for e in pads if '2' in e['port_hints']);vref=net(power);ground=net(gnd);old=(gnd['x'],gnd['y']);center=(comp['center']['x'],comp['center']['y']);oldshapes=[pad(e) for e in pads];fixed=[(g,ls,n) for g,ls,n in geoms if not any(g.equals(h) for h in oldshapes)];foreign={n:unary_union([g for g,ls,k in fixed if k!=n and 'bottom' in ls]) for n in [vref,ground]};drills=unary_union([Point(e['x'],e['y']).buffer(e['hole_diameter']/2+.103) for e in c if e['type']=='pcb_via'])
other=[]
for e in c:
 if e['type']=='pcb_courtyard_rect' and e['layer']=='bottom' and e['pcb_component_id']!=cid:
  x,y=e['center']['x'],e['center']['y'];other.append(rotate(box(x-e['width']/2,y-e['height']/2,x+e['width']/2,y+e['height']/2),e.get('ccw_rotation',0),origin=(x,y)))
othercourt=unary_union(other);owncourt=next(e for e in c if e['type']=='pcb_courtyard_rect' and e['pcb_component_id']==cid)
reference=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[]
for e in reference:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner2':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1))

via=next(e for e in c if e['type']=='pcb_via' and abs(e['x']+12)<1e-6 and abs(e['y']+26)<1e-6 and net(e)==vref)
gvia=next(e for e in c if e['type']=='pcb_via' and abs(e['x']+12.4)<1e-5 and abs(e['y']+27.11)<1e-5);assert net(gvia)==ground
end=(via['x'],via['y']);groundEnd=(gvia['x'],gvia['y']);selected=None
candidates=sorted([(a,x*.1,y*.1) for a in [0,90,180,270] for x in range(-40,41) for y in range(-40,41)],key=lambda q:q[1]**2+q[2]**2)
for angle,dx,dy in candidates:
 ox,oy=center[0]+dx,center[1]+dy
 trans=lambda g:translate(rotate(g,angle,origin=(0,0)),ox,oy)
 pp=trans(box(-.78,-.32,-.24,.32));gp=trans(box(.24,-.32,.78,.32));p=trans(Point(-.51,0));g=trans(Point(.51,0));court=trans(box(-.95,-.5,.95,.5))
 if court.intersection(othercourt).area>1e-8:continue
 if any(x.intersects(drills) for x in [pp,gp]):continue
 feed=LineString([(g.x,g.y),groundEnd]).buffer(.05,quad_segs=16);signal=LineString([(p.x,p.y),end]).buffer(.05,quad_segs=16)
 changed=[(pp,vref),(gp,ground),(feed,ground),(signal,vref)]
 if any(x.distance(foreign[n])<.103 for x,n in changed):continue
 if pp.union(signal).distance(gp.union(feed))<.103:continue
 if any(n!=ground and x.buffer(.15,join_style=2).intersection(protected).area>1e-7 for x,n in changed):continue
 selected={'center':[ox,oy],'rotation':(angle+180)%360,'layer':'bottom','pin1':[p.x,p.y],'pin2':[g.x,g.y],'groundVia':groundEnd,'vrefTarget':list(end),'vrefViaId':via['pcb_via_id']};break
report={'found':selected is not None,'proposal':selected,'requiresNativeValidation':True};(ROOT/'output/vref-divider-bottom-proposal.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
