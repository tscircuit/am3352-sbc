import "bun-match-svg";
import { beforeAll, expect, test } from "bun:test";
import { Resvg } from "@resvg/resvg-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pcbLayers, pcbLayerSvg, renderPcbCheckpoint } from "./fixtures/pcb-snapshot";

let json: Awaited<ReturnType<typeof renderPcbCheckpoint>>;
const updating = process.argv.includes("--update-snapshots") || process.argv.includes("-u") || Boolean(process.env.BUN_UPDATE_SNAPSHOTS);

beforeAll(async () => {
  json = await renderPcbCheckpoint();
  // Visual regression is separate from routing signoff. The initial baseline
  // documents the inherited partial checkpoint, including its existing DDR.
}, 300000);

for (const layer of pcbLayers) {
  test(`DDR PCB checkpoint on ${layer}`, async () => {
    const svgPath = new URL(`./__snapshots__/pcb-snapshot-${layer}.snap.svg`, import.meta.url);
    const pngPath = new URL(`./__snapshots__/pcb-snapshot-${layer}.snap.png`, import.meta.url);
    // A missing baseline must fail CI, rather than quietly create a new one.
    if (!updating) {
      expect(existsSync(svgPath)).toBe(true);
      expect(existsSync(pngPath)).toBe(true);
    }
    await expect(pcbLayerSvg(json, layer)).toMatchSvgSnapshot(import.meta.path, layer);
    // Keep a GitHub-viewable PNG beside the tested SVG, generated from the
    // approved baseline so tolerance cannot make the review image stale.
    const png = new Resvg(readFileSync(svgPath)).render().asPng();
    if (updating) writeFileSync(pngPath, png);
    const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
    expect(hash(readFileSync(pngPath))).toBe(hash(png));
  }, 30000);
}
