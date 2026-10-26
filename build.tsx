import { join } from "node:path"

const cli = join(import.meta.dir, "node_modules/tscircuit/cli.mjs")
const child = Bun.spawn([process.execPath, cli, "build", "index.circuit.tsx", ...process.argv.slice(2)], { cwd: import.meta.dir, stdout: "inherit", stderr: "inherit" })
process.exit(await child.exited)
