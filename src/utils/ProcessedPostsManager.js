import { postQuality } from './postQuality.js';
import { copyTextToClipboard } from './clipboardUtils.js';

class ProcessedPostsManager {
  constructor({ storage, log, linkPrefix }) {
    this.storage = storage || { get: () => { }, set: () => { } };
    this.log = log || console.log.bind(console);
    this.linkPrefix = linkPrefix || '';
    this.posts = {};
    this.load();
  }

  load() {
    const state = this.storage.get('xGhostedState', {});
    this.posts = {};
    const savedPosts = state.processedPosts || {};
    for (const [id, { analysis, checked }] of Object.entries(savedPosts)) {
      this.posts[id] = {
        analysis: { ...analysis },
        checked
      };
    }
    this.log(`Loaded ${Object.keys(this.posts).length} posts from storage`);
  }

  save() {
    const state = this.storage.get('xGhostedState', {});
    state.processedPosts = {};
    for (const [id, { analysis, checked }] of Object.entries(this.posts)) {
      state.processedPosts[id] = { analysis: { ...analysis }, checked };
    }
    this.storage.set('xGhostedState', state);
    this.log('Saved processed posts to storage');
  }

  getPost(id) {
    return this.posts[id] || null;
  }

  registerPost(id, data) {
    if (!id || !data?.analysis) {
      this.log(`Invalid post data for id: ${id}`);
      return false;
    }
    this.posts[id] = {
      analysis: { ...data.analysis },
      checked: data.checked || false
    };
    this.log(`Registered post: ${id} with quality: ${this.posts[id].analysis.quality.name}`, this.posts[id].analysis);
    this.save();
    return true;
  }

  getAllPosts() {
    return Object.entries(this.posts);
  }

  getProblemPosts() {
    const allPosts = Object.entries(this.posts);
    const problemPosts = allPosts.filter(
      ([_, { analysis }]) =>
        analysis.quality.name === postQuality.PROBLEM.name ||
        analysis.quality.name === postQuality.POTENTIAL_PROBLEM.name
    );
    this.log(
      `getProblemPosts: Found ${problemPosts.length} posts`,
      problemPosts.map(([id, { analysis }]) => ({ id, quality: analysis.quality.name })),
      `All posts:`,
      allPosts.map(([id, { analysis }]) => ({ id, quality: analysis.quality.name }))
    );
    return problemPosts;
  }

  clearPosts() {
    this.posts = {};
    this.save();
    this.log('Cleared all processed posts');
  }

  importPosts(csvText) {
    if (typeof csvText !== 'string' || !csvText.trim()) {
      this.log('Invalid CSV text provided');
      return 0;
    }
    const lines = csvText
      .trim()
      .split('\n')
      .map((line) =>
        line
          .split(',')
          .map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
      );
    if (lines.length < 2) {
      this.log('CSV must have at least one data row');
      return 0;
    }
    const headers = lines[0];
    const expectedHeaders = ['Link', 'Quality', 'Reason', 'Checked'];
    if (!expectedHeaders.every((header, i) => header === headers[i])) {
      this.log('CSV header mismatch');
      return 0;
    }
    const qualityMap = {
      [postQuality.UNDEFINED.name]: postQuality.UNDEFINED,
      [postQuality.PROBLEM.name]: postQuality.PROBLEM,
      [postQuality.POTENTIAL_PROBLEM.name]: postQuality.POTENTIAL_PROBLEM,
      [postQuality.GOOD.name]: postQuality.GOOD
    };
    let importedCount = 0;
    lines.slice(1).forEach((row) => {
      const [link, qualityName, reason, checkedStr] = row;
      const quality = qualityMap[qualityName];
      if (!quality) return;
      const id = link.replace(this.linkPrefix, '');
      this.posts[id] = {
        analysis: { quality, reason, link: id },
        checked: checkedStr === 'true'
      };
      importedCount++;
    });
    this.save();
    this.log(`Imported ${importedCount} posts from CSV`);
    return importedCount;
  }

  exportPosts() {
    const headers = ['Link', 'Quality', 'Reason', 'Checked'];
    const rows = Object.entries(this.posts).map(([id, { analysis, checked }]) => {
      return [
        `${this.linkPrefix}${id}`,
        analysis.quality.name,
        analysis.reason,
        checked ? 'true' : 'false'
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }

  copyProblemLinks() {
    const linksText = this.getProblemPosts()
      .map(([link]) => `${this.linkPrefix}${link}`)
      .join('\n');
    return copyTextToClipboard(linksText, this.log);
  }
}

export { ProcessedPostsManager };