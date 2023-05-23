'use strict'

console.log('[parent] booting...')

const { spawn } = require('child_process')

console.log('[parent] spawning child...')
const cp = spawn('node', ['child.js'], { stdio: 'inherit' })

require('event-debug')(cp)

process.on('SIGINT', () => {
  console.log('[parent] received SIGINT! -- exiting...')
  process.exit()
})
