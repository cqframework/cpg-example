#!/usr/bin/env node
// Wraps each CQL test case (input/tests/Library/<Library>/<TestCase>/*.json)
// in a collection Bundle at input/examples/Bundle-<TestCase>.json, so the test
// patients end up in the IG package (e.g. selectable as patients in cpg-review).
// Also points each Postman request (named after its test case) at POST $apply
// with that test case's bundle as inline `data`, matching what cpg-review sends.
//
// Re-run after changing test data, then rebuild the IG (_genonce).
//
// Usage: node bin/build-test-bundles.js
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TESTS = path.join(ROOT, 'input', 'tests', 'Library')
const EXAMPLES = path.join(ROOT, 'input', 'examples')
const COLLECTION = path.join(ROOT, 'postman', 'CPG-Example.postman_collection.json')
const BASE = 'http://fhir.org/guides/cqf/cpg/example'

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
const subdirs = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/')

for (const lib of subdirs(TESTS)) {
  for (const tc of subdirs(path.join(TESTS, lib))) {
    const dir = path.join(TESTS, lib, tc)
    const resources = fs.readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => readJson(path.join(dir, f)))
    // Patient first, so tools picking "the" patient of a bundle find it directly
    // (Array.prototype.sort is stable, so the rest keeps file order)
    resources.sort((a, b) => (a.resourceType !== 'Patient') - (b.resourceType !== 'Patient'))
    const out = path.join(EXAMPLES, `Bundle-${tc}.json`)
    writeJson(out, {
      resourceType: 'Bundle',
      id: tc,
      type: 'collection',
      entry: resources.map((r) => ({
        fullUrl: `${BASE}/${r.resourceType}/${r.id}`,
        resource: r,
      })),
    })
    console.log(`${relative(out)} (${resources.length} resources)`)
  }
}

const collection = readJson(COLLECTION)
for (const folder of collection.item) {
  for (const item of folder.item) {
    const bundleFile = path.join(EXAMPLES, `Bundle-${item.name}.json`)
    if (!fs.existsSync(bundleFile)) {
      console.error(`No ${relative(bundleFile)} for Postman request ${item.name}`)
      process.exit(1)
    }
    const parameters = {
      resourceType: 'Parameters',
      parameter: [
        { name: 'subject', valueString: `Patient/${item.name}` },
        { name: 'data', resource: readJson(bundleFile) },
      ],
    }
    const request = item.request
    request.method = 'POST'
    request.header = [
      { key: 'Content-Type', value: 'application/fhir+json' },
      { key: 'Accept', value: 'application/fhir+json' },
    ]
    request.body = {
      mode: 'raw',
      raw: JSON.stringify(parameters, null, 2) + '\n',
      options: { raw: { language: 'json' } },
    }
    request.url.raw = request.url.raw.replace(/\?.*/, '')
    delete request.url.query
  }
}
writeJson(COLLECTION, collection)
console.log(`${relative(COLLECTION)} (request bodies updated)`)
