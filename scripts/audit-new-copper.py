"""Independent incremental audit of emitted copper against foreign copper.
All coordinates and widths come from the native circuit JSON, not router state.
"""
from pathlib import Path
loader=(Path(__file__).parent/'route-power-distribution.py').read_text().split("print('geometry loaded'")[0]
exec(compile(loader,str(Path(__file__).parent/'route-power-distribution.py'),'exec'))
from collections import Counter
from shapely.strtree import STRtree
original=json.loads((ROOT/'output/reference-baseline.audit.json').read_text())
def trace_geometry(e):
 return tuple(tuple((k,round(v,8) if isinstance(v,(float,int)) else v) for k,v in sorted(p.items()) if k not in ['start_pcb_port_id','end_pcb_port_id','pcb_port_id','layers']) for p in e['route'])
def via_geometry(e):
 return (round(e['x'],8),round(e['y'],8),e['outer_diameter'],e['hole_diameter'],tuple(sorted(e['layers'])))
old_trace_geometry={trace_geometry(e) for e in original if e['type']=='pcb_trace'}
old_via_geometry={via_geometry(e) for e in original if e['type']=='pcb_via'}
changed_trace_ids={e['pcb_trace_id'] for e in c if e['type']=='pcb_trace' and trace_geometry(e) not in old_trace_geometry}
changed_via_ids={e['pcb_via_id'] for e in c if e['type']=='pcb_via' and via_geometry(e) not in old_via_geometry}
new_sources={e['source_trace_id'] for e in c if e['type']=='source_trace' and e.get('name','').startswith('REMAINING_')}
new_ids={e["pcb_trace_id"] for e in c if e["type"]=="pcb_trace" and (e.get("source_trace_id") in new_sources or e["pcb_trace_id"].startswith("saved_control_"))}
new_ids.update(changed_trace_ids)
new=[]
for e in c:
 if e['type']=='pcb_trace' and e.get('pcb_trace_id') in new_ids:
  for a,b in zip(e['route'],e['route'][1:]):
   if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer'] and (a['x'],a['y'])!=(b['x'],b['y']):new.append((LineString([(a['x'],a['y']),(b['x'],b['y'])]).buffer(max(a['width'],b['width'])/2,quad_segs=16),[a['layer']],net(e),e['pcb_trace_id']))
 if e['type']=='pcb_via' and (e.get('source_trace_id') in new_sources or e.get('pcb_trace_id') in new_ids or e['pcb_via_id'] in changed_via_ids):new.append((Point(e['x'],e['y']).buffer(e['outer_diameter']/2,quad_segs=32),e['layers'],net(e),e['pcb_via_id']))
# Include changed SMT pads in the incremental geometry audit, not just traces.
original=json.loads((ROOT/'output/reference-baseline.audit.json').read_text())
old_sc={e['source_component_id']:e['name'] for e in original if e['type']=='source_component'}
old_pc={e['pcb_component_id']:old_sc.get(e['source_component_id']) for e in original if e['type']=='pcb_component'}
def pad_key(e, names):return (names.get(e['pcb_component_id']),tuple(e.get('port_hints',[])))
def pad_shape(e):
 assert e['shape'] in ('rect','rotated_rect'), f"Unsupported changed pad shape: {e['shape']}"
 return rotate(box(e['x']-e['width']/2,e['y']-e['height']/2,e['x']+e['width']/2,e['y']+e['height']/2),e.get('ccw_rotation',0),origin=(e['x'],e['y']))
old_pads={pad_key(e,old_pc):e for e in original if e['type']=='pcb_smtpad'}
new_pc={k:sc.get(v['source_component_id']) for k,v in pc.items()}
changed_pads=[]
for e in c:
 if e['type']!='pcb_smtpad':continue
 before=old_pads.get(pad_key(e,new_pc))
 if before and any(e.get(k)!=before.get(k) for k in ['shape','x','y','width','height','ccw_rotation','layer']):
  changed_pads.append(e['pcb_smtpad_id'])
  new.append((pad_shape(e),[e['layer']],net(e),e['pcb_smtpad_id']))
tree=STRtree([g for g,ls,n in geoms]);violations=[];minimum=math.inf
for g,ls,n,id in new:
 for j in tree.query(g.buffer(.5)):
  h,layers,k=geoms[int(j)]
  if k==n or not set(ls)&set(layers):continue
  gap=g.distance(h);minimum=min(minimum,gap)
  if gap<.0999:violations.append({'conductor':id,'net':labels.get(n,n),'other':labels.get(k,k),'gapMm':gap,'layers':list(set(ls)&set(layers))})
# Geometry of separate net pours must not intersect each other.
pours=[]
for e in c:
 if e['type']=='pcb_copper_pour':
  b=e['brep_shape'];pours.append((Polygon([(v['x'],v['y']) for v in b['outer_ring']['vertices']], [[(v['x'],v['y']) for v in h['vertices']] for h in b['inner_rings']]),e['layer'],e['source_net_id']))
pour_gaps=[a.distance(b) for i,(a,l,n) in enumerate(pours) for b,ll,nn in pours[:i] if l==ll and n!=nn]
counts=Counter(e['type'] for e in c if e['type'].endswith('_error'))
report={'changedTraces':len(changed_trace_ids),'changedVias':len(changed_via_ids),'changedPads':changed_pads,'newConductors':len(new),'minimumForeignCopperClearanceMm':minimum if math.isfinite(minimum) else None,'violations':violations,'minimumDifferentRailPourGapMm':min(pour_gaps,default=None),'nativeErrorCounts':dict(counts),'independentIncrementalGeometryPass':not violations and all(g>=.0999 for g in pour_gaps),'wholeBoardComplete':False,'fabricationReady':False}
(ROOT/'output/new-copper-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({**report,'violations':violations[:5]}),flush=True)
if not report['independentIncrementalGeometryPass']:raise SystemExit(1)
