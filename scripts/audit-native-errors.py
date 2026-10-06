"""Block native faults and duplicate drill sites at incomplete routing checkpoints."""
from pathlib import Path
import json

def audit(circuit, async_errors):
 unexpected=[e['type'] for e in circuit if e['type'].endswith('_error') and e['type']!='pcb_port_not_connected_error']
 sites={}
 for e in circuit:
  if e['type']=='pcb_via':sites.setdefault((round(e['x'],7),round(e['y'],7)),[]).append(e['pcb_via_id'])
 duplicates=[{'x':x,'y':y,'viaIds':ids} for (x,y),ids in sites.items() if len(ids)>1]
 return {'pass':not unexpected and not async_errors and not duplicates,'unexpectedErrorTypes':unexpected,'asyncErrorCount':len(async_errors),'duplicateViaSites':duplicates}

if __name__=='__main__':
 root=Path(__file__).resolve().parent.parent
 result=audit(json.loads((root/'output/board-pairs.circuit.json').read_text()),json.loads((root/'output/board-pairs-summary.json').read_text())['asyncErrors'])
 (root/'output/native-error-acceptance.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result));raise SystemExit(0 if result['pass'] else 1)
