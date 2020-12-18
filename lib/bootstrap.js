'use strict'

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { relative, join } = require('path')

const api = require('./api')

const cwd = process.cwd()
const conf = new URLSearchParams(process.env.CODEGEN_AUDIT_ARGS)
const filename = conf.get('out') ?? join(cwd, 'codegen-audit.json')
const scriptName = conf.root ?? relative(cwd, process.argv[1])
const auditLog = loadAuditLog()

const end = api.start({
  log: conf.has('log'),
  allow: auditLog[scriptName]
})

process.on('exit', () => {
  auditLog[scriptName] = end()
  saveAuditLog()
})

function saveAuditLog () {
  writeFileSync(filename, JSON.stringify(auditLog))
}

function loadAuditLog () {
  return existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf-8')) : {}
}
