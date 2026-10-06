import {test,expect} from 'bun:test';
import {compactRoutingInput} from '../design/compact-routing-input';
test('compaction preserves active and fixed routing ownership and all physical geometry',()=>{
 const input:any={connections:[{name:'ddr',source_trace_id:'s1',pointsToConnect:[{x:0,y:0,layer:'top',pcb_port_id:'p1'}]}],traces:[{connection_name:'fixed',source_trace_id:'s2',route:[]}],obstacles:[{shape:'circle',center:{x:2,y:3},width:.3,height:.3,layers:['top','inner1','inner2','bottom'],connectedTo:['irrelevant-port','ddr','p1','s2','fixed','connectivity_net1','pad1'],circuitJsonMetadata:{pcb_smtpad_id:'pad1'}}]};
 const result=compactRoutingInput(input);
 expect(result.obstacles[0].connectedTo).toEqual(['ddr','p1','s2','fixed','connectivity_net1','pad1']);
 expect({...result.obstacles[0],connectedTo:[]}).toEqual({...input.obstacles[0],connectedTo:[]});
 expect(result.connections).toBe(input.connections);
 expect(input.obstacles[0].connectedTo).toContain('irrelevant-port');
});
