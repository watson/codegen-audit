#!/usr/bin/env node
'use strict'

const { spawn } = require('child_process')
const { readFile } = require('fs')
const { join } = require('path')

const rawArgs = require('minimist')(process.argv.slice(2))

switch (true) {
  case rawArgs.help ?? rawArgs.h:
    help()
    break
  case rawArgs.version ?? rawArgs.v:
    version()
    break
  case rawArgs.analyze:
    analyze(rawArgs.report)
    break
  default: {
    const [cmd, ...args] = rawArgs._
    const env = Object.assign({}, process.env)
    const bootArg = `--require "${join(__dirname, 'bootstrap.js')}"`

    env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ` ${bootArg}` : bootArg
    env.CODEGEN_AUDIT_ARGS = genereateAuditArgs()

    spawn(cmd, args, {
      stdio: 'inherit',
      env
    }).on('close', (code) => {
      process.exitCode = code
    })
  }
}

function genereateAuditArgs () {
  const args = Object.assign({}, rawArgs)
  delete args._
  return new URLSearchParams(args).toString()
}

function analyze (filename = './codegen-audit.json') {
  readFile(filename, { encoding: 'utf-8' }, (err, json) => {
    if (err) throw err
    log(JSON.parse(json))
  })

  function log (report, indent = '') {
    for (const [key, val] of Object.entries(report)) {
      if (typeof val === 'string') {
        console.log(`${indent}${val}`)
      } else {
        console.log(`${indent}${key}:`)
        log(val, indent + '  ')
      }
    }
  }
}

function help () {
  console.log(`
Usage: codegen-audit [options] -- node script.js

Options:
--report=...   Set custom path to the report file (default:
               ${defaults.report}).
--throw        If a call to a code-generation function occurs that is not in
               the existing report (see --report), an Error will be thrown.
--analyze      Analyze existing report file and output to STDOUT.
--log          Output logs to STDERR (default: no logging).
--help, -h     Output this help.
--version, v   Output version number.
`)
}

function version () {
  console.log(require('../package.json').version)
}
