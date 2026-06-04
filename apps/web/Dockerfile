# TanStack Start dev/SSR server for the Zeus dev estate.
# NOTE: the production build emits a fetch handler that needs a deployment adapter
# (nitro / node-server) — to be added in the deploy round. For local + dev we run
# the Vite dev server, which serves SSR and the BFF server functions.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

ENV GATEWAY_URL=http://gateway:8081

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
