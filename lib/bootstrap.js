'use strict'

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { join } = require('path')

const lockFile = require('lockfile')

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
  process.on('exit', writeReport)
  process.on('SIGINT', writeReport) // ctrl+c

  function writeReport (code) {
    process.removeListener('exit', writeReport)
    process.removeListener('SIGINT', writeReport)

    getLockSync(filename, () => {
      const auditLog = loadAuditLog(filename)
      auditLog[scriptName] = auditor.end()
      writeFileSync(filename, JSON.stringify(auditLog))
    })

    if (code === 'SIGINT') {
      process.exit()
    }
  }
}

function allowList (filename) {
  return loadAuditLog(filename)[scriptName] ?? {}
}

function loadAuditLog (filename) {
  return existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf-8')) : {}
}

function getLockSync (filename, onLock) {
  const lockFilename = filename + '.lock'
  lockFile.lockSync(lockFilename, { retries: Infinity })
  onLock()
  lockFile.unlockSync(lockFilename)
}
