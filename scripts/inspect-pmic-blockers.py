from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
source={e['source_trace_id']:e.get('name') for e in c if e['type']=='source_trace'}
for e in c:
 if e['type']!='pcb_trace':continue
 for a,b in zip(e['route'],e['route'][1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='top' and LineString([(a['x'],a['y']),(b['x'],b['y'])]).intersects(box(-21.5,-6.85,-20.1,-6.4)):
   print(source.get(e.get('source_trace_id')),e['pcb_trace_id'],labels.get(net(e)),a,b)
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='top' and LineString([(a['x'],a['y']),(b['x'],b['y'])]).intersects(box(-21.5,.5,-20,.9)):
   print(source.get(e.get('source_trace_id')),e['pcb_trace_id'],labels.get(net(e)),a,b)
