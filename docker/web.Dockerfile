# AIResume web (Next.js standalone)
FROM node:22-alpine AS build
RUN corepack enable pnpm
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @airesume/web build

# standalone output lives at apps/web/.next/standalone — reassemble assets
RUN cd apps/web \
  && cp -r .next/static .next/standalone/apps/web/.next/static \
  && cp -r public .next/standalone/apps/web/public

FROM node:22-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone/apps/web ./
USER app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
