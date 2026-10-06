import json
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
root=Path(__file__).resolve().parent.parent
base=json.loads((root/'output/reference-baseline.audit.json').read_text());c=json.loads((root/'output/baseline.circuit.json').read_text())
def pours(c,layer):
 return unary_union([Polygon([(v['x'],v['y']) for v in e['brep_shape']['outer_ring']['vertices']], [[(v['x'],v['y']) for v in h['vertices']] for h in e['brep_shape']['inner_rings']]) for e in c if e['type']=='pcb_copper_pour' and e['layer']==layer])
report=[]
for layer,reference in [('inner1','top'),('inner2','bottom')]:
 lines=[]
 for e in base:
  if e['type']=='pcb_trace' and e['pcb_trace_id'].startswith('saved_phase_'):
   for a,b in zip(e['route'],e['route'][1:]):
    if a['route_type']==b['route_type']=='wire' and a['layer']==b['layer']==layer:lines.append(LineString([(a['x'],a['y']),(b['x'],b['y'])]))
 corridor=unary_union(lines).buffer(.1)
 lost=pours(base,reference).difference(pours(c,reference)).intersection(corridor)
 report.append({'signalLayer':layer,'referenceLayer':reference,'additionalReferenceVoidAreaMm2':lost.area,'pass':lost.area<1e-5})
result={'referenceChanges':report,'pass':all(r['pass'] for r in report),'scope':'No added reference-plane voids within 0.1 mm of saved inner-layer signal centerlines; does not certify existing return paths.'}
(root/'output/reference-preservation-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
if not result['pass']:raise SystemExit(1)
