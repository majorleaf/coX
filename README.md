# coX

# Online Code Compiler API

A sandboxed remote code execution backend that safely runs untrusted JavaScript code inside isolated Docker containers, with real-time progress streaming over WebSockets.

## What it does

Submit JavaScript source code via HTTP, get it executed inside a locked-down Docker container, and receive live updates — which line is currently running, elapsed time, and final output — pushed to you in real time instead of blocking on a single long HTTP request.

## Why it's safe - Sandboxing & Security Measures 
   Executing untrusted user code is inherently dangerous. To prevent malicious scripts from harming the host machine, every execution happens inside an ephemeral, strictly isolated Docker container. The untrusted code never touches the host system.

It enforces the following strict security constraints on every container using the Docker Engine API:
   -No Network Access: Container networking is completely disabled (NetworkMode: 'none'). The code cannot make outbound HTTP requests, preventing data exfiltration or botnet participation.
   
   -50MB Memory Cap: Strict RAM limits prevent runaway memory usage or memory exhaustion attacks.
   
   -0.5 CPU Core Limit: Caps compute usage to ensure no single execution can hog the host system's processing power.
   
   -Process Limit (PID Cap): Blocks the creation of massive amounts of child processes, effectively neutralizing fork-bomb style attacks.
    
   -Non-Root Execution: Code is executed as an unprivileged, low-permission user inside the container, preventing system-level tampering.

   -8-Second Timeout: If a script enters an infinite loop or runs too long, the container is hard-killed and instantly destroyed.

## How progress tracking works

Node has no built-in way to report "which line is executing right now," so submitted code is parsed into an AST, instrumented with tracking calls before every statement, and regenerated letting the sandbox emit per-line progress markers as it runs.

## API

`POST /execute`
Submit code, get a job ID back immediately (HTTP 202) — execution happens asynchronously.
```json
{ "code": "console.log('hello')" }
```
→ `{ "jobId": "..." }`

`GET /status/:jobId`
Poll current status, output, and execution progress for a job.

WebSocket (`subscribe` event)
Join a job's room to receive live `progress` and `done` events as they happen. Events are buffered server-side, so subscribing late still delivers the full history — no race condition between job completion and client subscription.

## Stack

Node.js · TypeScript · Express · Docker (dockerode) · Socket.IO · Acorn/Astring (AST instrumentation)

 ## Local Setup Instructions
 Prerequisites
Node.js (v18+ recommended)
Docker Desktop (or Docker Engine) must be installed and running on your machine. The backend uses the host's Docker socket to spin up the sandboxes.
Installation
Clone the repository:
git clone https://github.com/majorleaf/coX.git
cd coX


Install dependencies:
npm install


Pull the Docker Image:
To ensure the first execution runs quickly, pre-pull the lightweight Node.js image that the sandboxes will use.
docker pull node:18-alpine


Start the Development Server:
npm run dev

The API and WebSocket server will now be listening locally (typically on http://localhost:3000).

## Status

 It Currently scoped to JavaScript execution with in-memory job tracking. Built to demonstrate sandboxing architecture and real-time execution monitoring — not yet multi-language or persistent across restarts.
