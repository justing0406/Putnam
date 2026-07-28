# Historical Putnam catalog

The Problem Finder indexes every standard A1–A6 and B1–B6 slot from 1962 through 2025.

## Current coverage

- 768 indexed problem records
- 673 full problem statements from the PutnamBench informal corpus
- 95 indexed placeholders for problems not currently included in that permitted source corpus
- 2017–2025 receives first priority for richer topic, concept, technique, and difficulty classification
- default front-end ordering is newest year first

Placeholder records preserve the year and problem identifier and link to the relevant Putnam Archive source. They are not presented as though their statements or classifications have already been completed.

## Data source and permissions

PutnamBench states that its informal problem statements are available with permission from the Mathematical Association of America. The generated catalog stores statements from that corpus but does not copy PutnamBench solution text into the application.

## Automatic GitHub sync

`.github/workflows/sync-putnam-catalog.yml` downloads the current PutnamBench informal corpus and runs:

```text
scripts/build-putnam-catalog.mjs
```

The generated file is:

```text
src/catalog-data.js
```

The workflow commits changes directly to `main`. It runs when the generator or workflow changes, can be run manually from GitHub Actions, and checks weekly for upstream additions or corrections. No local Wrangler or npm command is required.

## Search behavior

The front end:

- sorts by year descending when no search is active
- initially renders 48 records and supports progressive loading
- searches statements, areas, topics, concepts, techniques, years, and mathematical structure
- supports area, year, and difficulty filters
- keeps imported catalog problems separate from the full archive until the user chooses **Add to journal**
