'use strict'

const { sep } = require('path')

module.exports = {
  report: `.${sep}${require('../package.json').name}.json`
}
