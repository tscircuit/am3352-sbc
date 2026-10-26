# Routing dense BGA boards

- Declare stackup, clearances, trace widths, via drill/land sizes, and timing limits first.
- Check placement, pin mapping, and decoupler access before routing.
- Reserve BGA fanout space for reset/reference/calibration; finish support trunks after DDR when they crowd its corridor. Consider both outer lands of through vias.
- Use native `<autoroutingphase />` stages. Keep matched groups intact and assign whole named nets; declare `autorouter="bus_lanes"` for custom bus routers so earlier traces arrive as exact fixed copper.
- Route DDR, USB/TMDS, display, controls, power, then ground. Reopen earlier cohorts when blocked; retain SRJ diagnostics.
- Repour and stitch ground, inspect islands and return paths, then validate final connectivity, clearances, and timing.
