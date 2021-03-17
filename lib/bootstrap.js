'use strict'

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { join } = require('path')

const lockFile = require('lockfile')

const { normalizePath, flattenReport } = require('./util')
const CodeGenAuditor = require('./api')
const defaults = require('./defaults')

if (process.argv.length === 1) {
  console.error('ERROR: Could not detect script name! Exiting...')
  console.error()
  console.error('Tip: Use "--" to separate options to codegen-audit and the node runtime:')
  console.error()
  console.error('  codegen-audit [codegen-audit-options] -- node [node-options] server.js')
  console.error()
  process.exit(1)
}

const conf = new URLSearchParams(process.env.CODEGEN_AUDIT_ARGS)
const filename = conf.get('report') ?? join(process.cwd(), defaults.report)
const scriptName = conf.root ?? normalizePath(process.argv[1])
const shouldThrow = conf.get('throw') === 'true'

const auditor = new CodeGenAuditor({
  report: loadScriptReport(filename),
  errorOnUnknown: true
})

auditor.on('error', (err) => {
  if (shouldThrow) {
    throw err
  }
  if (conf.has('log')) {
    console.warn('[codegen-audit] detected code generation from string', err.frame)
  }
})

if (!shouldThrow) {
  process.on('exit', writeReport)
  process.on('SIGINT', writeReport)
  process.on('SIGTERM', writeReport)

  function writeReport (code) {
    process.removeListener('exit', writeReport)
    process.removeListener('SIGINT', writeReport)
    process.removeListener('SIGTERM', writeReport)

    getLockSync(filename, () => {
      const auditLog = loadReport(filename)
      if (!(scriptName in auditLog)) auditLog[scriptName] = []
      auditLog[scriptName].push(auditor.end())
      writeFileSync(filename, JSON.stringify(auditLog))
    })

    if ((code === 'SIGINT' || code === 'SIGTERM') && conf.get('exit-on-signals') !== 'false') {
      process.exit()
    }
  }
}

function loadScriptReport (filename) {
  return flattenReport(loadReport(filename)[scriptName])
}

function loadReport (filename) {
  return existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf-8')) : {}
}

function getLockSync (filename, onLock) {
  const lockFilename = filename + '.lock'
  let waitingForLock = true

  while (waitingForLock) {
    try {
      lockFile.lockSync(lockFilename)
    } catch (e) {
      const until = Date.now() + 25
      while (Date.now() < until);
      continue
    }
    waitingForLock = false
  }

  onLock()

  lockFile.unlockSync(lockFilename)
}
