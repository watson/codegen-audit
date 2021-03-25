'use strict'

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { join } = require('path')

const chalk = require('chalk')
const lockFile = require('lockfile')

const { normalizePath, flattenReport } = require('./util')
const CodeGenAuditor = require('./api')
const defaults = require('./defaults')
const Logger = require('./logger')

const conf = new URLSearchParams(process.env.CODEGEN_AUDIT_ARGS)

const log = new Logger(
  conf.get('very-verbose') ? 2 : (conf.get('verbose') ? 1 : 0),
  conf.get('log-dest') ?? undefined,
  conf.get('color') ? conf.get('color') !== 'false' : undefined
)

log.vv('bootstrapping codegen-audit on new process (ppid: %d, script: %s)', process.ppid, process.argv[1])

if (process.argv.length === 1) {
  console.error('ERROR: Could not detect script name! Exiting...')
  console.error()
  console.error('Tip: Use "--" to separate options to codegen-audit and the node runtime:')
  console.error()
  console.error('  codegen-audit [codegen-audit-options] -- node [node-options] server.js')
  console.error()
  process.exit(1)
}

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
  log.v('detected code generation from string', err.frame)
})

if (!shouldThrow) {
  log.vv('attaching listeners to exit, SIGINT, and SIGTERM')
  process.on('exit', writeReport)
  process.on('SIGINT', writeReport)
  process.on('SIGTERM', writeReport)

  function writeReport (code) {
    log.vv('detected exit code %s', code)
    process.removeListener('exit', writeReport)
    process.removeListener('SIGINT', writeReport)
    process.removeListener('SIGTERM', writeReport)
    process.on('exit', (code) => {
      log.vv('process exiting (code: %s)...', code)
    })

    log.vv('waiting for lock on %s', filename)
    getLockSync(filename, () => {
      log.vv('got lock for %s', filename)
      const auditLog = loadReport(filename)
      if (!(scriptName in auditLog)) {
        log.vv('%s not found in audit log - creating empty array...', scriptName)
        auditLog[scriptName] = []
      }
      auditLog[scriptName].push(auditor.end())
      log.vv('writing report for %s to %s', scriptName, filename)
      writeFileSync(filename, JSON.stringify(auditLog))
      log.vv(chalk.green('report for %s successfully written to %s'), scriptName, filename)
    })

    if ((code === 'SIGINT' || code === 'SIGTERM') && conf.get('exit-on-signals') !== 'false') {
      log.vv('manually exiting process (exit code: %s)', process.exitCode)
      process.exit()
    }
  }
}

function loadScriptReport (filename) {
  log.vv('trying to load existing report for script "%s" at: %s', scriptName, filename)
  return flattenReport(loadReport(filename)[scriptName])
}

function loadReport (filename) {
  if (existsSync(filename)) {
    log.vv('loading exiting report: %s', filename)
    return JSON.parse(readFileSync(filename, 'utf-8'))
  } else {
    log.vv('existing report not found: %s', filename)
    return {}
  }
}

function getLockSync (filename, onLock) {
  const lockFilename = filename + '.lock'
  let waitingForLock = true

  while (waitingForLock) {
    try {
      log.vv('checking existing lock file:', lockFilename)
      lockFile.lockSync(lockFilename)
    } catch (e) {
      log.vv('lock file not free - waiting 25ms...')
      const until = Date.now() + 25
      while (Date.now() < until);
      continue
    }
    waitingForLock = false
  }

  onLock()

  log.vv('releasing lockfile:', lockFilename)
  lockFile.unlockSync(lockFilename)
}
