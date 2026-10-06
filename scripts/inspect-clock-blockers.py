from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
st={e['source_trace_id']:e.get('name') for e in c if e['type']=='source_trace'}
area=box(7.7,-1,14.5,4)
for e in c:
 if e['type']!='pcb_trace':continue
 for a,b in zip(e['route'],e['route'][1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='top' and math.dist((a['x'],a['y']),(b['x'],b['y']))>.5:
   line=LineString([(a['x'],a['y']),(b['x'],b['y'])])
   if line.intersects(area):print(st.get(e.get('source_trace_id')),e['pcb_trace_id'],labels.get(net(e)),(a['x'],a['y']),(b['x'],b['y']))
