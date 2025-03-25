import summarizeRatedPosts from './summarizeRatedPosts';
import postQuality from './postQuality';
const { GOOD, UNDEFINED, PROBLEM, POTENTIAL_PROBLEM } = postQuality;

function describeSampleAnalyses(document, analysis) {
  const totalPosts = document.querySelectorAll('div[data-testid="cellInnerDiv"]').length;
  const totalArticles = document.querySelectorAll('article:not(article article)').length;
  const totalNestedArticles = document.querySelectorAll('article article').length;
  const postQualitySummary = summarizeRatedPosts(analysis);

  const $padding = 2;
  const totalGood = postQualitySummary[GOOD.name];
  const totalPotentialProblems = postQualitySummary[POTENTIAL_PROBLEM.name];
  const totalProblems = postQualitySummary[PROBLEM.name];
  const totalUndefined = postQualitySummary[UNDEFINED.name];

  return [
    `Structure Summary Totals:`,
    `  ${`${totalPosts}`.padStart($padding, ' ')} Posts`,
    `  ${`${totalArticles}`.padStart($padding, ' ')} Articles`,
    `  ${`${totalNestedArticles}`.padStart($padding, ' ')} Nested Articles`,
    ``,
    `Rated Post Quality (${analysis ? analysis.length : 0} Total):`,
    `  ${`${totalGood}`.padStart($padding, ' ')} ${GOOD.name}`,
    `  ${`${totalPotentialProblems}`.padStart($padding, ' ')} ${POTENTIAL_PROBLEM.name}`,
    `  ${`${totalProblems}`.padStart($padding, ' ')} ${PROBLEM.name}`,
    `  ${`${totalUndefined}`.padStart($padding, ' ')} ${UNDEFINED.name}`
  ].join('\n');
}

export default describeSampleAnalyses;