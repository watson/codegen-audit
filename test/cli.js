'use strict'

const { join } = require('path')
const { readFile } = require('fs')

const test = require('tape')

test('program should give expected output', (t) => {
  const stdin = []
  process.stdin.on('data', stdin.push.bind(stdin))
  process.stdin.on('end', () => {
    const lines = Buffer.concat(stdin).toString().trim().split('\n')
    t.deepEqual(lines, [
      'hello from eval',
      'hello from Function'
    ])
    t.end()
  })
})

test('program should generate expected output file', (t) => {
  readFile(join(__dirname, '..', 'test.json'), 'utf-8', (err, data) => {
    t.error(err)
    data = JSON.parse(data)
    t.deepEqual(data, {
      'test/example-app.js': {
        eval: [
          'at Object.<anonymous> (test/example-app.js:3:1)'
        ],
        Function: [
          'at Object.<anonymous> (test/example-app.js:5:1)'
        ]
      }
    })
    t.end()
  })
})
