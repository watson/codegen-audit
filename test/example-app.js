'use strict'

eval('console.log("hello from eval")') // eslint-disable-line no-eval

new Function('console.log("hello from Function")')() // eslint-disable-line no-new-func

const { join } = require('path')
const { spawn } = require('child_process')

const cp = spawn(process.argv0, [join('test', 'child-process.js')], { stdio: 'inherit' })

if (process.env.CI_SIMULATE_SIGINT === 'true') {
  setInterval(() => {}, 100000)
  setTimeout(() => {
    cp.kill('SIGINT')
    process.kill(process.pid, 'SIGINT')
  }, 1000)
}
