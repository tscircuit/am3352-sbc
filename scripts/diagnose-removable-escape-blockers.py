"""Find local top escapes obstructed by reroutable control copper.
Diagnostic only: preserve all pads, saved DDR/pair nets, and existing reference copper.
"""
from pathlib import Path
exec(compile((Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0],str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
reference=json.loads((ROOT/'output/reference-baseline.audit.json').read_text());protected={}
for layer,outer in [('inner1','top'),('inner2','bottom')]:
 planes=[];lines=[]
 for e in reference:
  if e['type']=='pcb_copper_pour' and e['layer']==outer:
   b=e['brep_shape'];planes.append(Polygon([(p['x'],p['y']) for p in b['outer_ring']['vertices']], [[(p['x'],p['y']) for p in h['vertices']] for h in b['inner_rings']]))
  if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
   for a,b in zip(e['route'],e['route'][1:]):
    if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']==layer:lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
 protected[outer]=unary_union(planes).intersection(unary_union(lines).buffer(.1))
saved={net(e) for e in c if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_')}
pads=[]
for e in c:
 if e['type']!='pcb_smtpad':continue
 x,y=e.get('x',e.get('center',{}).get('x',0)),e.get('y',e.get('center',{}).get('y',0));r=e.get('radius',0);w,h=e.get('width',2*r),e.get('height',2*r)
 g=Point(x,y).buffer(r,quad_segs=32) if e.get('shape')=='circle' else Polygon([(p['x'],p['y']) for p in e['points']]) if e.get('points') else rotate(box(x-w/2,y-h/2,x+w/2,y+h/2),e.get('ccw_rotation',0),origin=(x,y))
 pads.append((g,e['layer'],net(e)))
allpads=unary_union([g.buffer(.16) for g,l,n in pads]);report=[]
for name in os.environ.get('ESCAPE_NETS','CAP_VDD_RTC,CAP_VDD_SRAM_CORE,EMU1,MMC0_DAT1,PMIC_POWER_EN,PWRONRSTn,RTC_RESETn,TRSTn,USB1_DRVVBUS,USB0_VBUS').split(','):
 t=next(t for t in terminals if labels.get(t['net'])==name and t['selector'].startswith('.U1 >'));n=t['net'];a=(t['x'],t['y']);area=Point(a).buffer(3)
 hard=[(g,ls,k) for g,ls,k in geoms if k!=n and (k in saved or k in ['hole','keepout']) and g.intersects(area)]
 soft=[(g,ls,k) for g,ls,k in geoms if k!=n and k not in saved and k not in ['hole','keepout'] and g.intersects(area)]
 tree=STRtree([g for g,ls,k in soft]);top=unary_union([g for g,ls,k in hard if 'top' in ls]+[g for g,l,k in pads if l=='top' and k!=n]).buffer(.153).union(protected['top'].buffer(.183));drill=unary_union([g for g,ls,k in hard]).buffer(.253).union(allpads).union(unary_union(list(protected.values())).buffer(.283))
 xx=a[0]+np.arange(-40,41)*.05;yy=a[1]+np.arange(-40,41)*.05;blocked=contains_xy(drill,xx[None,:],yy[:,None]);iy,ix=np.where(~blocked);results=[]
 for x,y in zip(ix,iy):
  b=(float(xx[x]),float(yy[y]));line=LineString([a,b]);distance=math.dist(a,b)
  if distance>2 or top.intersects(line):continue
  via=Point(b).buffer(.253);wire=line.buffer(.153);blockers={}
  for i in tree.query(via.union(wire)):
   g,ls,k=soft[int(i)]
   if via.intersects(g) or ('top' in ls and wire.intersects(g)):blockers[labels.get(k,k)]=blockers.get(labels.get(k,k),0)+1
  results.append({'site':b,'length':distance,'blockers':blockers})
 results.sort(key=lambda x:(len(x['blockers']),sum(x['blockers'].values()),x['length']));selected=[]
 for r in results:
  if any(math.dist(r['site'],q['site'])<.2 and r['blockers'].keys()==q['blockers'].keys() for q in selected):continue
  selected.append(r)
  if len(selected)==8:break
 row={'net':name,'pin':t['selector'],'sites':selected};report.append(row);print(json.dumps(row),flush=True)
(ROOT/'output/removable-escape-blockers084.json').write_text(json.dumps(report,indent=2)+'\n')
