from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as Patch
fig,axs=plt.subplots(1,2,figsize=(14,8));area=box(17,-12,22,-8)
for ax,layer in zip(axs,['top','bottom']):
 for g,ls,n in geoms:
  if layer not in ls or not g.intersects(area):continue
  label=labels.get(n,'');color='orange' if label.startswith('DDR_') else 'red' if label in ['LCD_DATA5','LCD_DATA6','LCD_DATA8','LCD_VSYNC'] else 'steelblue' if label.startswith('LCD') else 'gray'
  for p in g.geoms if hasattr(g,'geoms') else [g]:
   if p.geom_type=='Polygon' and not p.is_empty:ax.add_patch(Patch(list(p.exterior.coords),facecolor=color,alpha=.6))
 for t in terminals:
  if layer in t['layers'] and area.contains(Point(t['x'],t['y'])):ax.text(t['x'],t['y'],t['selector'].replace('.U1 > .',''),fontsize=5)
 ax.set_xlim(17,22);ax.set_ylim(-12,-8);ax.set_aspect('equal');ax.set_title(layer)
fig.savefig(ROOT/'output/hdmi-data13.png',dpi=160)
