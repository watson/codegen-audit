# codegen-audit

Audit a Node.js application and detect where code generation from strings is being used (i.e. any use of the functions `eval()` or `Function()`).

[![npm](https://img.shields.io/npm/v/codegen-audit.svg)](https://www.npmjs.com/package/codegen-audit)
[![build status](https://github.com/watson/codegen-audit/workflows/CI/badge.svg?branch=master)](https://github.com/watson/codegen-audit/actions?query=workflow%3ACI+branch%3Amaster)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Why?

Code generation from strings is considered unsafe if given untrusted user input and can lead to Prototype Pollution attacks, among other things.
Therefore,
it's possible to start your Node.js application with the [`--disallow-code-generation-from-strings`](https://nodejs.org/api/cli.html#cli_disallow_code_generation_from_strings) flag,
which will make your application throw an error if some part of your application calls one of the code-generation functions like `eval()` and `Function()`.

In an ideal world,
this behaviour is probably what you want,
but if you're working with an existing application,
it might not be feasable to remove all instances of code-generation from day one.
Or you might have legitimate use-cases for using one of these functions,
and just want to allow those,
while disallowing all other uses.

Enter `codegen-audit`:
With this module it's possible to allow all known instances of code generation from strings in your application,
but have for example your CI- or production-system fail if any new instances of code-generation are discovered.

## Installation

It's recommended to use this tool as part of your CI system,
in which case you probably want to install it as a dev-dependency:

```sh
npm install codegen-audit -D
```

Alternatively you can use it from the command line,
either using `npx`,
or by installing it globally:

```sh
npm install codegen-audit -g
```

## Usage

If installed as dev-dependency:

```sh
./node_modules/.bin/codegen-audit node server.js
```

If installed globally:

```sh
codegen-audit node server.js
```

If running using npx:

```sh
npx codegen-audit node server.js
```

### Options

```
codegen-audit [options] -- node script.js
```

The following CLI options are supported:

- `--log` - Output logs to STDERR (default: no logging)
- `--out=...` - Set custom path for where the report file should be generated (default: `./codegen-audit.json`)
- `--allow=...` - Set path for an exsiting report used as an allowlist. If a call to a code-generation function happens not in this allowlist, an Error will be thrown (default: `./codegen-audit.json`)
- `--report` - Analyze report file and output to STDOUT
- `--help`, `-h` - Output help
- `--version`, `-v` - Output version number

### Audit Report

When the monitored process exits, a report file will be generated in the current working directory named `codegen-audit.json` (or at location specified by `--out`).

## API

This module can be used programmatically as well.
Consider the file `my-app.js`:

```js
const CodeGenAuditor = require('codegen-audit')

const auditor = new CodeGenAuditor()
eval('console.log("hello from eval")')
new Function('console.log("hello from Function")')()
const report = auditor.end()

console.log('report:', report)
```

If run,
you'll get the following output:

```
hello from eval
hello from Function
report: {
  eval: [ 'at Object.<anonymous> (my-app.js:4:1)' ],
  Function: [ 'at Object.<anonymous> (my-app.js:5:1)' ]
}
```

### `new CodeGenAuditor([options])`

The module exposes a single event-emitter object called `CodeGenAuditor`.
When initialized,
it starts to monitor for calls to code generation functions.

Options:

- `report` - Optionally seed the auditor with a report generated previously (by `auditor.end()`).
  Any code-generation call present in the seeded report, will not tigger an `error` event.
- `errorOnUnknown` - If set to `true`,
  an `error` event will be emitted if the monitored application tries to use a code-generator function in a new location
  (default: `false`).

### Event: 'error'

Emitted when the monitored application tries to use a code-generator function in a new location.

Listeners will be called with a single argument containing an Error object.

### `auditor.end()`

Will stop the monitoring and return a `report` object with the following structure:

- `eval` - An array of strings. Each string is the calling stack frame to the `eval` function.
- `Function` - An array of strings. Each string is the calling stack frame to the `Function` function.

## License

[MIT](LICENSE)
