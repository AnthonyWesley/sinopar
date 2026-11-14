import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sinopar-uploads-"));
process.env.DATA_DIR = dir;
// arquivo fora de uploads/ que um "../" tentaria alcançar
fs.writeFileSync(path.join(dir, "site.db"), "SEGREDO");

import { saveUpload } from "@/lib/server/images";
import { GET } from "./route";

const get = (name: string) => GET(new Request(`http://x/uploads/${encodeURIComponent(name)}`), { params: Promise.resolve({ name }) });

describe("GET /uploads/[name]", () => {
  it("serve a foto com o tipo certo e cache longo", async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).png().toBuffer();
    const r = await saveUpload(png);
    if (!r.ok) throw new Error(r.error);
    const res = await get(r.url.slice("/uploads/".length));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).format).toBe("webp");
  });

  it.each(["../x", "../site.db", "..", "a/b.webp", "..\\site.db", "site.db", "nao-existe.webp", "00000000-0000-0000-0000-000000000000.webp"])(
    "recusa %s com 404",
    async (name) => {
      const res = await get(name);
      expect(res.status).toBe(404);
      expect(await res.text()).not.toContain("SEGREDO");
    },
  );
});
