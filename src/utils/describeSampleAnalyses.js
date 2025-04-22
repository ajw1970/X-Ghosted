import { summarizeRatedPosts } from './summarizeRatedPosts';
import { summarizeConnectedPosts } from "./summarizeConnectedPosts";
import { postConnector } from "./postConnector";
import { postQuality } from "./postQuality";

function describeSampleAnalyses(document, analyses) {
  const { GOOD, PROBLEM, POTENTIAL_PROBLEM, UNDEFINED } = postQuality;
  const { DISCONNECTED, STARTS, CONTINUES, DANGLES } = postConnector;

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
  const totalUndefined = postQualitySummary[UNDEFINED.name];

  const totalDisconnected = postConnectorSummary[DISCONNECTED.name];
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
    `  ${`${totalUndefined}`.padStart($padding, " ")} ${UNDEFINED.name}`,
    ``,
    `Post Connections Totals:`,
    `  ${`${totalDisconnected}`.padStart($padding, " ")} ${DISCONNECTED.name}`,
    `  ${`${totalStarts}`.padStart($padding, " ")} ${STARTS.name}`,
    `  ${`${totalContinues}`.padStart($padding, " ")} ${CONTINUES.name}`,
    `  ${`${totalDangles}`.padStart($padding, " ")} ${DANGLES.name}`,
  ].join("\n");
}

export { describeSampleAnalyses };