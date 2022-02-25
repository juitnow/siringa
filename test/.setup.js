'use strict'

console.log(`Running on NodeJS version ${process.version}`)
process.on('exit', () => console.log(`Running on NodeJS version ${process.version}`))

/* Always use "chai as promised" */
require('chai').use(require('chai-as-promised'))

/* Support source maps as we mangle code for coverage */
require('source-map-support').install({
  hookRequire: true,
})
