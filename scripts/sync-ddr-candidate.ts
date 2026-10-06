/** Build the exact reviewed solver source into a self-contained board import.
 * No registry credentials or source-patched published bundles are used. */
import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
const root=resolve(process.env.DDR_SOLVER_WORKTREE??"../bus-lanes-length-limits");
async function sourceHash(){
 const source=createHash("sha256");
 for(const path of [...new Bun.Glob("lib/**/*.ts").scanSync(root)].sort())source.update(path).update("\n").update(await readFile(resolve(root,path))).update("\n");
 return source.digest("hex");
}
const before=await sourceHash();
const build=Bun.spawn([process.execPath,"run","build"],{cwd:root,stdout:"pipe",stderr:"pipe"});
const [stdout,stderr,status]=await Promise.all([new Response(build.stdout).text(),new Response(build.stderr).text(),build.exited]);
if(status!==0)throw new Error(`Candidate build failed (${status}): ${stderr.slice(-2000)}`);
if(before!==await sourceHash())throw new Error("Solver sources changed during candidate build; retry without concurrent edits");
const git=Bun.spawnSync(["git","rev-parse","HEAD"],{cwd:root,stdout:"pipe",stderr:"pipe"});
if(git.exitCode!==0)throw new Error("Cannot identify solver source commit");
const bundle=await readFile(resolve(root,"dist/index.js")),types=await readFile(resolve(root,"dist/index.d.ts"));
const directory=resolve("design/vendor");await mkdir(directory,{recursive:true});
await writeFile(resolve(directory,"bus-lanes-candidate.js"),bundle);
await writeFile(resolve(directory,"bus-lanes-candidate.d.ts"),types);
const provenance={repository:"https://github.com/tscircuit/bus-lanes-solver",baseCommit:git.stdout.toString().trim(),sourceSha256:before,bundleSha256:createHash("sha256").update(bundle).digest("hex"),declarationsSha256:createHash("sha256").update(types).digest("hex"),packageVersion:JSON.parse(await readFile(resolve(root,"package.json"),"utf8")).version,sourceState:"candidate; identify exact source with sourceSha256"};
await writeFile(resolve(directory,"bus-lanes-candidate.provenance.json"),JSON.stringify(provenance,null,2)+"\n");
console.log(JSON.stringify({candidateSource:provenance.sourceSha256,bundle:provenance.bundleSha256}));
