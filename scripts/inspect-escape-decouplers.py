from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
for x,y in [(-4.8,4.1),(-.1,-5.0)]:
 print('site',x,y)
 for e in c:
  if e['type']!='pcb_smtpad' or e['layer']!='bottom':continue
  g=rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
  if g.distance(Point(x,y))<.253:print(sc.get(pc[e['pcb_component_id']]['source_component_id']),e.get('port_hints'),e['x'],e['y'],e['width'],e['height'])
