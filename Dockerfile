FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ARG NEXT_PUBLIC_GAME_SERVER_URL=
ENV NEXT_PUBLIC_GAME_SERVER_URL=$NEXT_PUBLIC_GAME_SERVER_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS game
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/server/index.js"]

FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
