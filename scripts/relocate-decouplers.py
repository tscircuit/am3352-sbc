"""Move bottom passives off reserved DDR and BGA supply vias; preserve nets."""
import json,math,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
j=json.loads((root/'output/placement.circuit.json').read_text())
names={e['source_component_id']:e['name'] for e in j if e['type']=='source_component'}
comps={e['pcb_component_id']:e for e in j if e['type']=='pcb_component' and e.get('source_component_id') in names}
pads=[e for e in j if e['type']=='pcb_smtpad' and e['layer']=='bottom']
courts=[e for e in j if e['type']=='pcb_courtyard_rect' and e['layer']=='bottom']
places=json.loads((root/'design/decoupling-placement.json').read_text())
placement=json.loads((root/'design/ram-placement.json').read_text());theta=math.radians(placement['rotation'])
def is_ram(n):return n=='U3' or n.startswith('C_DDR') or n in ['R_ZQ','R_VREF_H','R_VREF_L','C_VREF','R_DDR_RST']
def world(x,y):return (placement['x']+x*math.cos(theta)-(y+27)*math.sin(theta),placement['y']+x*math.sin(theta)+(y+27)*math.cos(theta))
def canonical(x,y):
 dx=x-placement['x'];dy=y-placement['y'];return (dx*math.cos(theta)+dy*math.sin(theta),-27-dx*math.sin(theta)+dy*math.cos(theta))
escapes=json.loads((root/'design/power-escapes.json').read_text())
ram_vias={e['via'] for e in escapes['traces'] if is_ram(e['from'].split(' > ')[0][1:])}
bga_vias={e['via'] for e in escapes['traces'] if e['from'].startswith(('.U1 >','.U3 >'))}
via=[(*((world(v['x'],v['y'])) if v['name'] in ram_vias else (v['x'],v['y'])),.15) for v in escapes['vias'] if v['name'] in bga_vias]
signal_paths=json.loads((root/'design/ddr-routes.json').read_text())
peripheral_file=root/'design/peripheral-routes.json'
if peripheral_file.exists():signal_paths+=json.loads(peripheral_file.read_text())
for path in signal_paths:
 via.extend((v['x'],v['y'],v.get('via_diameter',.3)/2) for v in path['route'] if v['route_type']=='via')
def box(e,dx=0,dy=0):
 c=e.get('center',e);w=e.get('width',e.get('radius',0)*2);h=e.get('height',e.get('radius',0)*2)
 if e.get('ccw_rotation',0)%180==90:w,h=h,w
 return c['x']+dx,c['y']+dy,w/2,h/2
def sep(a,b):return math.hypot(max(0,abs(a[0]-b[0])-a[2]-b[2]),max(0,abs(a[1]-b[1])-a[3]-b[3]))
audit=json.loads((root/'output/power-escape-audit.json').read_text())
missing={e['ref']:e['net'] for e in audit['unrouted'] if e['ref'].startswith('C_')}
all_vias=[(*((world(v['x'],v['y'])) if v['name'] in ram_vias else (v['x'],v['y'])),v['net']) for v in escapes['vias']]
def ptseg(p,a,b):
 dx=b[0]-a[0];dy=b[1]-a[1];q=dx*dx+dy*dy;t=0 if not q else max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/q));return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
def segdist(a,b,c,d):
 def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
 if cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0:return 0
 return min(ptseg(a,c,d),ptseg(b,c,d),ptseg(c,a,b),ptseg(d,a,b))
def padseg(p,a,b):
 x,y,w,h=box(p)
 if min(sep((x,y,w,h),(*a,0,0)),sep((x,y,w,h),(*b,0,0)))<=0:return 0
 v=[(x-w,y-h),(x+w,y-h),(x+w,y+h),(x-w,y+h)]
 return min(segdist(a,b,c,d) for c,d in zip(v,v[1:]+v[:1]))
moves={}
for cid,c in comps.items():
 name=names[c['source_component_id']]
 if name not in places and name!='R_VTP':continue
 own=[e for e in pads if e['pcb_component_id']==cid];other=[e for e in pads if e['pcb_component_id']!=cid]
 court=[e for e in courts if e['pcb_component_id']==cid];oc=[e for e in courts if e['pcb_component_id']!=cid]
 if not own:continue
 for dx,dy in sorted([(x*.2,y*.2) for x in range(-50,51) for y in range(-50,51)],key=lambda a:a[0]**2+a[1]**2):
  if any(abs(box(a,dx,dy)[0])+box(a)[2]>49 or abs(box(a,dx,dy)[1])+box(a)[3]>39 for a in own):continue
  if any(sep(box(a,dx,dy),(x,y,0,0))<r+.101 for a in own for x,y,r in via):continue
  if any(sep(box(a,dx,dy),box(b))<.101 for a in own for b in other):continue
  if any(sep(box(a,dx,dy),box(b))<.001 for a in court for b in oc):continue
  if name in missing:
   p1=next(p for p in own if any(h in p.get('port_hints',[]) for h in ['1','pin1','pos']))
   a=(p1['x']+dx,p1['y']+dy);net=missing[name]
   candidates=[(x,y) for x,y,n in all_vias if n==net and math.dist(a,(x,y))<4]
   if not any(not any(padseg(p,a,b)<.151 for p in other) and not any(ptseg((x,y),a,b)<.301 for x,y,n in all_vias if n!=net) and not any(ptseg((x,y),a,b)<r+.151 for x,y,r in via if not any(math.dist((x,y),v)<1e-6 for v in candidates)) for b in candidates):continue
  break
 else:raise RuntimeError('No decoupler site for '+name)
 if dx==dy==0:continue
 for a in own:a['x']+=dx;a['y']+=dy
 for a in court:a['center']['x']+=dx;a['center']['y']+=dy
 x=c['center']['x']+dx;y=c['center']['y']+dy
 if is_ram(name):x,y=canonical(x,y)
 moves[name]={'x':round(x,6),'y':round(y,6)}
 if name in places:places[name].update(moves[name])
(root/'design/decoupling-placement.json').write_text(json.dumps(places,indent=2)+'\n')
if 'R_VTP' in moves:
 f=root/'design/processor-support.tsx';s=f.read_text();pos=moves['R_VTP'];s=re.sub(r'(name="R_VTP"[\s\S]*?x=)\{[^}]+\}(\s+y=)\{[^}]+\}',lambda m:m[1]+'{'+str(pos['x'])+'}'+m[2]+'{'+str(pos['y'])+'}',s);f.write_text(s)
print('Relocated',len(moves),'bottom passives',moves)
