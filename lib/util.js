'use strict'

const os = require('os')
const { relative } = require('path')

const isWidows = os.platform() === 'win32'
const cwd = process.cwd()
const backslash = /\\/g

exports.normalizePath = function normalizePath (path) {
  path = relative(cwd, path)
  if (isWidows) {
    return path.replace(backslash, '/')
  } else {
    return path
  }
}
