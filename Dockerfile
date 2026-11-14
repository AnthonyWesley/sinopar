# syntax=docker/dockerfile:1
# Alpine nas três etapas: better-sqlite3 (13.x) traz o binário pronto para musl
# (prebuilds/linuxmusl-*.node) e o sharp traz @img/sharp-linuxmusl-*. Nada é compilado, então
# não precisa de python/make/g++ (nem trocar para node:22-slim). O build roda na mesma imagem do runtime, e o rastreio do
# standalone copia o binário musl certo. Se um dia trocar a base para glibc (node:22-slim),
# troque nas três etapas juntas.

# ---------- dependências ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci instala direto do lock; o cache mount guarda os pacotes entre deploys.
# --ignore-scripts: o better-sqlite3 tem binding.gyp, e sem isso o npm tenta compilar com
# node-gyp (e falha sem python/g++), embora o pacote já traga o binário musl pronto. Nenhuma
# outra dependência do lock precisa de script de instalação no Linux.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --prefer-offline --ignore-scripts

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# next build + scripts/build-cli.mjs (gera .next/standalone/cli.js, os comandos de emergência)
RUN npm run build

# ---------- runtime ----------
# Diferente dos sites Vite (nginx servindo arquivos): aqui roda um servidor Node, porque
# o checkout chama o Asaas pelo servidor e o painel grava no banco.
FROM node:22-alpine AS runner
WORKDIR /app
# PORT e HOSTNAME: a varredura de hora em hora chama http://127.0.0.1:${PORT}/api/interno/varredura
# no próprio processo, então o servidor precisa escutar em todas as interfaces nessa porta.
# DATA_DIR: banco SQLite (site.db), fotos enviadas (uploads/) e cópias diárias (backups/).
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs \
 && mkdir -p /data && chown nextjs:nextjs /data
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nextjs /app/public ./public
USER nextjs

# Sem volume em /data, banco, fotos e backups somem a cada deploy. O VOLUME vem depois do
# chown para o volume novo nascer com dono nextjs.
VOLUME /data

# ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, ADMIN_EMAIL e ADMIN_PASSWORD são lidas em runtime.
# SITE_URL e WHATSAPP_NUMBER vão para as páginas pré-renderizadas: no Coolify, marque essas
# duas também como "Build Variable".
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
