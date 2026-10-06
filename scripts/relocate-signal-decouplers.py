"""Candidate-only bottom decoupler relocation around fixed signal through-vias.
Requires native board validation afterwards. Coordinates are board-world mm.
"""
import json,math
from pathlib import Path
root=Path(__file__).resolve().parent.parent
j=json.loads((root/'output/peripheral-signal-first.audit.json').read_text())
refs={e['source_component_id']:e['name'] for e in j if e['type']=='source_component'}
comps={e['pcb_component_id']:e for e in j if e['type']=='pcb_component'}
places=json.loads((root/'design/decoupling-placement.json').read_text())
pads=[e for e in j if e['type']=='pcb_smtpad' and e['layer']=='bottom']
courts=[e for e in j if e['type']=='pcb_courtyard_rect' and e['layer']=='bottom']
paths=json.loads((root/'design/ddr-routes.json').read_text())+json.loads((root/'design/peripheral-routes.json').read_text())
vias=[(p['x'],p['y'],p.get('via_diameter',.3)/2) for t in paths for p in t['route'] if p['route_type']=='via']
pose=json.loads((root/'design/ram-placement.json').read_text());theta=math.radians(pose['rotation'])
def box(p,dx=0,dy=0):
 c=p.get('center',p);w=p.get('width',2*p.get('radius',0))/2;h=p.get('height',2*p.get('radius',0))/2
 if p.get('ccw_rotation',0)%180==90:w,h=h,w
 return c['x']+dx,c['y']+dy,w,h
def sep(a,b):return math.hypot(max(0,abs(a[0]-b[0])-a[2]-b[2]),max(0,abs(a[1]-b[1])-a[3]-b[3]))
moves=[]
for cid,component in comps.items():
 ref=refs.get(component.get('source_component_id'))
 if ref not in places or component['layer']!='bottom':continue
 own=[p for p in pads if p['pcb_component_id']==cid];other=[p for p in pads if p['pcb_component_id']!=cid]
 owncourts=[p for p in courts if p['pcb_component_id']==cid];othercourts=[p for p in courts if p['pcb_component_id']!=cid]
 if all(sep(box(p),(x,y,0,0))>=r+.101 for p in own for x,y,r in vias):continue
 for dx,dy in sorted([(x*.1,y*.1) for x in range(-50,51) for y in range(-50,51)],key=lambda p:p[0]**2+p[1]**2):
  if any(abs(box(p,dx,dy)[0])+box(p)[2]>49 or abs(box(p,dx,dy)[1])+box(p)[3]>39 for p in own):continue
  if any(sep(box(p,dx,dy),(x,y,0,0))<r+.101 for p in own for x,y,r in vias):continue
  if any(sep(box(p,dx,dy),box(q))<.101 for p in own for q in other):continue
  if any(sep(box(p,dx,dy),box(q))<.001 for p in owncourts for q in othercourts):continue
  break
 else:raise RuntimeError('No decoupler position for '+ref)
 for p in own:p['x']+=dx;p['y']+=dy
 for p in owncourts:p['center']['x']+=dx;p['center']['y']+=dy
 x=component['center']['x']+dx;y=component['center']['y']+dy
 if ref.startswith('C_DDR') or ref=='C_VREF':
  a=x-pose['x'];b=y-pose['y'];x=a*math.cos(theta)+b*math.sin(theta);y=-27-a*math.sin(theta)+b*math.cos(theta)
 places[ref].update(x=round(x,6),y=round(y,6));moves.append({'name':ref,'dx':dx,'dy':dy,'displacementMm':math.hypot(dx,dy)})
(root/'design/decoupling-placement.json').write_text(json.dumps(places,indent=2)+'\n')
(root/'output/signal-decoupler-relocation.json').write_text(json.dumps({'moves':moves,'nativeAuditRequired':True},indent=2))
print(json.dumps({'relocated':len(moves),'moves':moves}))
