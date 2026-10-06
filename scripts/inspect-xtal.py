from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as PP
fig,axs=plt.subplots(1,2,figsize=(16,8));area=box(4,-2,16,7)
for ax in axs:
 for g,ls,n in geoms:
  if 'top' not in ls or not g.intersects(area):continue
  for p in g.geoms if hasattr(g,'geoms') else [g]:
   if p.geom_type=='Polygon' and not p.is_empty:ax.add_patch(PP(list(p.exterior.coords),facecolor={'XTALIN':'orange','XTALOUT':'red'}.get(labels.get(n),'gray'),alpha=.65))
 for t in terminals:
  if 'top' in t['layers'] and area.contains(Point(t['x'],t['y'])):ax.text(t['x'],t['y'],t['selector'],fontsize=5)
 ax.set_xlim(4,16);ax.set_ylim(-2,7);ax.set_aspect('equal')
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());lines=[];planes=[]
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='top':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner1':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1)).intersection(area)
for p in protected.geoms if hasattr(protected,'geoms') else [protected]:
 if p.geom_type=='Polygon' and not p.is_empty:axs[1].add_patch(PP(list(p.exterior.coords),facecolor='cyan',alpha=.65))
axs[0].set_title('Clock pins and existing top copper');axs[1].set_title('Protected reference copper under inner1 signals (cyan)');fig.savefig(ROOT/'output/clock-top.png',dpi=160)
