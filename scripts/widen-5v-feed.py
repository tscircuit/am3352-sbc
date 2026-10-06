"""Widen clear sections of the native 5 V feed without moving its centerline.
Continuous foreign-copper clearance is checked for each proposed segment.
A fresh native render and all audits are required before accepting this result.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
saved=json.loads((ROOT/'design/control-routes.json').read_text());entry=next(r for r in saved if r['name']=='REMAINING_306');owner=next(k for k,v in labels.items() if v=='VIN_5V');original=entry['route'];trees={l:STRtree([g for g,ls,n in geoms if n!=owner and l in ls]) for l in ['inner1','inner2']};result=[]
for i,p in enumerate(original):
 if i==len(original)-1 or p['route_type']!='wire' or original[i+1]['route_type']!='wire' or p['layer']!=original[i+1]['layer'] or p['layer'] not in trees:
  result.append(dict(p));continue
 q=original[i+1];distance=math.hypot(q['x']-p['x'],q['y']-p['y']);steps=max(1,math.ceil(distance/.25));tree=trees[p['layer']]
 for j in range(steps):
  a={**p,'x':p['x']+(q['x']-p['x'])*j/steps,'y':p['y']+(q['y']-p['y'])*j/steps};b=(p['x']+(q['x']-p['x'])*(j+1)/steps,p['y']+(q['y']-p['y'])*(j+1)/steps);line=LineString([(a['x'],a['y']),b]);near=tree.query(line.buffer(.61));width=p['width']
  for trial in [1,.9,.8,.7,.6]:
   shape=line.buffer(trial/2,quad_segs=16)
   if all(shape.distance(tree.geometries[k])>=.103 for k in near):width=trial;break
  a['width']=width;result.append(a)
# Native clearance checks use the maximum width at the two endpoints.
# Limit each point by BOTH adjacent segment allowances before validation.
limits=[p.get('width',0) for p in result]
for i,p in enumerate(result):
 if p['route_type']!='wire':continue
 if i and result[i-1]['route_type']=='wire' and result[i-1]['layer']==p['layer']:
  p['width']=min(limits[i],limits[i-1])
def measure(route):
 length=0;resistance=0;wide=0
 for a,b in zip(route,route[1:]):
  if a['route_type']!=b['route_type'] or a['route_type']!='wire' or a['layer']!=b['layer']:continue
  d=math.hypot(a['x']-b['x'],a['y']-b['y']);length+=d
  resistance+=.00001724*d/(min(a['width'],b['width'])*(.0152 if a['layer'].startswith('inner') else .035))
  if min(a['width'],b['width'])>=.9999:wide+=d
 return {'lengthMm':length,'traceResistanceOhmAt20C':resistance,'lengthAt1mmWidthMm':wide}
report={'before':measure(original),'after':measure(result),'minimumWidthMm':min(p['width'] for p in result if p['route_type']=='wire'),'maximumWidthMm':max(p['width'] for p in result if p['route_type']=='wire'),'requiredClearanceMm':.103,'estimateExcludesViasConnectorsSwitchesAndTemperature':True,'requiresNativeValidation':True}
assert abs(report['before']['lengthMm']-report['after']['lengthMm'])<1e-6
entry['route']=result;(ROOT/'design/control-routes.json').write_text(json.dumps(saved,indent=2)+'\n');(ROOT/'output/5v-feed-width-proposal.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
