'use strict'

eval('console.log("hello from eval")') // eslint-disable-line no-eval

new Function('console.log("hello from Function")')() // eslint-disable-line no-new-func
