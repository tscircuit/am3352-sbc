"""Join adjacent ground balls and relocate the redundant barrel to ground pour.
Proposal only; requires native connectivity, clearance and reference validation.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'diagnose-removable-escape-blockers.py').read_text().split('for name in os.environ')[0],str(Path(__file__).parent/'diagnose-removable-escape-blockers.py'),'exec'))
a=(2.8,3.6);b=(2.,3.6);old=(3.2,4.);future=(3.6,4.4);n=next(k for k,v in labels.items() if v=='GND');line=LineString([a,b]);area=Point(a).buffer(9);foreign=[(g,ls) for g,ls,k in geoms if k!=n and g.intersects(area)];top=unary_union([g for g,ls in foreign if 'top' in ls]).buffer(.153);ok=not top.intersects(line)
pours=[]
for e in c:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom' and net(e)==n:
  q=e['brep_shape'];pours.append(Polygon([(p['x'],p['y']) for p in q['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in q['inner_rings']]))
ground=unary_union(pours).buffer(-.16)
blocked=unary_union([g for g,ls in foreign]).buffer(.253).union(allpads).union(protected['top'].buffer(.283)).union(Point(old).buffer(.51)).union(LineString([future,old]).buffer(.303));blocked=blocked.union(unary_union([Point(e['x'],e['y']).buffer(e['outer_diameter']/2+.253) for e in c if e['type']=='pcb_via' and math.dist((e['x'],e['y']),old)>1e-7]));prepare(blocked);prepare(ground)
options=[]
for dx in np.arange(-8,8.01,.1):
 for dy in np.arange(-8,8.01,.1):
  p=(round(a[0]+dx,4),round(a[1]+dy,4));q=Point(p)
  if ground.contains(q) and not blocked.intersects(q):options.append(p)
options.sort(key=lambda p:math.dist(a,p));report={'found':ok and bool(options),'groundBallJoinClear':ok,'from':a,'to':b,'via':'PG_VIA_74','newViaOptions':options[:8],'futureEscape':[future,old],'requiresNativeValidation':True};(ROOT/'output/shared-ground-escape087.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
