'use strict'

eval('console.log("hello from eval")') // eslint-disable-line no-eval

new Function('console.log("hello from Function")')() // eslint-disable-line no-new-func

const { join } = require('path')
const { spawn } = require('child_process')

spawn(process.argv0, [join('test', 'child-process.js')], { stdio: 'inherit' })
