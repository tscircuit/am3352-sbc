from pathlib import Path
import json,math,shutil
base=Path('/workspace/am3352-sbc/.cache/board-completion076');root=Path(__file__).resolve().parent.parent
for f in ['design/control-routes.json','design/remaining-routes.json','design/power-escapes.json','design/decoupling-placement.json']:shutil.copy2(base/f,root/f)
cache=json.loads((root/'design/control-routes.json').read_text());records=json.loads((root/'design/remaining-routes.json').read_text());c=json.loads((root/'output/baseline.circuit.json').read_text());names={e['source_trace_id']:e.get('name') for e in c if e['type']=='source_trace'};a=next(e for e in c if e['type']=='pcb_trace' and names.get(e.get('source_trace_id'))=='REMAINING_82');b=next(r for r in cache if r['name']=='REMAINING_293');ar=next(r for r in records if r['name']=='REMAINING_82');br=next(r for r in records if r['name']==b['name']);assert ar['net']==b['net']=='VDD_MPU';assert math.dist([a['route'][0]['x'],a['route'][0]['y']],[b['route'][0]['x'],b['route'][0]['y']])<1e-7;assert all(p['route_type']=='wire' and p['layer']=='bottom' for p in a['route']);old=[{k:p[k] for k in ['route_type','x','y','width','layer']} for p in a['route']];b['route']=list(reversed(old))+b['route'];b['from']=ar['to'];b['startPortId']=a['route'][-1]['end_pcb_port_id'];br['from']=ar['to'];sc=next(e for e in c if e['type']=='source_component' and e['name']=='C_U1_J13');pc=next(e for e in c if e['type']=='pcb_component' and e['source_component_id']==sc['source_component_id']);origin=pc['center'];angle=-math.radians(pc.get('rotation',0));layers=['top','inner1','inner2','bottom'];world=[[p['x'],p['y'],layers.index(p['layer'])] for p in b['route'] if p['route_type']=='wire'];br['world']=world
local=lambda p:{'x':(p[0]-origin['x'])*math.cos(angle)-(p[1]-origin['y'])*math.sin(angle),'y':(p[0]-origin['x'])*math.sin(angle)+(p[1]-origin['y'])*math.cos(angle)}
br['waypoints']=[]
for i,p in enumerate(world[1:-1],1):
 w=local(p)
 if p[2]!=world[i-1][2]:w.update(via=True,fromLayer=layers[world[i-1][2]],toLayer=layers[p[2]])
 br['waypoints'].append(w)
br['toPoint']=local(world[-1]);(root/'design/control-routes.json').write_text(json.dumps(cache,indent=2)+'\n');(root/'design/remaining-routes.json').write_text(json.dumps([r for r in records if r['name']!='REMAINING_82'],indent=2)+'\n');print('Preserved native RE82 + RE293 copper; real starting pad now C_U1_J13.pin1')
