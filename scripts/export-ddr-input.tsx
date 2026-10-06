import {Circuit} from "@tscircuit/core";
import {writeFileSync} from "node:fs";
import Board from "../index.circuit";
import {compactRoutingInput} from '../design/compact-routing-input';
const circuit=new Circuit();circuit.schematicDisabled=true;
circuit.on("autorouting:start", event=>{
 writeFileSync("output/ddr-current.srj.json",JSON.stringify(compactRoutingInput(event.simpleRouteJson as any)));
 writeFileSync("output/ddr-current.circuit.json",JSON.stringify(circuit.getCircuitJson()));
 console.log(`Exported ${event.simpleRouteJson.connections.length} DDR connections with current supply copper`);
 process.exit(0);
});
circuit.add(<Board ddrRoutes={[]} solveDdr />);
await circuit.renderUntilSettled();
throw new Error("No routing input was emitted");
