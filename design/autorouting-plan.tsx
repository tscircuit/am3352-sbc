import { withAutorouterCache } from "@tscircuit/core"
import {createSupportNetTreeAutorouter, createPreDdrSupportAutorouter} from "../routing/support-net-tree"
import {createEarlyLcdEscapes} from "../routing/early-lcd-escapes"
import { createPeripheralAutorouter } from "../routing/peripheral-autorouter"
import { Fragment } from "react"
import { createSharedDdrAutorouter } from "../routing/shared-ddr-autorouter"
import { createFutureBgaEscapes } from "../routing/future-bga-escapes"
import { cpuConnections, ramConnections, sharedNets } from "./ddr-netlist"
import { ddrByteSignals, ddrTimingGroups } from "./ddr-rules"

// Each entry owns the whole electrical net, including pullups and other branches.
const earlyNets = [
  "DDR_VREF", "DDR_VTP", "DDR_ZQ",
  "CAP_VDD_RTC", "CAP_VDD_SRAM_CORE", "CAP_VDD_SRAM_MPU", "CAP_VBB_MPU",
  "XTALIN", "XTALOUT", "RTC_XTALIN", "RTC_XTALOUT",
] as const

const controlNets = [
  "UART0_TXD", "UART0_RXD", "UART0_TXD_DEBUG", "UART0_RXD_DEBUG",
  "UART0_TXD_CABLE", "UART0_RXD_CABLE",
  "TRSTn", "TMS", "TDI", "TDO", "TCK", "EMU0", "EMU1",
  "WARMRSTn", "PWRONRSTn", "RTC_RESETn", "PMIC_POWER_EN",
  "I2C0_SCL", "I2C0_SDA",
  "MMC0_CLK", "MMC0_CMD", "MMC0_DAT0", "MMC0_DAT1", "MMC0_DAT2", "MMC0_DAT3", "SD_CD",
  "PD_CC1", "PD_CC2", "PD_GATE", "PD_PGn", "PD_SENSE",
  "PMIC_BYPASS", "PMIC_INT_LDO", "PMIC_TS", "PMIC_PB",
  "USB0_DRVVBUS", "USB0_OCn", "USB1_DRVVBUS", "USB1_OCn",
  "HDMI_HPD", "HDMI_HPD_5V", "HDMI_SCL", "HDMI_SDA", "HDMI_TFADJ", "HDMI_ESD_BYP",
  "SW1", "SW2", "SW3", "SPI0_D0", "RGB_BUFFERED", "RGB_DIN", "RGB_CHAIN",
  "BUZZ_PWM", "BUZZ_GATE", "BUZZ_DRAIN",
] as const

const powerNets = [
  "DDR_1V5", "VDD_CORE", "VDD_MPU", "V1V8", "V3V3", "A3V3", "RTC_1V8",
  "SYS_5V", "VIN_5V", "AUX_5V", "AUX_5V_FUSED", "AUX_5V_PROTECTED",
  "USB_PD_SWITCHED", "PD_VBUS", "PD_VDD", "USB0_VBUS", "USB1_VBUS",
  "HDMI_5V", "HDMI_PVDD", "HDMI_TVDD",
] as const

const lcdNets = [
  ...Array.from({ length: 16 }, (_, bit) => `LCD_DATA${bit}`),
  "ROUTED_LCD_AC_BIAS_EN", "ROUTED_LCD_HSYNC", "ROUTED_LCD_PCLK", "ROUTED_LCD_VSYNC",
]

/** Existing named nets only; trace-only DDR/USB/TMDS names need no new net declarations. */
export const namedRoutingNets = [
  ...earlyNets, ...controlNets, ...powerNets, ...lcdNets, "DDR_RESETn", "GND",
]

const earlyPhases = earlyNets.map((name, index) => ({ name, index: (200 + index) / 100 }))
const controlPhases = controlNets.map(name => ({ name, index: 5 }))
const powerPhases = powerNets.map(name => ({ name, index: 6 }))
const individualPhases = [...earlyPhases, ...controlPhases, ...powerPhases]
const phaseByNet = new Map<string, number>(individualPhases.map(phase => [phase.name, phase.index]))
const ddrNets = new Set(sharedNets)
const byte1Nets = new Set(ddrByteSignals(1))
const byte0Nets = new Set(ddrByteSignals(0))

