'use strict'

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { join } = require('path')

const { normalizePath } = require('./util')
const CodeGenAuditor = require('./api')

const conf = new URLSearchParams(process.env.CODEGEN_AUDIT_ARGS)
const filename = conf.get('out') ?? join(process.cwd(), 'codegen-audit.json')
const scriptName = conf.root ?? normalizePath(process.argv[1])

const auditor = new CodeGenAuditor({
  report: conf.has('allow') ? allowList(conf.get('allow')) : undefined,
  errorOnUnknown: true
})

auditor.on('error', (err) => {
  if (conf.has('allow')) {
    throw err
  }
  if (conf.has('log')) {
    console.warn('[codegen-audit] detected code generation from string', err.frame)
  }
})

if (!conf.has('allow')) {
  process.on('exit', () => {
    const auditLog = loadAuditLog(filename)
    auditLog[scriptName] = auditor.end()
    writeFileSync(filename, JSON.stringify(auditLog))
  })
}

function allowList (filename) {
  return loadAuditLog(filename)[scriptName] ?? {}
}

function loadAuditLog (filename) {
  return existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf-8')) : {}
}
