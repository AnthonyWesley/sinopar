// Empacota src/cli.ts num único .next/standalone/cli.js, que roda com `node cli.js` no container
// (ao lado do server.js). better-sqlite3 fica de fora do pacote: é nativo e já vem no
// node_modules do standalone, porque o servidor também usa. Roda depois do `next build`.
import { build } from "rolldown";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, ".next", "standalone");
if (!fs.existsSync(outDir)) {
  console.error("build-cli: .next/standalone não existe; rode `next build` antes.");
  process.exit(1);
}

await build({
  input: path.join(root, "src", "cli.ts"),
  platform: "node",
  external: ["better-sqlite3"],
  resolve: {
    alias: {
      // "server-only" só existe para o Next impedir import no navegador; fora dele, vazio
      "server-only": path.join(root, "src", "test", "empty.ts"),
      "@": path.join(root, "src"),
    },
  },
  output: { file: path.join(outDir, "cli.js"), format: "cjs" },
  logLevel: "warn",
});
console.log("build-cli: .next/standalone/cli.js");
