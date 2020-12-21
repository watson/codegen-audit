'use strict'

/* eslint-disable no-eval */

const { EventEmitter } = require('events')
const { normalizePath } = require('./util')

const origEval = global.eval
const origFunction = global.Function

const extractPath = /^(.*)\(([^)]*)\)$/

module.exports = class CodeGenAuditor extends EventEmitter {
  constructor (opts = {}) {
    super()

    this._report = opts.report ?? {}

    const patch = (fn) => {
      const callers = new Set(this._report[fn.name])
      const self = this

      if ('prototype' in fn) {
        // A signal that this function can act as a constructor.
        const patchedFn = function () {
          const frame = callingFrame(patchedFn)

          if (callers.has(frame) === false) {
            callers.add(frame)
            self._report[fn.name] = [...callers.values()]

            if (opts.errorOnUnknown) {
              const err = new Error(`Unallowed call to '${fn.name}' ${frame}`)
              err.frame = frame
              err.fnName = fn.name
              self.emit('error', err)
            }
          }

          return fn.apply(null, arguments)
        }

        return mimicFunction(fn, patchedFn)
      } else {
        // A signal that this function is like an arrow function.
        const patchedFn = (...args) => {
          const frame = callingFrame(patchedFn)

          if (callers.has(frame) === false) {
            callers.add(frame)
            self._report[fn.name] = [...callers.values()]

            if (opts.errorOnUnknown) {
              const err = new Error(`Unallowed call to '${fn.name}' ${frame}`)
              err.frame = frame
              err.fnName = fn.name
              self.emit('error', err)
            }
          }

          return fn.apply(null, args)
        }

        return mimicFunction(fn, patchedFn)
      }
    }

    global.eval = patch(global.eval)
    global.Function = patch(global.Function)
  }

  end () {
    global.eval = origEval
    global.Function = origFunction
    return this._report
  }
}

function callingFrame (evalFn) {
  const obj = {}
  Error.captureStackTrace(obj, evalFn)
  return normalizeFrame(obj.stack.split('\n')[1].trim())
}

function normalizeFrame (frame) {
  const match = frame.match(extractPath)
  return match ? `${match[1]}(${normalizePath(match[2])})` : frame
}

function mimicFunction (orig, patch) {
  Object.defineProperties(patch, Object.getOwnPropertyDescriptors(orig))
  Object.setPrototypeOf(patch, Object.getPrototypeOf(orig))
  return patch
}
