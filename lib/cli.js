#!/usr/bin/env node
'use strict'

const { spawn } = require('child_process')
const { readFile } = require('fs/promises')
const { join } = require('path')
const { EOL } = require('os')

const odiff = require('odiff')

const defaults = require('./defaults')
const { flattenReport } = require('./util')

const rawArgs = require('minimist')(process.argv.slice(2))

switch (rawArgs._[0]) {
  case 'parse':
    parse(rawArgs._[1])
    break
  case 'diff':
    diff(rawArgs._[1], rawArgs._[2])
    break
  default:
    run()
}

function run () {
  switch (true) {
    case rawArgs.help ?? rawArgs.h ?? isEmpty(rawArgs):
      help()
      break
    case rawArgs.version ?? rawArgs.v:
      version()
      break
    default: {
      const [cmd, ...args] = rawArgs._
      const env = Object.assign({}, process.env)
      const boostrapFile = join(__dirname, 'bootstrap.js')
      const bootArg = `--require "${
        process.platform === 'win32' ? boostrapFile.replace(/\\/g, '\\\\') : boostrapFile
      }"`

      env.NODE_OPTIONS = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ${bootArg}` : bootArg
      env.CODEGEN_AUDIT_ARGS = generateAuditArgs()

      spawn(cmd, args, {
        stdio: 'inherit',
        env
      })
        .on('close', onExit)
        .on('exit', onExit)

      function onExit (code) {
        if (code !== null) process.exitCode = code
      }
    }
  }
}

function generateAuditArgs () {
  const args = Object.assign({}, rawArgs)
  delete args._
  return new URLSearchParams(args).toString()
}

async function parse (filename = defaults.report) {
  for (const [key, report] of Object.entries(await loadReports(filename))) {
    if (report.eval.length > 0 || report.Function.length > 0) {
      console.log(`${key}:`)
      if (report.eval.length > 0) {
        console.log('  eval:')
        console.log(`    ${report.eval.join(`${EOL}    `)}`)
      }
      if (report.Function.length > 0) {
        console.log('  Function:')
        console.log(`    ${report.Function.join(`${EOL}    `)}`)
      }
    }
  }
}

async function diff (a, b) {
  const diffs = odiff(...(
    await Promise.all([
      loadReports(a),
      loadReports(b)
    ])
  ).map(prepareReports))

  if (diffs.length > 0) {
    for (const diff of diffs) {
      switch (diff.type) {
        case 'set':
        case 'unset': {
          const verb = diff.type === 'set' ? 'Unknown' : 'Missing'
          if (diff.path.length === 1) {
            console.error(`${verb} script: ${diff.path[0]}`)
          } else {
            console.error(`${verb} ${diff.path[1]} invocation in ${diff.path[0]}: ${diff.path[diff.path.length - 1]}`)
          }
          break
        }
        default:
          throw new Error(`Unknown diff type: ${diff.type}`)
      }
    }
    process.exit(1)
  }

  function prepareReports (reports) {
    for (const key of Object.keys(reports)) {
      reports[key].eval = reports[key].eval.reduce(arrToObj, {})
      reports[key].Function = reports[key].Function.reduce(arrToObj, {})
    }
    return reports

    function arrToObj (obj, str) {
      obj[str] = true
      return obj
    }
  }
}

async function loadReports (filename) {
  const reports = JSON.parse(await readFile(filename, { encoding: 'utf-8' }))
  for (const [key, val] of Object.entries(reports)) {
    reports[key] = flattenReport(val)
  }
  return reports
}

function help () {
  console.log(`Audit a Node.js application and detect where code generation from strings is
being used.

Usage:
  codegen-audit [command] [options]
  codegen-audit [options] [bin-to-instrument]

Commands:
  parse [file]            Parse a report and output a human readable version
                          (file default: ${defaults.report}).
  diff <file1> <file2>    Analyze two reports and output the differences.

Options:
  --             Indicate the end of options. Pass the rest of the arguments to
                 the bin-to-instrument.
  --report=...   Set custom path to the report file (default:
                 ${defaults.report}).
  --throw        If a call to a code-generation function occurs that is not in
                 the existing report (see --report), an Error will be thrown.
  --no-exit-on-signals
                 Do not exit the process on SIGINT/SIGTERM.
  --verbose      A little chatty.
  --very-verbose Very chatty.
  --color        Force use of ANSI colors in log output (will auto-detect if
                 not specified).
  --no-color     Force disable of ANSI colors in log output (will auto-detect
                 if not specified).
  --log-dest=... Set custom logging destination: "1" for STDOUT, "2" for
                 STDERR, or a path to a log file (default: 2).
  --help, -h     Output this help.
  --version, -v  Output version number.

Examples:
  codegen-audit node script.js
  codegen-audit -- node --enable-source-maps script.js
  codegen-audit diff report1.json report2.json
  codegen-audit parse report.json
`)
}

function version () {
  console.log(require('../package.json').version)
}

function isEmpty (args) {
  // check for `{ _: [] }`
  return Object.keys(args).length === 1 && args._.length === 0
}
