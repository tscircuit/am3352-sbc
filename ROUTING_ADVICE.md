# Routing dense BGA boards

- Define the layer stack and fabrication rules before routing: clearances, trace width, via dimensions, and drill spacing.
- Place the CPU, RAM, connectors, and decouplers; verify pad centers and pin-to-net mappings.
- Route DDR first with native `<autoroutingphase />` stages; let Core carry completed phase copper forward.
- Assign `routingPhaseIndex` to named nets as well as direct traces.
- Fan out remaining BGA connections; route USB/TMDS, LCD, controls, and power in separate phases.
- Keep whole-net ownership and full-stack via rules consistent. Recheck placement and decoupling after capacitor moves; avoid unintended via-in-pad.
- Use native phase caches where supported; retain source/settings and SRJ/debug checkpoints. Partial progress is not a completed phase.
- Repour, stitch ground, and check for physically floating islands.
- Check actual copper connectivity, clearances, drill spacing, and bus/pair timing. Endpoint labels alone do not prove contact.
