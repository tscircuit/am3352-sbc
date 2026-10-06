"""Join a feeder at a centerline contact, trimming the unused escape tail.
Only same-net, top-layer wire contacts are accepted. Rebuild and audit afterward.
"""
from pathlib import Path
import json,math,sys
root=Path(__file__).resolve().parent.parent;first,second=sys.argv[1:];cp=root/'design/control-routes.json';rp=root/'design/remaining-routes.json';cache=json.loads(cp.read_text());records=json.loads(rp.read_text());escape=next(r for r in cache if r['name']==first);feed=next(r for r in cache if r['name']==second);assert escape['net']==feed['net']
ra=escape['route'];point=feed['route'][-1];assert point['route_type']=='wire' and point['layer']=='top';found=None
for i,(a,b) in enumerate(zip(ra,ra[1:])):
 if a['route_type']!=b['route_type'] or a['route_type']!='wire' or a['layer']!=b['layer'] or a['layer']!='top':continue
 dx=b['x']-a['x'];dy=b['y']-a['y'];den=dx*dx+dy*dy
 if den<1e-15:continue
 t=((point['x']-a['x'])*dx+(point['y']-a['y'])*dy)/den
 if -1e-8<=t<=1+1e-8 and math.hypot(a['x']+t*dx-point['x'],a['y']+t*dy-point['y'])<1e-7:found=i;break
assert found is not None,'Feed must meet the top centerline exactly'
assert all(p['route_type']=='wire' and p['layer']=='top' for p in ra[:found+2])
rb=[]
for p in reversed(feed['route']):
 p=dict(p)
 if p['route_type']=='via':p['from_layer'],p['to_layer']=p['to_layer'],p['from_layer']
 rb.append(p)
escape['route']=ra[:found+1]+rb;escape['endPortId']=feed['startPortId'];start=next(r for r in records if r['name']==first);end=next(r for r in records if r['name']==second);assert start['from'].startswith('.U1 > ');start['to']=end['from'];start.pop('toPoint',None);layers=['top','inner1','inner2','bottom'];world=[[p['x'],p['y'],layers.index(p['layer'])] for p in escape['route'] if p['route_type']=='wire'];start['world']=world;start['waypoints']=[]
for i,p in enumerate(world[1:-1],1):
 w={'x':p[0],'y':p[1]}
 if p[2]!=world[i-1][2]:w.update(via=True,fromLayer=layers[world[i-1][2]],toLayer=layers[p[2]])
 start['waypoints'].append(w)
cp.write_text(json.dumps([r for r in cache if r['name']!=second],indent=2)+'\n');rp.write_text(json.dumps([r for r in records if r['name']!=second],indent=2)+'\n');print(json.dumps({'joined':first,'retired':second,'trimmedUnusedTail':True,'requiresNativeValidation':True}))
