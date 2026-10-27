#!/usr/bin/env node
// Loads the IG's conformance resources into a FHIR server (via PUT in
// transaction bundles, so re-running is idempotent).
//
// Conformance resources are taken from output/ because only there do the
// Libraries contain the compiled CQL/ELM. Run _genonce first.
//
// Test data is NOT loaded by default: cpg-review and the Postman collection
// pass each test case inline as $apply's `data` parameter, and HAPI also reads
// its own database, so a test patient stored on the server is seen twice and
// CQL's Patient context fails ("Expected a list with at most one element").
// Use --with-test-data only for a server that is queried by subject alone.
//
// Usage: node bin/load-fhir-server.js [--with-test-data] [base-url]
//        (default base-url: http://localhost:8080/fhir)
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const withTestData = args[0] === '--with-test-data'
if (withTestData) args.shift()
const BASE_URL = args[0] || process.env.FHIR_BASE_URL || 'http://localhost:8080/fhir'

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

// Wraps resources in a transaction bundle of PUTs.
const toTransaction = (resources) => ({
  resourceType: 'Bundle',
  type: 'transaction',
  entry: resources.map((r) => ({
    fullUrl: `${r.resourceType}/${r.id}`,
    resource: r,
    request: { method: 'PUT', url: `${r.resourceType}/${r.id}` },
  })),
})

async function postTransaction(label, resources) {
  console.log(`Loading ${label} (${resources.length} resources) into ${BASE_URL}`)
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    },
    body: JSON.stringify(toTransaction(resources)),
  })
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = undefined
  }
  if (!response.ok) {
    console.error(`  FAILED (HTTP ${response.status}):`)
    console.error(body?.issue?.map((i) => i.diagnostics).join('\n') ?? text)
    process.exit(1)
  }
  for (const entry of body.entry) {
    console.log(`  ${entry.response.status}  ${entry.response.location}`)
  }
}

async function main() {
  // --- Conformance resources -------------------------------------------------
  const output = path.join(ROOT, 'output')
  const files = fs.existsSync(output) ? fs.readdirSync(output).sort() : []
  const conformance = ['CodeSystem', 'ValueSet', 'Library', 'ActivityDefinition', 'PlanDefinition']
    .flatMap((type) => files.filter((f) => f.startsWith(`${type}-`) && f.endsWith('.json')))
    .map((f) => readJson(path.join(output, f)))
    // Skip non-resource JSON in output/ (e.g. the raw ELM in Library-*-2.json)
    .filter((r) => r.resourceType)
  if (conformance.length === 0) {
    console.error('No resources found in output/. Build the IG first (_genonce).')
    process.exit(1)
  }
  await postTransaction('conformance resources', conformance)

  // --- Test data -------------------------------------------------------------
  if (!withTestData) return

  // input/tests/Library/<Library>/<TestCase>/<Resource>.json
  // Some ids are reused across test cases with different content (e.g.
  // MedicationRequest/DailyAppleOrder); those get "-<TestCase>" appended so
  // every test case stays intact on a single server.
  const subdirs = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  const tests = path.join(ROOT, 'input', 'tests', 'Library')
  const records = []
  for (const lib of subdirs(tests)) {
    for (const tc of subdirs(path.join(tests, lib))) {
      const dir = path.join(tests, lib, tc)
      for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
        records.push({ tc, r: readJson(path.join(dir, f)) })
      }
    }
  }
  const key = (r) => `${r.resourceType}/${r.id}`
  const counts = new Map()
  for (const { r } of records) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1)
  const testData = records.map(({ tc, r }) =>
    counts.get(key(r)) > 1 ? { ...r, id: `${r.id}-${tc}` } : r
  )
  await postTransaction('test data', testData)
}

main().catch((error) => {
  // fetch reports an unreachable server as "fetch failed"; the cause says why
  const cause = error.cause?.code ?? error.cause?.message
  console.error(cause ? `Cannot reach ${BASE_URL} (${cause}). Is the FHIR server running?` : error.message)
  process.exit(1)
})
