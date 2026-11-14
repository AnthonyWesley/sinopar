import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imagem Docker enxuta: .next/standalone leva só o necessário para rodar (ver Dockerfile)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3", "sharp", "heic-convert"],
  experimental: {
    // foto de produto vai por Server Action (uploadProductPhoto): até 10 MB de arquivo, mais a
    // folga do envelope multipart. O tamanho exato do arquivo é conferido em src/lib/server/images.ts.
    serverActions: { bodySizeLimit: "11mb" },
  },
  // cabeçalhos de segurança em todas as respostas (loja e painel): sem iframe de outro site,
  // sem adivinhar tipo de arquivo, e o endereço completo não vaza para outros domínios
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
