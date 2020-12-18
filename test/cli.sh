#!/usr/bin/env bash

set -ex

rm -f test.json
node lib/cli.js --out test.json node test/example-app.js | node test/cli.js

set +e
node lib/cli.js --allow test/example-app-allowlist-fail.json node test/example-app.js
if [ $? -eq 0 ]; then
  echo "Error: Expected command to fail."
  exit 1
fi
set -e

node lib/cli.js --allow test/example-app-allowlist-ok.json node test/example-app.js