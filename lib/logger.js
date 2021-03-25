'use strict'

const { format } = require('util')
const { EOL } = require('os')
const { createWriteStream } = require('fs')

const chalk = require('chalk')
const { supportsColor } = require('supports-color')

// select a color that's different from the color used by the parent process
const PID_COLORS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
const PID_INDEX = process.pid % PID_COLORS.length
const PPID_INDEX = process.ppid % PID_COLORS.length
const color = chalk.keyword(
  PID_COLORS[PID_INDEX !== PPID_INDEX ? PID_INDEX : (PID_INDEX + 1) % PID_COLORS.length]
)

const noop = () => {}

module.exports = class Logger {
  constructor (verbosity = 0, dest = '2', color) {
    this.v = verbosity >= 1 ? log.bind(this) : noop
    this.vv = verbosity >= 2 ? log.bind(this) : noop

    switch (dest) {
      case '1':
        this._stream = process.stdout
        break
      case '2':
        this._stream = process.stderr
        break
      default:
        // expect dest to be a filename
        this._stream = createWriteStream(dest, { flags: 'a' })
    }

    const supportedColorLevel = supportsColor(this._stream)?.level || 0
    switch (color) {
      case true:
        // force use of colors, even if not supported
        chalk.level = supportedColorLevel || 2
        break
      case false:
        // force no colors, even if supported
        chalk.level = 0
        break
      case undefined:
        // by default, just use what's supported
        chalk.level = supportedColorLevel
        break
      default:
        throw new Error(`Unexpected color argument: ${color}`)
    }
  }
}

function log (...args) {
  const then = log.now || Date.now()
  log.now = Date.now()
  args[0] = `[codegen-audit] [${color(`pid: ${process.pid}`)}] ${args[0]}`
  this._stream.write(format(...args) + chalk.magenta(` - ${log.now - then}ms`) + EOL)
}
