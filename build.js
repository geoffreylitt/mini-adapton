#!/usr/bin/env node
const { build } = require("estrella")

const p = build({
  entry: "index.ts",
  outfile: "out/index.js",
  platform: "node",
  bundle: true,
  run: true,
})