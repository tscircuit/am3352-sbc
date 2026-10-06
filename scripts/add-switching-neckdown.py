"""Candidate top-only SW3 neckdown through the PMIC's crowded pin exits.
Native rendering and independent geometry/continuity audits are mandatory.
"""
import json,math
from pathlib import Path
root=Path(__file__).resolve().parent.parent
cj=json.loads((root/'output/baseline.circuit.json').read_text())
sc={e['source_component_id']:e['name'] for e in cj if e['type']=='source_component'}
sp={e['source_port_id']:e for e in cj if e['type']=='source_port'}
pc={e['pcb_component_id']:e for e in cj if e['type']=='pcb_component'}
def terminal(ref,pin):
 p=next(e for e in cj if e['type']=='pcb_port' and sc[sp[e['source_port_id']]['source_component_id']]==ref and sp[e['source_port_id']]['name']==pin)
 component=pc[p['pcb_component_id']]
 return p,component
routes=json.loads((root/'design/remaining-routes.json').read_text());assert not any(r['net']=='SW3' for r in routes)
serial=max(int(r['name'].rsplit('_',1)[1]) for r in routes)+1
for ref,pin,width,via_points in [('U2','L3',.15,[[-23.15,.55],[-23.15,1.25]]),('L3','pin1',.35,[[-23.15,1.25]])]:
 p,component=terminal(ref,pin);world=[[p['x'],p['y'],0]]+[[x,y,0] for x,y in via_points]
 angle=-math.radians(component.get('rotation',component.get('ccw_rotation',0)));origin=component['center']
 def local(point):
  dx=point[0]-origin['x'];dy=point[1]-origin['y'];return {'x':dx*math.cos(angle)-dy*math.sin(angle),'y':dx*math.sin(angle)+dy*math.cos(angle)}
 routes.append({'name':f'REMAINING_{serial}','net':'SW3','from':f'.{ref} > .{pin}','to':'net.SW3','width':width,'world':world,'waypoints':[local(p) for p in world[1:-1]],'toPoint':local(world[-1])});serial+=1
(root/'design/remaining-routes.json').write_text(json.dumps(routes,indent=2)+'\n')
print(json.dumps(routes[-2:],indent=2))
