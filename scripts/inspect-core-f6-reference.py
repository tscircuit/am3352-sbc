from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(10,8));names={e['source_trace_id']:e.get('name','') for e in c if e['type']=='source_trace'}
from matplotlib.patches import Polygon as PlotPolygon
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[]
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner2':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1)).intersection(box(-8,-12,4,-2))
for p in protected.geoms if hasattr(protected,'geoms') else [protected]:
 if p.geom_type=='Polygon':ax.add_patch(PlotPolygon(list(p.exterior.coords),facecolor='cyan',alpha=.4))
for g,ls,n in geoms:
 if 'bottom' not in ls or not g.intersects(box(-8,-12,4,-2)):continue
 for p in g.geoms if hasattr(g,'geoms') else [g]:
  if p.geom_type=='Polygon':ax.add_patch(PlotPolygon(list(p.exterior.coords),facecolor='red' if labels.get(n)=='VDD_CORE' else 'gray',alpha=.6))
for t in terminals:
 if t['selector'].startswith('.C_U1_') and 'bottom' in t['layers'] and -8<t['x']<4 and -12<t['y']<-2:ax.text(t['x'],t['y'],t['selector'],fontsize=5)
ax.set_xlim(-8,4);ax.set_ylim(-12,-2);ax.set_aspect('equal');ax.set_title('F6 CORE (red), foreign copper (gray), protected GND (cyan)');fig.savefig(ROOT/'output/core-f6-reference.png',dpi=180)
