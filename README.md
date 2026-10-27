# CPG Example

Simplified recommendations for use by demonstration applications to illustrate the [Clinical Practice Guidelines implementation guide](https://hl7.org/fhir/uv/cpg/).

The recommendations in this implementation guide are intentionally not clinical to allow demonstration applications to focus on the infrastructural support for performing activities as part of guideline-directed care.

## Test cases

Each recommendation has CQL logic in `input/cql/` and test cases in `input/tests/Library/<Library>/<TestCase>/`. Every test case folder holds a Patient (with the same id as the folder) and the resources that make up its scenario:

| Library | Test case | Expected |
|---|---|---|
| DailyAppleLogic | NeedsDailyAppleOrder | Daily apple proposed |
| | HasDailyAppleOrder, RefusedDailyAppleOrder | Nothing proposed |
| SpoonfulOfSugarLogic | NeedsSpoonfulOfSugar | Spoonful of sugar proposed |
| | DoesNotNeedSpoonfulOfSugar, HasSpoonfulOfSugar, RefusedSpoonfulOfSugar | Nothing proposed |

**Whenever you change the resources in `input/tests`**, run `node bin/build-test-bundles.js` (requires [Node.js](https://nodejs.org/) 18 or later). It regenerates the example bundles (`input/examples/Bundle-<TestCase>.json`, which end up in the FHIR package) and the request bodies of the Postman collection. Commit the results.

## Test locally (CQL only)

1. Check out this repository.
2. Open it in VS Code and install the [CQL extension](https://marketplace.visualstudio.com/items?itemName=cqframework.cql).
3. Right-click a CQL file in `input/cql/` and choose **Execute CQL**. The library is evaluated against each of its test cases (every folder under `input/tests/Library/<Library>/`), and the value of each `define` per test case is written to `input/tests/results/<Library>.txt`.

## Install Docker

The FHIR server and cpg-review below run in Docker.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS, Windows, Linux), or Docker Engine on Linux.
2. Start Docker Desktop and wait until it reports that the engine is running.
3. Check that it works:

   ```sh
   docker run --rm hello-world
   ```

## Test in a local FHIR server

1. Start a HAPI FHIR server with the clinical reasoning module (which provides `$apply`):

   ```sh
   docker pull hapiproject/hapi:latest
   docker run -p 8080:8080 -e hapi.fhir.cr.enabled=true hapiproject/hapi:latest
   ```

   Leave it running in this terminal. Startup takes a minute or so; it's ready when [http://localhost:8080/fhir/metadata](http://localhost:8080/fhir/metadata) returns a CapabilityStatement. The server keeps its data only as long as the container exists, so after starting a new container, load the resources again (step 3). Stop it with Ctrl+C.

2. Build the IG, so `output/` contains the Libraries with compiled CQL. On macOS/Linux run `./_updatePublisher.sh` once, then `./_genonce.sh`; on Windows run `_updatePublisher.bat` once, then `_genonce.bat`.
3. Load the conformance resources (CodeSystem, ValueSets, Libraries, ActivityDefinitions, PlanDefinitions), using [Node.js](https://nodejs.org/) 18 or later:

   ```sh
   node bin/load-fhir-server.js   # optionally pass a base URL, default http://localhost:8080/fhir
   ```

   Do not load the test data: each request passes its test case inline, and a patient that is also stored on the server is seen twice, which makes the CQL fail.

4. Import `postman/CPG-Example.postman_collection.json` into Postman and run the collection. Each request calls `PlanDefinition/$apply` for one test case and checks that it proposes (or doesn't propose) the expected activity. From the command line: `postman collection run postman/CPG-Example.postman_collection.json`.

## Test with cpg-review

cpg-review, part of the [Reason Framework](https://github.com/reason-healthcare/reason-framework/), visualizes a PlanDefinition and runs `$apply` for a selected patient.

1. Start the HAPI FHIR server and load the conformance resources as described above. cpg-review uses it as the CPG engine and content endpoint.
2. In a new terminal, build and start cpg-review from a checkout of the [Reason Framework](https://github.com/reason-healthcare/reason-framework/):

   ```sh
   git clone https://github.com/reason-healthcare/reason-framework.git
   cd reason-framework
   docker build -f packages/cpg-review/Dockerfile -t reason-framework-cpg-review:latest .   # once, and again after pulling updates
   docker run --rm --name reason-cpg-review --add-host=host.docker.internal:host-gateway -p 3000:3000 reason-framework-cpg-review:latest
   ```

   (On macOS/Linux, `./bin/docker-build-cpg-review` and `./bin/docker-run-cpg-review` do the same.) Open [http://localhost:3000](http://localhost:3000). If port 3000 is taken, use e.g. `-p 3001:3000` and open port 3001 instead. The default endpoints (`http://localhost:8080/fhir`) point at the HAPI server; the container reaches it through `host.docker.internal`. Stop it with Ctrl+C.

3. Build the IG with `./_genonce.sh` (Windows: `_genonce.bat`).
4. Upload `output/package.tgz`, pick a PlanDefinition, and under **Add Context** pick one of the test case bundles from the package as the patient. Then apply.

