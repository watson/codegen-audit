# codegen-audit

Audit a Node.js application and detect where code generation from strings is being used (`eval()`, `new Function()`).

[![npm](https://img.shields.io/npm/v/codegen-audit.svg)](https://www.npmjs.com/package/codegen-audit)
[![build status](https://github.com/watson/codegen-audit/workflows/CI/badge.svg?branch=master)](https://github.com/watson/codegen-audit/actions?query=workflow%3ACI+branch%3Amaster)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Installation

It's recommended to use this tool as part of your CI system, in which case you probably want to install it as a dev-dependency:

```sh
npm install codegen-audit -D
```

Alternatively you can use it using `npx` or install it globally:

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
- `--out=...` - Set custom path for report file (default: `./codegen-audit.json`)
- `--report` - Analyze report file and output to STDOUT
- `--help`, `-h` - Output help
- `--version`, `-v` - Output version number

### Audit Report

When the monitored process exits, a report file will be generated in the current working directory named `codegen-audit.json` (or at location specified by `--out`).

## License

[MIT](LICENSE)
