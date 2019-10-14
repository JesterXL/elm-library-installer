#!/usr/bin/env node
const log = console.log
const program = require('commander')
const { isBoolean } = require('lodash/fp')
const { installAllElm19Dependencies } = require('../src')

program
.version(require('../package.json').version, '-v, --version')
.description('Installs Elm libraries within corporate networks.')
.option('-i, --install', 'Reads your elm.json and installs all libraries to .elm in your user directory.')
.option('-v, --verbose', 'Shows debug information.')
.parse(process.argv)

if(program.install) {
    installAllElm19Dependencies(program.verbose)
    .catch(log)
}