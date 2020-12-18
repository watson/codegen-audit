'use strict'

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { join } = require('path')

const { normalizePath } = require('./util')
const api = require('./api')

const conf = new URLSearchParams(process.env.CODEGEN_AUDIT_ARGS)
const filename = conf.get('out') ?? join(process.cwd(), 'codegen-audit.json')
const scriptName = conf.root ?? normalizePath(process.argv[1])
const auditLog = loadAuditLog()

const done = api.start({
  log: conf.has('log'),
  allow: auditLog[scriptName]
})

process.on('exit', () => {
  auditLog[scriptName] = done()
  saveAuditLog()
})

function saveAuditLog () {
  writeFileSync(filename, JSON.stringify(auditLog))
}

function loadAuditLog () {
  return existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf-8')) : {}
}
