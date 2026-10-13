import type { ChipProps } from "@tscircuit/props"

type Model = NonNullable<ChipProps["cadModel"]>
type Plan = Record<string, unknown>

/** Verified public EasyEDA package meshes, in millimetres. Origins and rotations
 * align the package geometry with our native footprints; no output is patched.
 * Models: JLCEDA/EasyEDA official library (https://lceda.cn, https://easyeda.com),
 * served by https://modelcdn.tscircuit.com.
 */
function vendorModel(part: string, uuid: string, rotation = 0, z = 0): Model {
  const base = `https://modelcdn.tscircuit.com/easyeda_models/assets/${part}`
  return {
    objUrl: `${base}.obj?uuid=${uuid}`,
    stepUrl: `${base}.step?uuid=${uuid}`,
    pcbRotationOffset: rotation,
    modelOriginPosition: { x: 0, y: 0, z },
  }
}

export const am3352Model = vendorModel("C468247", "081c6ec87b3943f1b027fab412176686")
export const dcdcInductorModel = vendorModel("C337893", "969fb22dc7094eac9379f530d4c94913", 0, -0.475)
export const crystal24Model = vendorModel("C1985382", "d1c9d0d2edcb499188a681b0c3948089")
export const crystalRtcModel = vendorModel("C32346", "fd4574cdfbe94d00a9458103bda2310c")
export const uartBufferModel = vendorModel("C513290", "6ea22c8c81864639acb278665376373b", 90, -0.175)
export const auxFuseModel = vendorModel("C151139", "f9b4c9f684154bb3a64f336476a603d6")
export const auxPmosModel = vendorModel("C146352", "8be5fda0d7364805bb01db9e0d118709", 90)
export const hdmiTransmitterModel = vendorModel("C1543847", "b3d6d671025e423aa4f91802fa8ab101", 0, -0.6)
export const buzzerModel = vendorModel("C76871", "0ac8f332819b44678ed66cc8d843e3a0", 90)

const black = [0.08, 0.08, 0.09]
const metal = [0.72, 0.74, 0.77]
const gold = [0.85, 0.67, 0.25]
const color = (rgb: number[], shape: Plan): Plan => ({ type: "colorize", color: rgb, shape })
const box = (size: number[], center: number[]): Plan => ({ type: "cuboid", size, center })
const union = (shapes: Plan[]): Plan => ({ type: "union", shapes })
const native = (jscad: Plan): Model => ({ jscad, modelOriginPosition: { x: 0, y: 0, z: 0 } })

/** Bare PCB test pad: the footprint diameter and a nominal 35 µm metal face.
 * No fitted component or artificial plastic body is added. Finish is illustrative.
 */
export function testPadModel(diameter: number): Model {
  return native(color(metal, {
    type: "cylinder", radius: diameter / 2, height: 0.035,
    center: [0, 0, 0.0175], segments: 64,
  }))
}


/** Package approximations: deliberately local meshes, with native footprint pin
 * positions. These do not substitute for manufacturer mechanical drawings.
 * The header bodies and 0.64 mm square contacts use the selected XFCN sizes.
 */
function headerModel(columns: number, rows: number, alongY = false): Model {
  const bodySize = alongY ? [rows * 2.54, columns * 2.54, 2.5] : [columns * 2.54, rows * 2.54, 2.5]
  const pins: Plan[] = []
  for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
    const x = alongY ? (j - (rows - 1) / 2) * 2.54 : (i - (columns - 1) / 2) * 2.54
    const y = alongY ? ((columns - 1) / 2 - i) * 2.54 : (j - (rows - 1) / 2) * 2.54
    pins.push(color(gold, box([0.64, 0.64, 11.5], [x, y, 2.75])))
  }
  return native(union([color(black, box(bodySize, [0, 0, 1.25])), ...pins]))
}

export const jtagHeaderModel = headerModel(10, 2, true)
export const resetHeaderModel = headerModel(2, 1)
export const powerHeaderModel = headerModel(3, 1)

/** Right-angle USB-A package approximation, aligned with our SS-52100-001
 * socket footprint: opening towards -Y, signal row at Y=0, shell stakes at
 * X=±6.57/Y=-2.71. Native CAD anchors use the pad-bounds centre at Y=-1.705,
 * so the plan translates by +1.705 to retain the component placement origin.
 * The shell and plug opening are modelled, not a solid box.
 */
export const usbAModel = native({
  type: "translate", vector: [0, 1.705, 0], shape: union([
  color(metal, {
    type: "subtract",
    shapes: [box([12.5, 13.5, 7], [0, -5.74, 3.5]), box([11.7, 13.5, 5.7], [0, -5.99, 3.5])],
  }),
  color(black, box([11.4, 2.2, 4.3], [0, -0.35, 3.5])),
  color(black, box([10, 7.5, 1.4], [0, -7.7, 2.2])),
  ...[-3.5, -1, 1, 3.5].flatMap((x) => [
    color(gold, box([0.55, 7, 0.1], [x, -7.7, 2.95])),
    color(metal, box([0.55, 0.55, 4], [x, 0, -1])),
  ]),
  ...[-6.57, 6.57].map((x) => color(metal, box([0.8, 1.8, 4], [x, -2.71, -1]))),
  ]),
})

/** TZ-0807 RGB LED package approximation: 2×1.8 mm opaque carrier, top lens,
 * four terminals at the actual footprint pad centres. LED optical colours
 * are illustrative; the model does not simulate the configured LED colour.
 */
export const rgbLedModel = native(union([
  color([0.87, 0.87, 0.82], box([2, 1.8, 0.85], [0, 0, 0.475])),
  color([0.96, 0.92, 0.64], {
    type: "cylinder", radius: 0.65, height: 0.12, center: [0, 0, 0.96], segments: 24,
  }),
  ...[-0.962914, 0.962914].flatMap((x) => [-0.55499, 0.55499].map((y) =>
    color(gold, box([0.7, 0.65, 0.1], [x, y, 0.05])),
  )),
]))
