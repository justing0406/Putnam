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
    return catalogCardBeforeGeneralReview({ ...problem, review_status: "solution_reviewed" });
  }
  return catalogCardBeforeGeneralReview(problem);
};
