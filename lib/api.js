'use strict'

const { EventEmitter } = require('events')
const { normalizePath } = require('./util')

const extractPath = /^(.*)\(([^)]*)\)$/

const reportSym = Symbol('report')
const callersSym = Symbol('callers')
const listenerSym = Symbol('listener')

const codeGenFunctionFrames = [
  '    at eval (<anonymous>)',
  '    at Function (<anonymous>)',
  '    at new Function (<anonymous>)'
]

module.exports = class CodeGenAuditor extends EventEmitter {
  constructor (opts = {}) {
    super()

    this[reportSym] = opts.report ?? []
    this[callersSym] = new Set(this[reportSym])
    this[listenerSym] = (code) => {
      const frame = callingFrame()

      if (this[callersSym].has(frame) === false) {
        this[callersSym].add(frame)
        this[reportSym] = [...this[callersSym].values()]

        if (opts.errorOnUnknown) {
          const err = new Error(`Illegal code generation from string ${frame}`)
          err.frame = frame
          this.emit('error', err)
        }
      }
    }

    process.on('codeGenerationFromString', this[listenerSym])
  }

  end () {
    process.removeListener('codeGenerationFromString', this[listenerSym])
    return this[reportSym]
  }
}

function callingFrame () {
  const obj = {}
  Error.captureStackTrace(obj, process.emit)
  const frames = obj.stack.split('\n')

  // If using Function or indirect eval an extra frame is inserted into the
  // stack trace which we need to skip
  let isFunctionOrIndirectEval = false

  // Skip frame no 1 as it's not a frame, but the "error" message
  let i = 1
  for (; i < frames.length; i++) {
    if (codeGenFunctionFrames.includes(frames[i])) {
      isFunctionOrIndirectEval = true
      break
    }
  }
  // TODO: How do we detect direct eval?????

  const callingFrame = isFunctionOrIndirectEval ? frames[i + 1] : frames[1]

  // console.error(isFunctionOrIndirectEval, callingFrame, frames)
  return normalizeFrame(callingFrame)
}

function normalizeFrame (frame) {
  frame = frame.trim()
  const match = frame.match(extractPath)
  return match ? `${match[1]}(${normalizePath(match[2])})` : frame
}
