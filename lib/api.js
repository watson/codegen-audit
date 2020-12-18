'use strict'

/* eslint-disable no-eval */

const { relative } = require('path')

const origEval = global.eval
const origFunction = global.Function

const cwd = process.cwd()
const extractPath = /^(.*)\(([^)]*)\)$/
const noop = () => {}

exports.start = function start (conf = {}) {
  const allow = conf.allow ?? {}
  const onUnknown = conf.onUnknown ?? noop

  global.eval = patch(global.eval)
  global.Function = patch(global.Function)

  return function end () {
    global.eval = origEval
    global.Function = origFunction
    return allow
  }

  function patch (fn) {
    const callers = new Set(getCallers(fn))

    return function patchedFn () {
      const frame = callingFrame(patchedFn)

      if (callers.has(frame) === false) {
        onUnknown(fn, frame)
        log('detected code generation from string', frame)
        callers.add(frame)
        updateCallers(fn, callers)
      }

      return fn.apply(null, arguments)
    }
  }

  function getCallers (fn) {
    return allow[fn.name] ?? []
  }

  function updateCallers (fn, callers) {
    allow[fn.name] = [...callers.values()]
  }

  function log (...args) {
    if (conf.log) {
      args.unshift('[codegen-audit]')
      console.warn(...args)
    }
  }
}

function callingFrame (evalFn) {
  const obj = {}
  Error.captureStackTrace(obj, evalFn)
  return normalizeFrame(obj.stack.split('\n')[1].trim())
}

function normalizeFrame (frame) {
  const match = frame.match(extractPath)
  return match ? `${match[1]}(${relative(cwd, match[2])})` : frame
}
