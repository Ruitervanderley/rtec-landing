FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install -g npm@11.11.0 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci

COPY . ./
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

COPY package*.json ./
RUN npm install -g npm@11.11.0 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --omit=dev

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start"]
