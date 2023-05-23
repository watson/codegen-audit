'use strict'

const vm = require('vm')

// const script = new vm.Script(`eval('console.log("hello from eval")')`)
const script = new vm.Script('require(\'./vm2\')')

const context = {
  // process,
  // global,
  // console,
  // eval,
  // Function,
  // Object,
  require
}

vm.createContext(context)

script.runInContext(context)
// script.runInThisContext()
