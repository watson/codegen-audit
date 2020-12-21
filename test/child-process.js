'use strict'

eval('console.log("hello from child process eval")') // eslint-disable-line no-eval

new Function('console.log("hello from child process Function")')() // eslint-disable-line no-new-func

if (process.env.CI_SIMULATE_SIGINT === 'true') {
  setInterval(() => {}, 100000)
}
