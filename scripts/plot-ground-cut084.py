from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import PathPatch,Circle
from matplotlib.path import Path as MPath
fig,ax=plt.subplots(figsize=(10,10))
for e in c:
 if e['type']!='pcb_copper_pour' or e['layer']!='bottom':continue
 b=e['brep_shape'];rings=[b['outer_ring']]+b['inner_rings'];verts=[];codes=[]
 for ring in rings:
  pts=[(p['x'],p['y']) for p in ring['vertices']];verts+=pts+[pts[0]];codes += [MPath.MOVETO]+[MPath.LINETO]*(len(pts)-1)+[MPath.CLOSEPOLY]
 ax.add_patch(PathPatch(MPath(verts,codes),facecolor='#a5caaa',edgecolor='#447744',lw=.25,alpha=.6))
r=next(r for r in json.loads((ROOT/'design/control-routes.json').read_text()) if r['name']=='REMAINING_363')
for a,b in zip(r['route'],r['route'][1:]):
 if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='bottom':ax.plot([a['x'],b['x']],[a['y'],b['y']],color='#ca3333',lw=2)
for v in ['PG_VIA_0','PG_VIA_12']:
 a=next(x for x in esc['vias'] if x['name']==v);ax.add_patch(Circle((a['x'],a['y']),.15,color='#111'));ax.text(a['x']+.2,a['y'],v,fontsize=9)
ax.set_xlim(-12,2);ax.set_ylim(-2,17);ax.set_aspect('equal');ax.grid(alpha=.2);ax.set_title('Candidate 084: TRSTn cuts bottom GND — rejected until repaired')
fig.tight_layout();fig.savefig(ROOT/'output/ground-cut084.png',dpi=150)
