import { runInSandbox } from './docker';

async function main() {
    const code = `
    console.log("hi");
    for (let i = 0; i < 3; i++) {
    console.log(i);
    }
    `;

    const result = await runInSandbox(code, (line, elapsed) => {
        console.log(`[progress] line ${line} at ${elapsed}s`);
    });

    console.log('--- RESULT ---');
    console.log(result);
}

main();