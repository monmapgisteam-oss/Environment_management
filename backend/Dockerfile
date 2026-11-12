# syntax=docker/dockerfile:1
# Build context: the repository root (the backend bundles ../shared).
# Base images are pinned by digest; update the tag and digest together
# (docker pull node:24-alpine && docker image inspect --format "{{index .RepoDigests 0}}").

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY shared /app/shared
COPY backend ./
RUN npm run lint && npm run build && npm prune --omit=dev

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000
WORKDIR /app
COPY --from=build /app/backend/package.json ./package.json
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4000/healthz || exit 1
CMD ["node", "--enable-source-maps", "dist/server.mjs"]
