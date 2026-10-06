from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as Patch
fig,ax=plt.subplots(figsize=(12,9));area=box(-13,-6.5,-5,1)
for g,ls,n in geoms:
 if 'top' not in ls or not g.intersects(area):continue
 name=labels.get(n,n);color='orange' if name.startswith('DDR_') else 'red' if name.startswith('RTC_XTAL') else 'steelblue' if name.startswith(('VDD','V1','V3')) else 'gray'
 for p in g.geoms if hasattr(g,'geoms') else [g]:
  if p.geom_type=='Polygon' and not p.is_empty:ax.add_patch(Patch(list(p.exterior.coords),facecolor=color,alpha=.6))
for t in terminals:
 if 'top' in t['layers'] and area.contains(Point(t['x'],t['y'])):ax.text(t['x'],t['y'],t['selector'].replace('.U1 > .',''),fontsize=5)
source={e['source_trace_id']:e.get('name',e.get('display_name')) for e in c if e['type']=='source_trace'}
for e in c:
 if e['type']!='pcb_trace':continue
 for a,b in zip(e['route'],e['route'][1:]):
  if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='top':
   g=LineString([(a['x'],a['y']),(b['x'],b['y'])])
   if g.length and g.intersects(box(-8,-5,-6.5,-2)):
    p=g.intersection(area).representative_point();ax.text(p.x,p.y,source.get(e.get('source_trace_id'),e['pcb_trace_id']),fontsize=5,color='darkgreen')
ax.set_xlim(-13,-5);ax.set_ylim(-6.5,1);ax.set_aspect('equal');fig.savefig(ROOT/'output/rtc-escape.png',dpi=150)
