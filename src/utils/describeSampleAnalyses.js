import { summarizeRatedPosts } from './summarizeRatedPosts';
import { postQuality } from './postQuality';

function describeSampleAnalyses(document, analysis) {
  const totalPosts = document.querySelectorAll('div[data-testid="cellInnerDiv"]').length;
  const totalArticles = document.querySelectorAll('article:not(article article)').length;
  const totalNestedArticles = document.querySelectorAll('article article').length;
  const postQualitySummary = summarizeRatedPosts(analysis);

  const $padding = 2;
  const totalGood = postQualitySummary[postQuality.GOOD.name];
  const totalPotentialProblems = postQualitySummary[postQuality.POTENTIAL_PROBLEM.name];
  const totalProblems = postQualitySummary[postQuality.PROBLEM.name];
  const totalUndefined = postQualitySummary[postQuality.UNDEFINED.name];

  return [
    `Structure Summary Totals:`,
    `  ${`${totalPosts}`.padStart($padding, ' ')} Posts`,
    `  ${`${totalArticles}`.padStart($padding, ' ')} Articles`,
    `  ${`${totalNestedArticles}`.padStart($padding, ' ')} Nested Articles`,
    ``,
    `Rated Post Quality (${analysis ? analysis.length : 0} Total):`,
    `  ${`${totalGood}`.padStart($padding, ' ')} ${postQuality.GOOD.name}`,
    `  ${`${totalPotentialProblems}`.padStart($padding, ' ')} ${postQuality.POTENTIAL_PROBLEM.name}`,
    `  ${`${totalProblems}`.padStart($padding, ' ')} ${postQuality.PROBLEM.name}`,
    `  ${`${totalUndefined}`.padStart($padding, ' ')} ${postQuality.UNDEFINED.name}`
  ].join('\n');
}

export { describeSampleAnalyses };