export function phaseForNet(net: string): number {
  if (["DDR_VTP", "DDR_ZQ"].includes(net)) return 0.75
  if (["XTALIN", "XTALOUT", "RTC_XTALIN", "RTC_XTALOUT", "RTC_RESETn"].includes(net)) return 1
  if (net === "GND") return 7
  if (net === "DDR_RESETn" || net === "DDR_RESETn_SIGNAL") return 1.9
  if (byte1Nets.has(net)) return 1
  if (byte0Nets.has(net)) return 1
  if (ddrNets.has(net)) return 1
  if (/^(?:LCD_DATA(?:[0-9]|1[0-5])(?:_SIGNAL)?|(?:ROUTED_)?LCD_(?:AC_BIAS_EN|HSYNC|PCLK|VSYNC))$/.test(net) || net.startsWith("BOOT_")) return 1
  if (/^(?:USB[01]_(?:DP|DM)_(?:CPU|PORT)|TMDS_(?:CK|D[012])_[PN]_(?:TX|PORT))$/.test(net)) return 3
  const phase = phaseByNet.get(net)
  if (phase === undefined) throw new Error(`No autorouting phase declared for net ${net}`)
  return phase
}

const earlyEscapeNets = new Set(["DDR_RESETn", "DDR_VREF", "DDR_VTP", "DDR_ZQ", "CAP_VDD_RTC", "CAP_VDD_SRAM_CORE", "CAP_VDD_SRAM_MPU", "CAP_VBB_MPU"])
const earlyEscapePorts = [...cpuConnections.filter(c => earlyEscapeNets.has(c.net)).map(c => `.U1 > .${c.pin}`), ...ramConnections.filter(c => c.net && earlyEscapeNets.has(c.net)).map(c => `.U3 > .${c.pin}`)]
const cachedSupportRouter = withAutorouterCache(createSupportNetTreeAutorouter, "am3352-support-four-layer-3996eaa9649468ad-v1")
const cachedPreDdrSupportRouter = withAutorouterCache(createPreDdrSupportAutorouter, "am3352-pre-ddr-support-3996eaa9649468ad-v1")
const cachedDdrRouter = withAutorouterCache(createSharedDdrAutorouter, "am3352-ddr-joint-future-9ad206f969baeb53-v1", {
  followUpAutorouter: { preset: "bus_lanes", algorithmFn: cachedSupportRouter },
})

const cachedPeripheralRouter = withAutorouterCache(createPeripheralAutorouter, "am3352-peripheral-141340cca2de5f97-d77f0030965154dc-v1")

const cachedEarlyLcdEscapes=withAutorouterCache(createEarlyLcdEscapes,"am3352-early-lcd-dogbone-pr6-v1")

const cachedLateLcdEscapes=withAutorouterCache(createEarlyLcdEscapes,"am3352-late-lcd-dogbone-pr6-v1",{followUpAutorouter:"default"})

export function AutoroutingPlan() {
  return <>
    <autoroutingphase name="PRESERVE_VTP_ZQ_ACCESS" phaseIndex={0.75} connections={["net.DDR_VTP", "net.DDR_ZQ"]} autorouter="bus_lanes" algorithmFn={cachedPreDdrSupportRouter} />
    <autoroutingphase name="DDR_CRITICAL_THEN_SUPPORT" phaseIndex={1} autorouter="bus_lanes" connections={[...ddrTimingGroups.flatMap(group => group.signals).map(name => "trace."+name), ...Array.from({length:16},(_,bit)=>"trace.LCD_DATA"+bit+"_SIGNAL"), ...["LCD_PCLK","LCD_HSYNC","LCD_VSYNC","LCD_AC_BIAS_EN"].map(name=>"trace."+name), ...["XTALIN","XTALOUT","RTC_XTALIN","RTC_XTALOUT","RTC_RESETn"].map(name=>"net."+name), "trace.DDR_RESETn_SIGNAL", ...[...earlyEscapeNets].filter(net => !["DDR_VTP", "DDR_ZQ"].includes(net)).map(net => "net."+net)]} algorithmFn={cachedDdrRouter} />
    <autoroutingphase name="DDR_RESET" phaseIndex={1.9} autorouter="bus_lanes" algorithmFn={cachedSupportRouter} />
    {earlyPhases.map(phase => <Fragment key={phase.name}>
      <autoroutingphase name={`ROUTE_${phase.name}`} phaseIndex={phase.index} autorouter="bus_lanes" algorithmFn={cachedSupportRouter} />
    </Fragment>)}
    <autoroutingphase name="USB_AND_TMDS" phaseIndex={3} autorouter="bus_lanes" algorithmFn={cachedPeripheralRouter} />
    <autoroutingphase name="LCD_AND_BOOT" phaseIndex={4} />
    <autoroutingphase name="CONTROLS_AND_PROGRAMMING" phaseIndex={5} />
    <autoroutingphase name="POWER_DISTRIBUTION" phaseIndex={6} />
    <autoroutingphase name="GROUND" phaseIndex={7} autorouter="fanout"
      fanoutRoutingLayers={["top", "bottom"]} fanoutPourNetMap={{ inner1: ["GND"] }} />
  </>
}
