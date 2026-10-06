import { readFile, writeFile } from "node:fs/promises";
// Keep the tsci-generated site, and add a single-file copy that can be opened
// directly without a web server or file:// fetch permissions.
const html = await readFile("dist/index.html", "utf8");
// Canvas is available on headless/older browsers as well as GPU desktops.
// Keep the original CLI index/bundle unchanged; only the portable copy defaults
// to Canvas. The viewer menu still allows WebGPU selection.
let originalBundle = await readFile("dist/standalone.min.js", "utf8");
if(originalBundle.startsWith("const names=")){const names=JSON.parse(originalBundle.slice(12,originalBundle.indexOf(";"))) as string[]; originalBundle=(await Promise.all(names.map(name=>readFile(`dist/${name}`,"utf8")))).join("");}
const bundle = originalBundle.replace(/renderer:(\w+)="webgpu"/, 'renderer:$1="canvas"');
const circuitPath = process.argv[2] ?? "index/circuit.json";
const circuit = await readFile(`dist/${circuitPath}`, "utf8");
const dataUrl = `data:application/json;base64,${Buffer.from(circuit).toString("base64")}`;
const tailwind = await readFile("output/tailwind-runtime.js", "utf8");
const portable = html
  .replace('<script src="https://cdn.tailwindcss.com"></script>', () => `<script>${tailwind.replaceAll("</script", "<\\/script")}</script>`)
  .replaceAll(JSON.stringify(`./${circuitPath}`), JSON.stringify(dataUrl))
  .replace('<script type="module" src="./standalone.min.js"></script>', () => `<script type="module">${bundle.replaceAll("</script", "<\\/script")}</script>`);
await writeFile("dist/board.html", portable);
console.log("dist/board.html: self-contained tsci site");
