'use strict'

const { join } = require('path')
const { spawn } = require('child_process')
const { readFile } = require('fs')

const test = require('tape')

const envs = [{}]
if (process.platform !== 'win32') {
  envs.push({ CI_SIMULATE_SIGINT: 'true' })
}

function run (cmd, args, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  let stdout = ''
  let stderr = ''
  let err = null
  let code = null
  let signal = null

  opts.shell = true

  const cp = spawn(cmd, args, opts)

  cp.stdout.on('data', (data) => { stdout += data })
  cp.stderr.on('data', (data) => { stderr += data })
  cp.once('error', onError)
  cp.once('exit', onExit)

  function onError (_err) {
    err = _err
    cp.removeListener('exit', onExit)
    done()
  }

  function onExit (_code, _signal) {
    code = _code
    signal = _signal
    cp.removeListener('error', onError)
    done()
  }

  function done () {
    cb(err, stdout, stderr, code, signal)
  }
}

envs.forEach((env) => {
  test('example-app.js', (t) => {
    t.test('setup', (t) => {
      run('rm', ['-f', 'test.json'], (err) => {
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

      const args = [
        join('lib', 'cli.js'),
        '--report',
        'test.json',
        process.argv0,
        join('test', 'example-app.js')
      ]
      const opts = { env: Object.assign({}, process.env, env) }

      run(process.argv0, args, opts, (err, stdout, stderr, code, signal) => {
        t.error(err)
        t.deepEqual(stdout.split('\n').sort(), expectedOutput.sort())
        t.equal(stderr, '')

        // Wait a short while to avoid a race condition, where this test ends
        // before all the child processes has time to write to test.json, which
        // is needed for the next test case to work. This only happens on some
        // platforms sometimes.
        setTimeout(() => {
          t.end()
        }, 100)
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

    t.test('parse', (t) => {
      const args = [
        join('lib', 'cli.js'),
        'parse',
        'test.json'
      ]

      run(process.argv0, args, (err, stdout, stderr, code) => {
        t.error(err)
        t.equal(code, 0)
        t.equal(stderr, '')
        t.equal(stdout, `test/child-process.js:
  eval:
    at Object.<anonymous> (test/child-process.js:3:1)
  Function:
    at Object.<anonymous> (test/child-process.js:5:1)
test/example-app.js:
  eval:
    at Object.<anonymous> (test/example-app.js:3:1)
  Function:
    at Object.<anonymous> (test/example-app.js:5:1)
`)
        t.end()
      })
    })
  })
})

test('throw', (t) => {
  const args = [
    join('lib', 'cli.js'),
    '--report',
    join('test', 'example-app-allowlist-fail.json'),
    '--throw',
    '--',
    process.argv0,
    join('test', 'example-app.js')
  ]

  run(process.argv0, args, (err, stdout, stderr, code, signal) => {
    t.error(err)
    t.ok(stderr.includes('Illegal call to \'Function\' at Object.<anonymous> (test/example-app.js:5:1)'))
    t.equal(code, 1)
    t.equal(signal, null)
    t.equal(stdout, 'hello from eval\n')
    t.end()
  })
})

test('does not throw', (t) => {
  const args = [
    join('lib', 'cli.js'),
    '--report',
    join('test', 'example-app-allowlist-ok.json'),
    '--throw',
    '--',
    process.argv0,
    join('test', 'example-app.js')
  ]

  run(process.argv0, args, (err, stdout, stderr) => {
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

test('diff different', (t) => {
  const args = [
    join('lib', 'cli.js'),
    'diff',
    join('test', 'diff1.json'),
    join('test', 'diff2.json')
  ]

  run(process.argv0, args, (err, stdout, stderr, code) => {
    t.error(err)
    t.equal(code, 1)
    t.equal(stderr, `Missing eval invocation in common-script: b-exist-in-old
Missing Function invocation in common-script: b-exist-in-old
Unknown Function invocation in common-script: a-exist-in-new
Unknown Function invocation in common-script: d-exist-in-new
Missing script: script-should-be-missing
Unknown script: script-should-be-unknown
`)
    t.equal(stdout, '')
    t.end()
  })
})

test('diff same', (t) => {
  const args = [
    join('lib', 'cli.js'),
    'diff',
    join('test', 'diff1.json'),
    join('test', 'diff1.json')
  ]

  run(process.argv0, args, (err, stdout, stderr, code) => {
    t.error(err)
    t.equal(code, 0)
    t.equal(stderr, '')
    t.equal(stdout, '')
    t.end()
  })
})
