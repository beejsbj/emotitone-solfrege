#!/bin/bash
# Run from repo root: bash project/start-dev.sh
npx browser-sync start \
  --server "project" \
  --files "project/**/*" \
  --startPath "/kitchen-sink.html" \
  --no-notify \
  --port 3000
