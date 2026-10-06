"""Render candidate copper and run independent incremental acceptance checks.
An incomplete-board native exit is recorded, never treated as fabrication signoff.
"""
from pathlib import Path
import os, subprocess, json, shutil, hashlib, time
root=Path(__file__).resolve().parent.parent
os.chdir(root)
env={**os.environ,'PATH':str(root/'node_modules/.bin')+':'+os.environ['PATH'],'PYTHONPATH':'/tmp/am3352-geometry'}
results=[]
def run(label,args,extra=None):
 with (root/f'output/validation-{label}.log').open('w') as out:
  code=subprocess.call(args,env={**env,**(extra or {})},stdout=out,stderr=subprocess.STDOUT)
 results.append({'check':label,'exitCode':code});print(label,code,flush=True)
 return code
started=time.time()
native=run('native',['bun','scripts/build-board.tsx','--pairs-only','--no-images'])
p=root/'output/board-pairs.circuit.json'
if native not in [0,1] or not p.exists() or p.stat().st_mtime<started:raise SystemExit('Native render did not produce fresh circuit JSON')
# Incomplete ports are permitted at a checkpoint. Every other native DRC
# error (including dangling/missing traces and bus skew) blocks promotion.
run('native-errors',['python','scripts/audit-native-errors.py'])
shutil.copy2(p,root/'output/baseline.circuit.json')
checks=[('export',['bun','scripts/export-power-routing.ts'],{}),('physical',['python','scripts/route-remaining.py'],{'AUDIT_ONLY':'1','AUDIT_NATIVE':'1'}),('supply',['python','scripts/audit-supply-continuity.py'],{}),('clocks',['python','scripts/audit-clocks.py'],{}),('switching',['python','scripts/audit-switching-nodes.py'],{}),('geometry',['python','scripts/audit-new-copper.py'],{}),('references',['python','scripts/audit-reference-preservation.py'],{}),('replay',['bun','scripts/audit-control-replay.ts'],{}),('ddr-preservation',['bun','scripts/audit-checkpoint.ts','output/board-pairs.circuit.json'],{}),('pair-preservation',['bun','scripts/audit-peripheral-candidate.ts'],{})]
for label,args,extra in checks:
 code=run(label,args,extra)
 if code and label in ['export','physical']:break
success=len(results)==len(checks)+2 and all(r['exitCode']==0 for r in results[1:])
report={'circuitSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'incrementalAcceptancePass':success,'checks':results,'wholeBoardComplete':False,'fabricationReady':False}
(root/'output/routing-checkpoint-validation.json').write_text(json.dumps(report,indent=2)+'\n')
raise SystemExit(0 if success else 1)
