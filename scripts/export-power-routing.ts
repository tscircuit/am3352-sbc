import { getFullConnectivityMapFromCircuitJson } from 'circuit-json-to-connectivity-map';
import { getPrimaryId } from '@tscircuit/circuit-json-util';
import { createHash } from 'node:crypto';
const circuit = await Bun.file('output/baseline.circuit.json').json();
const map = getFullConnectivityMapFromCircuitJson(circuit);
const identities: Record<string, string> = {};
const labels: Record<string, string> = {};
for (const e of circuit) {
  const id = getPrimaryId(e);
  const net = map.getNetConnectedToId(id);
  if (net) identities[id] = net;
  if (e.type === 'source_net' && net) labels[net] = e.name;
}
// Normalize geometric ownership from the emitted source-net key; pours
// are not nodes in the trace connectivity map.
const keys = new Map<string,string>();
for (const e of circuit) {
  if (!e.type.startsWith('source_') || !e.subcircuit_connectivity_map_key) continue;
  const id=getPrimaryId(e); const owner=identities[id];
  if (owner) keys.set(e.subcircuit_connectivity_map_key,owner);
}
for (const e of circuit) {
  if (e.type==='pcb_via' && keys.has(e.subcircuit_connectivity_map_key)) identities[e.pcb_via_id]=keys.get(e.subcircuit_connectivity_map_key)!;
  if (e.type==='pcb_copper_pour' && identities[e.source_net_id]) identities[e.pcb_copper_pour_id]=identities[e.source_net_id];
}
const circuitSha256=createHash('sha256').update(new Uint8Array(await Bun.file('output/baseline.circuit.json').arrayBuffer())).digest('hex');
await Bun.write('output/copper-net-map.json', JSON.stringify({identities, labels, circuitSha256}));
console.log({netIdentities:Object.keys(identities).length});
