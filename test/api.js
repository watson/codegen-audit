'use strict'

/* eslint-disable no-eval, no-new-func */

const test = require('tape')

const api = require('../lib/api')

test('should detect eval', (t) => {
  eval('1 + 1') // should not detect lines from before it's started
  const end = api.start()
  eval('1 + 1'); const l1 = getLineNo()
  eval('1 + 1'); const l2 = getLineNo()
  const report = end()
  t.deepEqual(report, {
    eval: [
      `at Test.<anonymous> (test/api.js:${l1}:3)`,
      `at Test.<anonymous> (test/api.js:${l2}:3)`
    ]
  })
  t.end()
})

test('should detect new Function', (t) => {
  new Function('1 + 1')() // should not detect lines from before it's started
  const end = api.start()
  new Function('1 + 1')(); const l1 = getLineNo()
  new Function('1 + 1')(); const l2 = getLineNo()
  const report = end()
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
  const end = api.start()
  evil()
  evil()
  evil()
  const report = end()
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

test('should call onUnknown callback', (t) => {
  t.plan(3)

  const lineNo = getLineNo()
  const end = api.start(conf())
  eval('1 + 1'); const l1 = getLineNo()
  eval('1 + 1'); const l2 = getLineNo()

  const report = end()
  t.deepEqual(report, {
    eval: [
      `at Test.<anonymous> (test/api.js:${l1}:3)`,
      `at Test.<anonymous> (test/api.js:${l2}:3)`
    ]
  })
  t.end()

  function conf () {
    return {
      allow: {
        eval: [
          `at Test.<anonymous> (test/api.js:${lineNo + 2}:3)`
        ]
      },
      onUnknown (fn, frame) {
        t.strictEqual(fn.name, 'eval')
        t.strictEqual(frame, `at Test.<anonymous> (test/api.js:${lineNo + 3}:3)`)
      }
    }
  }
})

function getLineNo () {
  const obj = {}
  Error.captureStackTrace(obj, getLineNo)
  return parseInt(obj.stack.split('\n')[1].match(/(\d*):\d*\)$/)[1], 10)
}
