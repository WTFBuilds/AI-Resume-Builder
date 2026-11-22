# AIResume export worker — Node + Chromium
FROM node:22-slim
RUN corepack enable pnpm

# Chromium runtime dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

# Fetch Chromium for the container's platform at build time
RUN pnpm --filter @airesume/worker exec puppeteer browsers install chrome

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@airesume/worker", "start"]
