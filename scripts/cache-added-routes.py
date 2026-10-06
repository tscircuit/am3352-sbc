"""Translate newly searched paths into explicit replay copper, without rerouting.
The source and destination port positions must still match the native baseline.
Run native rendering and all audits after this conversion.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
layers=['top','inner1','inner2','bottom']
saved=json.loads((ROOT/'design/control-routes.json').read_text())
oldnames={r['name'] for r in saved}
native_names={e.get('name') for e in c if e['type']=='source_trace'}
allroutes=json.loads((ROOT/'design/remaining-routes.json').read_text())
added=[]
for r in allroutes:
 if r['name'] in oldnames or r['name'] in native_names:continue
 start=next(t for t in terminals if t['selector']==r['from'])
 points=r['world'];assert math.dist(points[0][:2],[start['x'],start['y']])<1e-7
 assert layers[points[0][2]] in start['layers'] or r.get('startExistingViaId')
 end=next((t for t in terminals if t['selector']==r['to']),None)
 if end:assert math.dist(points[-1][:2],[end['x'],end['y']])<1e-7 and (layers[points[-1][2]] in end['layers'] or r.get('endExistingViaId'))
 route=[]
 for i,p in enumerate(points):
  if i and p[2]!=points[i-1][2]:
   assert math.dist(p[:2],points[i-1][:2])<1e-7
   route.append({'route_type':'via','x':p[0],'y':p[1],'from_layer':layers[points[i-1][2]],'to_layer':layers[p[2]],'layers':layers,'via_diameter':.3,'via_hole_diameter':.15})
  route.append({'route_type':'wire','x':p[0],'y':p[1],'width':r['width'],'layer':layers[p[2]]})
 saved.append({'name':r['name'],'net':r['net'],'from':r['from'],'route':route,'startPortId':start['port_id'],'endPortId':end['port_id'] if end else None,**{k:r[k] for k in ['startExistingViaId','endExistingViaId'] if r.get(k)}})
 added.append(r['name'])
(ROOT/'design/control-routes.json').write_text(json.dumps(saved,indent=2)+'\n')
(ROOT/'output/added-replay-routes.json').write_text(json.dumps(added,indent=2)+'\n')
print(json.dumps({'added':len(added),'cached':len(saved)}))
