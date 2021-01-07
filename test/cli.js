'use strict'

const { join } = require('path')
const { exec } = require('child_process')
const { readFile } = require('fs')

const test = require('tape')

const envs = [
  {},
  { CI_SIMULATE_SIGINT: 'true' }
]

envs.forEach((env) => {
  test('example-app.js', (t) => {
    t.test('setup', (t) => {
      exec('rm -f test.json', (err) => {
        t.error(err)
        t.end()
      })
    })

    t.test('program should give expected output', (t) => {
      const expectedOutput = [
        'hello from eval',
        'hello from Function',
        'hello from child process eval',
        'hello from child process Function',
        'hello from child process eval',
        'hello from child process Function',
        ''
      ]
      if (env.CI_SIMULATE_SIGINT === 'true') {
        expectedOutput.push('kill: SIGINT')
      }

      const opts = { env: Object.assign({}, process.env, env) }

      exec('node lib/cli.js --report test.json node test/example-app.js', opts, (err, stdout, stderr) => {
        t.error(err)
        t.deepEqual(stdout.split('\n').sort(), expectedOutput.sort())
        t.equal(stderr, '')
        t.end()
      })
    })

    t.test('program should generate expected output file', (t) => {
      readFile(join(__dirname, '..', 'test.json'), 'utf-8', (err, data) => {
        t.error(err)
        data = JSON.parse(data)
        t.deepEqual(data, {
          'test/child-process.js': [
            {
              eval: [
                'at Object.<anonymous> (test/child-process.js:3:1)'
              ],
              Function: [
                'at Object.<anonymous> (test/child-process.js:5:1)'
              ]
            },
            {
              eval: [
                'at Object.<anonymous> (test/child-process.js:3:1)'
              ],
              Function: [
                'at Object.<anonymous> (test/child-process.js:5:1)'
              ]
            }
          ],
          'test/example-app.js': [{
            eval: [
              'at Object.<anonymous> (test/example-app.js:3:1)'
            ],
            Function: [
              'at Object.<anonymous> (test/example-app.js:5:1)'
            ]
          }]
        })
        t.end()
      })
    })
  })
})

test('throw', (t) => {
  exec('node lib/cli.js --report test/example-app-allowlist-fail.json --throw -- node test/example-app.js', (err, stdout, stderr) => {
    t.ok(err.message.includes('Illegal call to \'Function\' at Object.<anonymous> (test/example-app.js:5:1)'))
    t.equal(err.killed, false)
    t.equal(err.code, 1)
    t.equal(err.signal, null)
    t.equal(stdout, 'hello from eval\n')
    const startOfSecondLine = err.toString().indexOf('\n') + 1
    t.equal(stderr, err.toString().substr(startOfSecondLine))
    t.end()
  })
})

test('does not throw', (t) => {
  exec('node lib/cli.js --report test/example-app-allowlist-ok.json --throw -- node test/example-app.js', (err, stdout, stderr) => {
    t.error(err)
    t.deepEqual(stdout.split('\n').sort(), [
      'hello from eval',
      'hello from Function',
      'hello from child process eval',
      'hello from child process Function',
      'hello from child process eval',
      'hello from child process Function',
      ''
    ].sort())
    t.equal(stderr, '')
    t.end()
  })
})
