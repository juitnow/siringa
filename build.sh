#!/bin/bash

export PATH="${PATH}:./node_modules/.bin"
export NODE_OPTIONS='--enable-source-maps'

set -xe

rm -rf build dist
mkdir -p build dist

# Check types and generate .d.ts files
tsc

# Prep sources and tests
esbuild --format=cjs build.ts | node -

# Run tests and collect coverage
nyc --reporter=html --reporter=text mocha 'build/test/**/*.js'

# Lint our code
eslint src test test-d
