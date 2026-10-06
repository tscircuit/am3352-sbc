from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
p=Point(-4.8,3.35);n=next(k for k,v in labels.items() if v=='EMU0');near={}
for g,ls,k in geoms:
 if k!=n and g.distance(p)<.253:near[(labels.get(k,k),','.join(ls))]=min(g.distance(p),near.get((labels.get(k,k),','.join(ls)),99))
print(near)
for e in c:
 if e['type']=='pcb_trace':
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer'] and LineString([(a['x'],a['y']),(b['x'],b['y'])]).distance(p)<.31:
    print(e['pcb_trace_id'],next((t.get('name') for t in c if t['type']=='source_trace' and t['source_trace_id']==e.get('source_trace_id')),None),labels.get(net(e)),a,b)
