from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(9,7));names={e['source_trace_id']:e.get('name','') for e in c if e['type']=='source_trace'}
for e in c:
 if e['type']=='pcb_copper_pour' and e['layer']=='bottom':
  b=e['brep_shape'];g=Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]);g=g.intersection(box(-7,-11,1,-5))
  for p in g.geoms if g.geom_type=='MultiPolygon' else [g]:
   if p.is_empty:continue
   x,y=p.exterior.xy;ax.fill(x,y,color='#a3d4ed')
   for hole in p.interiors:x,y=hole.xy;ax.fill(x,y,color='white')
 if e['type']=='pcb_trace':
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']=='bottom':
    line=LineString([(a['x'],a['y']),(b['x'],b['y'])])
    if line.distance(Point(-2.89,-8))<1.5:
     name=names[e['source_trace_id']];color='red' if name.startswith('REMAINING_') else '#777777'
     ax.plot(*line.xy,color=color,lw=max(a['width']*15,1));p=line.interpolate(.5,normalized=True);ax.text(p.x,p.y,name,fontsize=6)
 if e['type']=='pcb_smtpad' and e['layer']=='bottom' and math.hypot(e['x']+2.89,e['y']+8)<4:
  g=box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2);x,y=g.exterior.xy;ax.fill(x,y,color='gold');ax.text(e['x'],e['y'],sc[pc[e['pcb_component_id']]['source_component_id']],fontsize=6)
ax.set_xlim(-7,1);ax.set_ylim(-11,-5);ax.set_aspect('equal');ax.set_title('Bottom CORE routing near C_U1_F6');fig.savefig(ROOT/'output/core-f6.png',dpi=180)
