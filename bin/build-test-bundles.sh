#!/usr/bin/env bash
# Wraps each CQL test case (input/tests/Library/<Library>/<TestCase>/*.json)
# in a collection Bundle at input/examples/Bundle-<TestCase>.json, so the test
# patients end up in the IG package (e.g. selectable as patients in cpg-review).
#
# Re-run after changing test data, then rebuild the IG (./_genonce.sh).
#
# Usage: bin/build-test-bundles.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }

BASE="http://fhir.org/guides/cqf/cpg/example"

find input/tests/Library -mindepth 2 -maxdepth 2 -type d | sort | while IFS= read -r dir; do
  tc="$(basename "$dir")"
  out="input/examples/Bundle-$tc.json"
  # Patient first, so tools picking "the" patient of a bundle find it directly
  jq -s --arg id "$tc" --arg base "$BASE" '{
    resourceType: "Bundle",
    id: $id,
    type: "collection",
    entry: (sort_by(.resourceType != "Patient") | map({
      fullUrl: "\($base)/\(.resourceType)/\(.id)",
      resource: .
    }))
  }' "$dir"/*.json > "$out"
  echo "$out ($(jq '.entry | length' "$out") resources)"
done

# Point each Postman request (named after its test case) at POST $apply with
# that test case's bundle as inline `data`, matching what cpg-review sends.
COLLECTION="postman/CPG-Example.postman_collection.json"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT
for name in $(jq -r '.item[].item[].name' "$COLLECTION"); do
  bundle="input/examples/Bundle-$name.json"
  [[ -f "$bundle" ]] || { echo "No $bundle for Postman request $name" >&2; exit 1; }
  jq --arg name "$name" '{
    resourceType: "Parameters",
    parameter: [
      { name: "subject", valueString: "Patient/\($name)" },
      { name: "data", resource: . }
    ]
  }' "$bundle" > "$body"
  jq --indent 2 --arg name "$name" --rawfile body "$body" '
    (.item[].item[] | select(.name == $name).request) |= (
      .method = "POST"
      | .header = [
          { key: "Content-Type", value: "application/fhir+json" },
          { key: "Accept", value: "application/fhir+json" }
        ]
      | .body = { mode: "raw", raw: $body, options: { raw: { language: "json" } } }
      | .url |= (.raw |= sub("\\?.*"; "") | del(.query))
    )' "$COLLECTION" > "$COLLECTION.tmp" && mv "$COLLECTION.tmp" "$COLLECTION"
done
echo "$COLLECTION (request bodies updated)"
