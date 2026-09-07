FROM node:20-alpine

RUN addgroup -S sandboxgroup && adduser -S sandboxuser -G sandboxgroup

WORKDIR /sandbox
COPY package.json runner.js /sandbox/
RUN npm install --production

RUN chown -R sandboxuser:sandboxgroup /sandbox
USER sandboxuser