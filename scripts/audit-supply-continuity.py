"""Require physical continuity of every primary supply and ground network.
Run route-remaining.py with AUDIT_ONLY=1 AUDIT_NATIVE=1 immediately before this.
This checks emitted copper connectivity, not current capacity or impedance.
"""
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent.parent
circuit=(root/'output/baseline.circuit.json').read_bytes()
assert json.loads(circuit)==json.loads((root/'output/board-pairs.circuit.json').read_text()),'Native baseline is stale'
physical=json.loads((root/'output/physical-connectivity-audit.json').read_text())
assert physical['nativeOnly'] and physical['allViasThrough']
assert physical['circuitSha256']==hashlib.sha256(circuit).hexdigest(),'Physical audit is stale'
required=['GND','DDR_1V5','V3V3','V1V8','VDD_CORE','VDD_MPU','A3V3','RTC_1V8','VIN_5V','SYS_5V']
broken={r['net']:r for r in physical['remainingNetworks'] if r['net'] in required}
native=json.loads(circuit);netmap=json.loads((root/'output/copper-net-map.json').read_text())
present={e['name'] for e in native if e['type']=='source_net'}
missing=[n for n in required if n not in present]
native_errors=[]
for e in native:
 if e['type']!='pcb_port_not_connected_error':continue
 affected=[p for p in e['pcb_port_ids'] if netmap['labels'].get(netmap['identities'].get(p),'').removeprefix('ROUTED_') in required]
 if affected:native_errors.append({'errorId':e['pcb_port_not_connected_error_id'],'ports':affected})
report={'pass':not broken and not missing and not native_errors,'circuitSha256':physical['circuitSha256'],'requiredRails':required,'missingRails':missing,'disconnectedRails':broken,'nativeSupplyPortErrors':native_errors,'scope':'Physical continuity only; not current capacity, decoupling-loop or signal-integrity signoff.'}
(root/'output/supply-continuity-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'pass':report['pass'],'disconnectedRails':{n:r['components'] for n,r in broken.items()}}))
if not report['pass']:raise SystemExit(1)
