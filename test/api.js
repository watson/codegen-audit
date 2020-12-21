'use strict'

/* eslint-disable no-eval, no-new-func */

const test = require('tape')

const CodeGenAuditor = require('../lib/api')

test('should detect eval', (t) => {
  eval('1 + 1') // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  eval('1 + 1'); const l1 = getLineNo()
  eval('1 + 1'); const l2 = getLineNo()
  const report = auditor.end()
  t.deepEqual(report, {
    eval: [
      `at Test.<anonymous> (test/api.js:${l1}:3)`,
      `at Test.<anonymous> (test/api.js:${l2}:3)`
    ]
  })
  t.end()
})

test('should throw on new eval', (t) => {
  const auditor = new CodeGenAuditor()
  t.throws(() => {
    new eval('1 + 1') // eslint-disable-line no-new, new-cap
  })
  auditor.end()
  t.end()
})

test('should detect new Function', (t) => {
  new Function('1 + 1')() // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  new Function('1 + 1')(); const l1 = getLineNo()
  new Function('1 + 1')(); const l2 = getLineNo()
  const report = auditor.end()
  t.deepEqual(report, {
    Function: [
      `at Test.<anonymous> (test/api.js:${l1}:3)`,
      `at Test.<anonymous> (test/api.js:${l2}:3)`
    ]
  })
  t.end()
})

test('should detect Function', (t) => {
  Function('1 + 1')() // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  Function('1 + 1')(); const l1 = getLineNo()
  Function('1 + 1')(); const l2 = getLineNo()
  const report = auditor.end()
  t.deepEqual(report, {
    Function: [
      `at Test.<anonymous> (test/api.js:${l1}:3)`,
      `at Test.<anonymous> (test/api.js:${l2}:3)`
    ]
  })
  t.end()
})

test('should only detect first invocation', (t) => {
  let l1, l2
  const auditor = new CodeGenAuditor()
  evil()
  evil()
  evil()
  const report = auditor.end()
  t.deepEqual(report, {
    eval: [`at evil (test/api.js:${l1}:5)`],
    Function: [`at evil (test/api.js:${l2}:5)`]
  })
  t.end()

  function evil () {
    eval('1 + 1'); l1 = getLineNo()
    new Function('1 + 1')(); l2 = getLineNo()
  }
})

test('should emit error if given allow-list', (t) => {
  t.plan(3)

  const lineNo = getLineNo()
  const auditor = getAuditor()
  eval('1 + 1'); const l1 = getLineNo()
  eval('1 + 1'); const l2 = getLineNo()

  const report = auditor.end()
  t.deepEqual(report, {
    eval: [
      `at Test.<anonymous> (test/api.js:${l1}:3)`,
      `at Test.<anonymous> (test/api.js:${l2}:3)`
    ]
  })
  t.end()

  function getAuditor () {
    return new CodeGenAuditor({
      report: {
        eval: [
          `at Test.<anonymous> (test/api.js:${lineNo + 2}:3)`
        ]
      },
      errorOnUnknown: true
    }).on('error', (err) => {
      t.ok(err instanceof Error)
      t.equal(err.message, `Unallowed call to 'eval' at Test.<anonymous> (test/api.js:${lineNo + 3}:3)`)
    })
  }
})

function getLineNo () {
  const obj = {}
  Error.captureStackTrace(obj, getLineNo)
  return parseInt(obj.stack.split('\n')[1].match(/(\d*):\d*\)$/)[1], 10)
}
