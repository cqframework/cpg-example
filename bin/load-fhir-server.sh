#!/usr/bin/env bash
# Loads the IG's conformance resources into a FHIR server (via PUT in
# transaction bundles, so re-running is idempotent).
#
# Conformance resources are taken from output/ because only there do the
# Libraries contain the compiled CQL/ELM. Run _genonce.sh first.
#
# Test data is NOT loaded by default: cpg-review and the Postman collection
# pass each test case inline as $apply's `data` parameter, and HAPI also reads
# its own database, so a test patient stored on the server is seen twice and
# CQL's Patient context fails ("Expected a list with at most one element").
# Use --with-test-data only for a server that is queried by subject alone.
#
# Usage: bin/load-fhir-server.sh [--with-test-data] [base-url]
#        (default base-url: http://localhost:8080/fhir)
set -euo pipefail

WITH_TEST_DATA=false
if [[ "${1:-}" == "--with-test-data" ]]; then
  WITH_TEST_DATA=true
  shift
fi
BASE_URL="${1:-${FHIR_BASE_URL:-http://localhost:8080/fhir}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

# Wraps resources (one JSON object per line on stdin) in a transaction bundle of PUTs.
to_transaction() {
  jq -s '{
    resourceType: "Bundle",
    type: "transaction",
    entry: map({
      fullUrl: "\(.resourceType)/\(.id)",
      resource: .,
      request: { method: "PUT", url: "\(.resourceType)/\(.id)" }
    })
  }'
}

post_transaction() {
  local label="$1" bundle response status
  bundle="$(cat)"
  echo "Loading $label ($(jq '.entry | length' <<<"$bundle") resources) into $BASE_URL"
  response="$(curl -sS -w '\n%{http_code}' -X POST "$BASE_URL" \
    -H 'Content-Type: application/fhir+json' -H 'Accept: application/fhir+json' \
    --data-binary @- <<<"$bundle")"
  status="$(tail -n1 <<<"$response")"
  if [[ "$status" != 2* ]]; then
    echo "  FAILED (HTTP $status):" >&2
    sed '$d' <<<"$response" | jq -r '.issue[]?.diagnostics // .' >&2
    exit 1
  fi
  sed '$d' <<<"$response" | jq -r '.entry[] | "  \(.response.status)  \(.response.location)"'
}

# --- Conformance resources ---------------------------------------------------
shopt -s nullglob
conformance=(output/{CodeSystem,ValueSet,Library,ActivityDefinition,PlanDefinition}-*.json)
if (( ${#conformance[@]} == 0 )); then
  echo "No resources found in output/. Build the IG first (./_genonce.sh)." >&2
  exit 1
fi
# Skip non-resource JSON in output/ (e.g. the raw ELM in Library-*-2.json)
jq -c 'select(.resourceType)' "${conformance[@]}" \
  | to_transaction | post_transaction "conformance resources"

# --- Test data ---------------------------------------------------------------
$WITH_TEST_DATA || exit 0

# input/tests/Library/<Library>/<TestCase>/<Resource>.json
# Some ids are reused across test cases with different content (e.g.
# MedicationRequest/DailyAppleOrder); those get "-<TestCase>" appended so
# every test case stays intact on a single server.
find input/tests/Library -mindepth 3 -name '*.json' -print0 | sort -z \
  | while IFS= read -r -d '' f; do
      jq -c --arg tc "$(basename "$(dirname "$f")")" '{tc: $tc, r: .}' "$f"
    done \
  | jq -c -s '
      (group_by("\(.r.resourceType)/\(.r.id)") | map(select(length > 1) | .[0] | "\(.r.resourceType)/\(.r.id)")) as $dups
      | .[]
      | if ("\(.r.resourceType)/\(.r.id)" | IN($dups[])) then .r.id += "-\(.tc)" else . end
      | .r' \
  | to_transaction | post_transaction "test data"
