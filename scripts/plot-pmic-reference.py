from pathlib import Path
root=Path(__file__).resolve().parent.parent
script=root/'scripts/route-power-distribution.py'
exec(compile(script.read_text().split("print('geometry loaded'")[0],str(script),'exec'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as Patch
fig,ax=plt.subplots(figsize=(13,10));area=box(-28,-10,-17,4)
for g,ls,n in geoms:
 if 'top' not in ls or not g.intersects(area):continue
 name=labels.get(n,n);color='red' if name in ['PMIC_TS','PMIC_PB'] else 'orange' if name=='DDR_1V5' else 'steelblue' if name=='V3V3' else 'gray'
 for p in g.geoms if hasattr(g,'geoms') else [g]:
  if p.geom_type=='Polygon' and not p.is_empty:ax.add_patch(Patch(list(p.exterior.coords),facecolor=color,alpha=.65))
ref=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());planes=[];lines=[]
for e in ref:
 if e['type']=='pcb_copper_pour' and e['layer']=='top':
  b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
 if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='inner1':lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
protected=unary_union(planes).intersection(unary_union(lines).buffer(.1))
for p in protected.geoms if hasattr(protected,'geoms') else [protected]:
 if p.geom_type=='Polygon':ax.add_patch(Patch(list(p.exterior.coords),facecolor='cyan',alpha=.45))
for t in terminals:
 if 'top' in t['layers'] and area.contains(Point(t['x'],t['y'])):ax.text(t['x'],t['y'],t['selector'].replace('.U2 > .',''),fontsize=5)
ax.set_xlim(-28,-17);ax.set_ylim(-10,4);ax.set_aspect('equal');fig.savefig(root/'output/pmic-access.png',dpi=170)
