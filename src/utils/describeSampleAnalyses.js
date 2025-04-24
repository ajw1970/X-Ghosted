import { summarizeRatedPosts } from './summarizeRatedPosts';
import { summarizeConnectedPosts } from "./summarizeConnectedPosts";
import { postConnector } from "./postConnector";
import { postQuality } from "./postQuality";

function describeSampleAnalyses(document, analyses) {
  const {
    GOOD,
    PROBLEM,
    PROBLEM_ADJACENT,
    POTENTIAL_PROBLEM,
    DIVIDER,
    UNDEFINED,
  } = postQuality;
  const { DIVIDES, INDEPENDENT, STARTS, CONTINUES, DANGLES } = postConnector;

  const totalPosts = document.querySelectorAll(
    'div[data-testid="cellInnerDiv"]'
  ).length;
  const totalArticles = document.querySelectorAll(
    "article:not(article article)"
  ).length;
  const totalNestedArticles =
    document.querySelectorAll("article article").length;
  const postQualitySummary = summarizeRatedPosts(analyses);
  const postConnectorSummary = summarizeConnectedPosts(analyses);

  const $padding = 2;
  const totalGood = postQualitySummary[GOOD.name];
  const totalPotentialProblems = postQualitySummary[POTENTIAL_PROBLEM.name];
  const totalProblems = postQualitySummary[PROBLEM.name];
  const totalAdjacentProblems = postQualitySummary[PROBLEM_ADJACENT.name];
  const totalDividers = postQualitySummary[DIVIDER.name];
  const totalUndefined = postQualitySummary[UNDEFINED.name];

  const totalDivides = postConnectorSummary[DIVIDES.name];
  const totalINDEPENDENT = postConnectorSummary[INDEPENDENT.name];
  const totalStarts = postConnectorSummary[STARTS.name];
  const totalContinues = postConnectorSummary[CONTINUES.name];
  const totalDangles = postConnectorSummary[DANGLES.name];

  return [
    `Structure Summary Totals:`,
    `  ${`${totalPosts}`.padStart($padding, " ")} Posts`,
    `  ${`${totalArticles}`.padStart($padding, " ")} Articles`,
    `  ${`${totalNestedArticles}`.padStart($padding, " ")} Nested Articles`,
    ``,
    `Rated Post Quality Totals:`,
    `  ${`${totalGood}`.padStart($padding, " ")} ${GOOD.name}`,
    `  ${`${totalPotentialProblems}`.padStart($padding, " ")} ${POTENTIAL_PROBLEM.name}`,
    `  ${`${totalProblems}`.padStart($padding, " ")} ${PROBLEM.name}`,
    `  ${`${totalAdjacentProblems}`.padStart($padding, " ")} ${PROBLEM_ADJACENT.name}`,
    `  ${`${totalDividers}`.padStart($padding, " ")} ${DIVIDER.name}`,
    `  ${`${totalUndefined}`.padStart($padding, " ")} ${UNDEFINED.name}`,
    ``,
    `Post Connections Totals:`,
    `  ${`${totalDivides}`.padStart($padding, " ")} ${DIVIDES.name}`,
    `  ${`${totalINDEPENDENT}`.padStart($padding, " ")} ${INDEPENDENT.name}`,
    `  ${`${totalStarts}`.padStart($padding, " ")} ${STARTS.name}`,
    `  ${`${totalContinues}`.padStart($padding, " ")} ${CONTINUES.name}`,
    `  ${`${totalDangles}`.padStart($padding, " ")} ${DANGLES.name}`,
  ].join("\n");
}

export { describeSampleAnalyses };