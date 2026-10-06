import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('native_acceptance',Path(__file__).resolve().parents[1]/'scripts/audit-native-errors.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class NativeAcceptanceTest(unittest.TestCase):
 def test_replayed_barrel_must_not_create_a_second_drill(self):
  a={'type':'pcb_via','pcb_via_id':'escape','x':-4.8,'y':3.35}
  self.assertTrue(module.audit([a],[])['pass'])
  result=module.audit([a,{**a,'pcb_via_id':'feeder','x':-4.799999999999997}],[])
  self.assertFalse(result['pass']);self.assertEqual(result['duplicateViaSites'][0]['viaIds'],['escape','feeder'])
 def test_partial_checkpoint_permits_only_unconnected_ports(self):
  self.assertTrue(module.audit([{'type':'pcb_port_not_connected_error'}],[])['pass'])
  for kind in ['pcb_trace_error','pcb_trace_missing_error','pcb_pad_trace_clearance_error']:
   self.assertFalse(module.audit([{'type':kind}],[])['pass'])
  self.assertFalse(module.audit([],['router failed'])['pass'])
