## UART, programming and reset

Connect J_UART to the standard-jst-programmer v0.8 UART socket with a straight
three-way JST SH cable: board **1 RX, 2 GND, 3 TX**. Use **3.3 V UART,
115200 8N1, CDC0 with DTR enabled**. The dual Ioff buffer prevents UART
back-powering when the SBC is off. Keep the programmer USB-powered while
UART is connected to a powered SBC. J_RESET gives a warm reset; remove board
power for a complete PMIC/RTC restart.

Use the current v0.8 UART-bridge firmware; the older v0.5 UF2 lacks this bridge.

Use a board-specific SPL/U-Boot with matching DDR, PMIC and 24 MHz clock settings.
Normally write the software image to microSD. For ROM UART recovery, remove
the card, ensure SPI0 has no bootable image, prepare a CRC XMODEM SPL transfer
at 115200, then cold-power the board. UART does not directly write an SD image.
JTAG is
optional for these workflows but is useful for low-level debugging. AM3352
requires a full JTAG probe supporting AM335x/Cortex-A8; **ST-LINK V2 and SWD
are incompatible**, even through an adapter. Retain the ARM20 connector for
a suitable future probe with a matching ARM20 cable. Use fixed, slow TCK with
adaptive clocking disabled; pin 11 is grounded because AM3352 has no RTCK.

## Auxiliary power

J_AUX_PWR is JST SH two-pin: **1 +5 V, 2 GND**. Use an external regulated
5 V supply (4.75–5.25 V at the connector) and a matching cable; the auxiliary input uses a **1 A fast fuse**
and reverse-polarity protection. Set the external supply current limit no higher than **0.75 A at 25 °C**
with a straight-through **SH crimp AWG28 cable**, and derate further when hot.
SR/SZ IDC AWG30 cables fit but are rated only **0.7 A**; use a lower limit
with those cables. The fuse is not a current limiter. Move the source shunt from **USB 1–2**
to **AUX 2–3** with supplies disconnected. Use one shunt; never join all
three pins. USB is the default source. The current draft power copper still
requires board-level current and thermal qualification; do not assume a 3 A
path from the selector/shunt rating.
Fit the separate 3 A 2.54 mm shunt (C5305) at USB 1–2 during assembly;
there is no board power path when the shunt is absent.

**Do not power this SBC from the standard programmer's power output**: its
recommended target current is only 50 mA. The JST matches its cable pinout,
but the SBC needs more current. Keep USB/peripherals/LEDs disabled during
auxiliary bring-up and verify the actual input current stays within the
auxiliary supply, cable and fuse limits before enabling more loads.

Verify VIN_5V remains at least 4.3 V under load.
