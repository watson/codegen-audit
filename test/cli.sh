#!/usr/bin/env bash

set -ex

rm -f test.json
node lib/cli.js --report test.json node test/example-app.js | node test/cli.js

rm -f test.json
CI_SIMULATE_SIGINT=true node lib/cli.js --report test.json node test/example-app.js | node test/cli.js

set +e
node lib/cli.js --report test/example-app-allowlist-fail.json --throw -- node test/example-app.js
if [ $? -eq 0 ]; then
  echo "Error: Expected command to fail."
  exit 1
fi
set -e

node lib/cli.js --report test/example-app-allowlist-ok.json --throw -- node test/example-app.js
