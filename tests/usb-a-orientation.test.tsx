import { expect, test } from "bun:test";
import { Circuit } from "@tscircuit/core";
import { checkConnectorAccessibleOrientation } from "@tscircuit/checks";
import { UsbA } from "../components/usb-a";

test("USB-A sockets rotated toward the top edge remain accessible", async () => {
  const circuit = new Circuit();
  circuit.add(
    <board width={100} height={80} routingDisabled schDisabled>
      <UsbA name="J_USB0" pcbX={16} pcbY={27} pcbRotation={180} />
      <UsbA name="J_USB1" pcbX={36} pcbY={27} pcbRotation={180} />
    </board>,
  );
  await circuit.renderUntilSettled();
  const json = circuit.getCircuitJson();
  const connectors = json.filter((element) => element.type === "pcb_component");
  expect(connectors).toHaveLength(2);
  for (const connector of connectors) {
    expect(connector.insertion_direction).toBe("from_top");
  }
  expect(checkConnectorAccessibleOrientation(json)).toHaveLength(0);
  expect(json.filter((element) => element.type === "pcb_connector_not_in_accessible_orientation_warning")).toHaveLength(0);
});

test("USB-A facing inward still produces an orientation warning", async () => {
  const circuit = new Circuit();
  circuit.add(
    <board width={100} height={80} routingDisabled schDisabled>
      <UsbA name="J_USB0" pcbX={16} pcbY={27} />
    </board>,
  );
  await circuit.renderUntilSettled();
  expect(checkConnectorAccessibleOrientation(circuit.getCircuitJson())).toMatchObject([
    { facing_direction: "y-", recommended_facing_direction: "y+" },
  ]);
});
