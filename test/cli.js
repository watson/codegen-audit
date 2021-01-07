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
        // process._rawDebug(
        //   `-- ERROR START:\n${require('util').inspect(err)}\n-- ERROR END\n` +
        //   `-- STDOUT START:\n${stdout}\n-- STDOUT END\n` +
        //   `-- STDERR START:\n${stderr}\n-- STDERR END\n` +
        //   `-- CODE START:\n${code}\n-- CODE END\n` +
        //   `-- SIGNAL START:\n${signal}\n-- SIGNAL END`
        // )
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
