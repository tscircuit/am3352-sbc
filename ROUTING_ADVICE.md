# Routing dense BGA boards

- Define the layer stack and fabrication rules before routing: clearances, trace width, via dimensions, and drill spacing.
- Place the CPU, RAM, connectors, and decouplers; verify pad centers and pin-to-net mappings.
- Route DDR first. Save verified paths and preload them unchanged into later `<autoroutingphase />` stages.
- Assign `routingPhaseIndex` to named nets as well as direct traces.
- Fan out remaining BGA connections; route USB/TMDS, LCD, controls, and power in separate phases.
- Give every phase exact fixed copper, net ownership, and physical via barrels. Small capacitor moves can unblock escapes; avoid unintended via-in-pad.
- Repour, stitch ground, and remove physically floating islands.
- Check actual copper connectivity, clearances, drill spacing, and saved-route preservation. Endpoint labels alone do not prove contact.
