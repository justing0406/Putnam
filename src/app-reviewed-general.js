const catalogClassificationLabelBeforeGeneralReview = catalogClassificationLabel;
const catalogCardBeforeGeneralReview = catalogCard;

catalogClassificationLabel = function generalReviewedClassificationLabel(status) {
  const value = String(status || "");
  if (value.startsWith("solution_reviewed_")) return "Solution reviewed";
  if (value.startsWith("solution_analyzed_")) return "Solution analyzed";
  return catalogClassificationLabelBeforeGeneralReview(status);
};

catalogCard = function generalReviewedCatalogCard(problem) {
  if (problem.review_status === "solution_analyzed") {
    return catalogCardBeforeGeneralReview({ ...problem, review_status: "solution_reviewed" })
      .replace("catalog-card-reviewed", "catalog-card-analyzed")
      .replace("catalog-classification reviewed", "catalog-classification analyzed")
      .replace("Reviewed solution map and evidence", "Analyzed solution map and evidence")
      .replace(
        "Overall difficulty combines the official score distribution with the exam-position prior; the four component ratings are then reviewed against the official proof.",
        "Overall difficulty combines the solution-based difficulty profile with the exam-position prior. This record was generated from the archived solution and is awaiting manual verification.",
      );
  }
  return catalogCardBeforeGeneralReview(problem);
};
