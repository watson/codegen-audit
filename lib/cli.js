#!/usr/bin/env node
'use strict'

const { spawn } = require('child_process')
const { readFile } = require('fs')

const rawArgs = require('minimist')(process.argv.slice(2))

if (rawArgs.help || rawArgs.h) help()
if (rawArgs.version || rawArgs.v) version()
if (rawArgs.report) report(rawArgs.out)

const cmd = rawArgs._[0]
const args = rawArgs._.slice(1)

const env = Object.assign({}, process.env)
const bootArg = '--require "./lib/bootstrap.js"'
env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ` ${bootArg}` : bootArg
env.CODEGEN_AUDIT_ARGS = genereateAuditArgs()

spawn(cmd, args, {
  stdio: 'inherit',
  env
})

function genereateAuditArgs () {
  const args = Object.assign({}, rawArgs)
  delete args._
  return new URLSearchParams(args).toString()
}

function report (filename = './codegen-audit.json') {
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
  process.exit()
}

function help () {
  console.log(`
Usage: codegen-audit [options] -- node script.js

Options:
--log          Output logs to STDERR (default: no logging)
--out=...      Set custom path for report file (default: ./codegen-audit.json)
--report       Analyze report file and output to STDOUT
--help, -h     Output this help
--version, v   Output version number
`)
  process.exit()
}

function version () {
  console.log(require('./package.json').version)
  process.exit()
}
