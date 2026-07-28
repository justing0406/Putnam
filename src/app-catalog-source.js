let catalogSourceLoadPromise = null;

const baseLoadCatalogFromGeneratedData = loadCatalog;
loadCatalog = async function loadCatalogWithRemoteFallback() {
  if (!STATIC_PUTNAM_CATALOG.length) {
    catalogSourceLoadPromise ||= api("/api/catalog-source").then((data) => {
      if (!Array.isArray(data.problems) || !data.problems.length) {
        throw new Error("The historical Putnam source returned no problems.");
      }
      STATIC_PUTNAM_CATALOG.push(...data.problems);
      Object.assign(PUTNAM_CATALOG_META, data.meta || {});
    });
    await catalogSourceLoadPromise;
  }
  return baseLoadCatalogFromGeneratedData();
};
