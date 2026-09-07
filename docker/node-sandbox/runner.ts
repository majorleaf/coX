import * as fs from "fs";
import * as vm from "vm";
import * as acorn from "acorn";
import * as astring from "astring";

const codePath = '/sandbox/user_code.js';
const source = fs.readFileSync(codePath, 'utf8');
const startTime = Date.now();

//parse the code into ast 
const ast: any = acorn.parse(source, {
    ecmaVersion: 2022,
    sourceType: 'script',
    locations: true
});

//Builds the AST node 
function makeTrackCall(line: number) {
    return {
        type: 'ExpressionStatement',
        expression: {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: '__track'},
            arguments: [{ type: 'Literal', value: line }]
        }
    };
}

// Walks the tree and inserts a track-call before every statement in every block
function instrument(node: any): void {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node.body)) {
        const newBody: any[] = [];
        for (const stmt of node.body) {
            newBody.push(makeTrackCall(stmt.loc.start.line));
            instrument(stmt);  // recurse in case this statement contains more blocks (e.g. loop body)
            newBody.push(stmt);
        }
        node.body = newBody;
        return;
    }

    for (const key in node) {
        if (key === 'loc' ||  key === 'start' || key === 'end') continue;
        const val = node[key];
        if (val && typeof val === 'object') instrument(val);
    }
}

instrument(ast);
// astring turns the modified AST back into real JS source code
const instrumented = astring.generate(ast);

//function  __track() calls at runtime
(global as any). __track = (line: number) => {
    process.stdout.write(`__PROGRESS__:$(line):${((Date.now() - startTime) / 1000).toFixed(3)}\n`);

};

try {
  vm.runInThisContext(instrumented, { filename: codePath});
} catch (err: any) {
  //if the user code throws , send i to stderr so we can tell success from failure
  process.stderr.write(String(err?.stack || err) + '\n');
  process.exit(1);
}

