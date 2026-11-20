FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN chown node:node /app
USER node

ENV NEXT_TELEMETRY_DISABLED=1
COPY --chown=node:node package.json package-lock.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
RUN --mount=type=secret,id=registry_ca,uid=1000 \
    if [ -r /run/secrets/registry_ca ]; then \
      export NODE_EXTRA_CA_CERTS=/run/secrets/registry_ca; \
    fi; \
    npm ci
COPY --chown=node:node . .
RUN npm run build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
