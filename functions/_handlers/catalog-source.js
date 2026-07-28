import { buildPutnamCatalog } from "../../shared/catalog-import.js";
import { HttpError, ok } from "../_lib/http.js";

const PUTNAM_BENCH_URL = "https://raw.githubusercontent.com/trishullab/PutnamBench/main/informal/putnam.json";

export async function handleCatalogSource() {
  let response;
  try {
    response = await fetch(PUTNAM_BENCH_URL, {
      headers: { accept: "application/json" },
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
  } catch {
    throw new HttpError(502, "Could not reach the historical Putnam source.");
  }

  if (!response.ok) {
    throw new HttpError(502, `Historical Putnam source returned ${response.status}.`);
  }

  let rawProblems;
  try {
    rawProblems = await response.json();
  } catch {
    throw new HttpError(502, "The historical Putnam source returned unreadable data.");
  }

  const { records, metadata } = buildPutnamCatalog(rawProblems);
  return ok(
    { problems: records, meta: metadata },
    { headers: { "cache-control": "private, max-age=3600" } },
  );
}
