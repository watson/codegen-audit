'use strict'

/* eslint-disable no-eval, no-new-func */

const test = require('tape')

const CodeGenAuditor = require('../lib/api')

test('should detect eval', (t) => {
  assertTwo(t, eval('1 + 1')) // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  assertTwo(t, eval('1 + 1')); const l1 = getLineNo()
  assertTwo(t, eval('1 + 1')); const l2 = getLineNo()
  const report = auditor.end()
  t.deepEqual(report, {
    eval: [
      `at Test.<anonymous> (test/api.js:${l1}:16)`,
      `at Test.<anonymous> (test/api.js:${l2}:16)`
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

test('should throw if started twice', (t) => {
  const auditor = new CodeGenAuditor()
  t.throws(() => {
    new CodeGenAuditor() // eslint-disable-line no-new
  })
  auditor.end()
  t.end()
})

test('should detect new Function', (t) => {
  assertTwo(t, new Function('return 1 + 1')()) // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  assertTwo(t, new Function('return 1 + 1')()); const l1 = getLineNo()
  assertTwo(t, new Function('return 1 + 1')()); const l2 = getLineNo()
  const report = auditor.end()
  t.deepEqual(report, {
    Function: [
      `at Test.<anonymous> (test/api.js:${l1}:16)`,
      `at Test.<anonymous> (test/api.js:${l2}:16)`
    ]
  })
  t.end()
})

test('should detect new Function with arguments', (t) => {
  assertTwo(t, new Function('a', 'return a + 1')(1)) // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  assertTwo(t, new Function('a', 'return a + 1')(1)); const l1 = getLineNo()
  assertTwo(t, new Function('a', 'return a + 1')(1)); const l2 = getLineNo()
  const report = auditor.end()
  t.deepEqual(report, {
    Function: [
      `at Test.<anonymous> (test/api.js:${l1}:16)`,
      `at Test.<anonymous> (test/api.js:${l2}:16)`
    ]
  })
  t.end()
})

test('should detect Function', (t) => {
  assertTwo(t, Function('return 1 + 1')()) // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  assertTwo(t, Function('return 1 + 1')()); const l1 = getLineNo()
  assertTwo(t, Function('return 1 + 1')()); const l2 = getLineNo()
  const report = auditor.end()
  t.deepEqual(report, {
    Function: [
      `at Test.<anonymous> (test/api.js:${l1}:16)`,
      `at Test.<anonymous> (test/api.js:${l2}:16)`
    ]
  })
  t.end()
})

test('should detect Function.apply', (t) => {
  // eslint-disable-next-line no-useless-call
  assertTwo(t, Function.apply(null, ['return 1 + 1'])()) // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  assertTwo(t, Function.apply(null, ['return 1 + 1'])()); const l1 = getLineNo() // eslint-disable-line no-useless-call
  assertTwo(t, Function.apply(null, ['return 1 + 1'])()); const l2 = getLineNo() // eslint-disable-line no-useless-call
  const report = auditor.end()
  t.deepEqual(report, {
    Function: [
      `at Test.<anonymous> (test/api.js:${l1}:25)`,
      `at Test.<anonymous> (test/api.js:${l2}:25)`
    ]
  })
  t.end()
})

test('should detect Function.call', (t) => {
  // eslint-disable-next-line no-useless-call
  assertTwo(t, Function.call(null, 'return 1 + 1')()) // should not detect lines from before it's started
  const auditor = new CodeGenAuditor()
  assertTwo(t, Function.call(null, 'return 1 + 1')()); const l1 = getLineNo() // eslint-disable-line no-useless-call
  assertTwo(t, Function.call(null, 'return 1 + 1')()); const l2 = getLineNo() // eslint-disable-line no-useless-call
  const report = auditor.end()
  t.deepEqual(report, {
    Function: [
      `at Test.<anonymous> (test/api.js:${l1}:25)`,
      `at Test.<anonymous> (test/api.js:${l2}:25)`
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

function assertTwo (t, num) {
  t.equal(num, 2)
}

function getLineNo () {
  const obj = {}
  Error.captureStackTrace(obj, getLineNo)
  return parseInt(obj.stack.split('\n')[1].match(/(\d*):\d*\)$/)[1], 10)
}
