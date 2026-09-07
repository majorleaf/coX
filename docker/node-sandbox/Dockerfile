# --- Build stage: compiles TypeScript, then gets discarded ---
FROM node:20-alpine AS builder
WORKDIR /build
COPY package.json tsconfig.json runner.ts ./
RUN npm install
RUN npx tsc

# --- Final stage: this is what actually runs untrusted code ---
FROM node:20-alpine
RUN addgroup -S sandboxgroup && adduser -S sandboxuser -G sandboxgroup

WORKDIR /sandbox
COPY package.json /sandbox/
RUN npm install --production
COPY --from=builder /build/dist/runner.js /sandbox/runner.js

RUN chown -R sandboxuser:sandboxgroup /sandbox
USER sandboxuser