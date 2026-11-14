// Entrada do cli.js (ver src/lib/server/cli.ts e scripts/build-cli.mjs).
import { runCli } from "./lib/server/cli";

runCli(process.argv.slice(2), { out: (l) => console.log(l), err: (l) => console.error(l) }).then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
