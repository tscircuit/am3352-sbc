import {createRequire} from 'node:module'
globalThis.require=createRequire(new URL('../package.json',import.meta.url))
