import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.path import Path as MPath
from matplotlib.patches import PathPatch,Rectangle,Patch
r=Path(__file__).resolve().parent.parent;c=json.loads((r/'output/board-pairs.circuit.json').read_text());names={e['source_net_id']:e['name'] for e in c if e['type']=='source_net'};components={e['source_component_id']:e['name'] for e in c if e['type']=='source_component'}
fig,ax=plt.subplots(figsize=(10,8));colors={'DDR_1V5':'#489ac5','V3V3':'#dd9340'}
for e in c:
 if e['type']!='pcb_copper_pour' or e['layer']!='top':continue
 verts=[];codes=[];b=e['brep_shape']
 for ring in [b['outer_ring'],*b['inner_rings']]:
  points=[(p['x'],p['y']) for p in ring['vertices']]
  verts.extend(points+[points[0]]);codes.extend([MPath.MOVETO]+[MPath.LINETO]*(len(points)-1)+[MPath.CLOSEPOLY])
 ax.add_patch(PathPatch(MPath(verts,codes),facecolor=colors[names[e['source_net_id']]],edgecolor='none'))
for e in c:
 if e['type']=='pcb_component' and components.get(e['source_component_id']) in ['U1','U2','U3']:
  x,y=e['center']['x'],e['center']['y'];w,h=e['width'],e['height'];ax.add_patch(Rectangle((x-w/2,y-h/2),w,h,fill=False,lw=1.4,edgecolor='#1b2530'));ax.text(x,y,{'U1':'AM3352','U2':'PMIC','U3':'DDR3'}[components[e['source_component_id']]],ha='center',va='center',fontsize=9,bbox={'facecolor':'white','alpha':.9,'edgecolor':'none','pad':2})
ax.set_xlim(-50,50);ax.set_ylim(-40,40);ax.set_aspect('equal');ax.set_xlabel('mm');ax.set_ylabel('mm');ax.set_title('AM3352 SBC 0.1.3 — actual top-layer copper pours')
ax.legend(handles=[Patch(facecolor=color,label=name) for name,color in colors.items()],loc='upper right');fig.text(.5,.02,'0.30 mm rail separation · Bottom GND retained · Incomplete routing / not fabrication ready',ha='center',fontsize=10);fig.tight_layout(rect=(0,.04,1,1));fig.savefig(r/'output/power-regions.png',dpi=150)
