from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as Patch
fig,axes=plt.subplots(1,2,figsize=(15,8));area=box(-8,1,-1,8)
for ax,layer in zip(axes,['top','bottom']):
 for g,ls,n in geoms:
  if layer not in ls or not g.intersects(area):continue
  parts=list(g.geoms) if hasattr(g,'geoms') else [g]
  for p in parts:
   if p.geom_type=='Polygon':ax.add_patch(Patch(list(p.exterior.coords),color=('#888888' if labels.get(n)=='GND' else '#df9440' if labels.get(n)=='V3V3' else '#337ab7'),alpha=.65,lw=.2))
 for t in terminals:
  if t['selector'].startswith('.U1 >') and layer=='top' and area.contains(Point(t['x'],t['y'])):ax.text(t['x'],t['y'],t['selector'].split('.')[-1],fontsize=7,ha='center',va='center')
 if layer=='bottom':
  for e in pc.values():
   if sc.get(e['source_component_id'],'').startswith('C_U1_') and area.contains(Point(e['center']['x'],e['center']['y'])):ax.text(e['center']['x'],e['center']['y'],sc[e['source_component_id']].removeprefix('C_U1_'),fontsize=8,color='black')
 ax.set_xlim(-8,-1);ax.set_ylim(1,8);ax.set_aspect('equal');ax.set_title(layer+' CPU southwest access');ax.grid(alpha=.2)
fig.tight_layout();fig.savefig(ROOT/'output/bga-access082.png',dpi=150)
