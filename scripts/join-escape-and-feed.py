"""Join two copper fragments at a shared via into one real pad-to-pad route.
Retain every segment width; validate the resulting emitted board before use.
"""
from pathlib import Path
import json,math,sys
root=Path(__file__).resolve().parent.parent;first,second=sys.argv[1:];cachefile=root/'design/control-routes.json';file=root/'design/remaining-routes.json';cached=json.loads(cachefile.read_text());records=json.loads(file.read_text());escape=next(r for r in cached if r['name']==first);feed=next(r for r in cached if r['name']==second)
assert escape['net']==feed['net'];ra=escape['route'];rb=[]
for point in reversed(feed['route']):
 point=dict(point)
 if point['route_type']=='via':point['from_layer'],point['to_layer']=point['to_layer'],point['from_layer']
 rb.append(point)
assert ra[-2]['route_type']=='via' and ra[-1]['route_type']=='wire' and rb[0]['route_type']=='wire'
assert math.dist([ra[-1]['x'],ra[-1]['y']],[rb[0]['x'],rb[0]['y']])<.01
if ra[-2]['from_layer']==rb[0]['layer']:
 escape['route']=ra[:-2]+rb # The feeder reaches the surface; discard the unused escape via.
else:
 ra[-2]['to_layer']=rb[0]['layer'];ra[-1]['layer']=rb[0]['layer'];escape['route']=ra+rb
escape['endPortId']=feed['startPortId']
start=next(r for r in records if r['name']==first);end=next(r for r in records if r['name']==second);assert start['from'].startswith('.U1 > ');start['to']=end['from'];start.pop('toPoint',None);layers=['top','inner1','inner2','bottom'];world=[[q['x'],q['y'],layers.index(q['layer'])] for q in escape['route'] if q['route_type']=='wire'];start['world']=world;start['waypoints']=[]
for i,point in enumerate(world[1:-1],1):
 w={'x':point[0],'y':point[1]}
 if point[2]!=world[i-1][2]:w.update(via=True,fromLayer=layers[world[i-1][2]],toLayer=layers[point[2]])
 start['waypoints'].append(w)
cachefile.write_text(json.dumps([r for r in cached if r['name']!=second],indent=2)+'\n');file.write_text(json.dumps([r for r in records if r['name']!=second],indent=2)+'\n')
print(json.dumps({'joined':first,'retired':second,'net':start['net'],'requiresNativeValidation':True}))
