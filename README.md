# coX

# Online Code Compiler API

A sandboxed remote code execution backend that safely runs untrusted JavaScript code inside isolated Docker containers, with real-time progress streaming over WebSockets.

## What it does

Submit JavaScript source code via HTTP, get it executed inside a locked-down Docker container, and receive live updates — which line is currently running, elapsed time, and final output — pushed to you in real time instead of blocking on a single long HTTP request.

## Why it's safe

Untrusted code never touches the host machine. Each execution runs in a disposable container with:
- **No network access** — the container can't make outbound requests
- **50MB memory cap** — prevents runaway memory usage
- **0.5 CPU core limit** — caps compute usage
- **Non-root execution** — code runs as an unprivileged user
- **Process limit** — blocks fork-bomb style attacks
- **8-second timeout** — hard-killed if it runs too long

## How progress tracking works

Node has no built-in way to report "which line is executing right now," so submitted code is parsed into an AST, instrumented with tracking calls before every statement, and regenerated — letting the sandbox emit per-line progress markers as it runs.

## API

**`POST /execute`**
Submit code, get a job ID back immediately (HTTP 202) — execution happens asynchronously.
```json
{ "code": "console.log('hello')" }
```
→ `{ "jobId": "..." }`

**`GET /status/:jobId`**
Poll current status, output, and execution progress for a job.

**WebSocket (`subscribe` event)**
Join a job's room to receive live `progress` and `done` events as they happen. Events are buffered server-side, so subscribing late still delivers the full history — no race condition between job completion and client subscription.

## Stack

Node.js · TypeScript · Express · Docker (dockerode) · Socket.IO · Acorn/Astring (AST instrumentation)

## Status

Currently scoped to JavaScript execution with in-memory job tracking. Built to demonstrate sandboxing architecture and real-time execution monitoring — not yet multi-language or persistent across restarts.