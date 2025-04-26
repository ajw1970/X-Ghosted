import { postQuality } from "./postQuality.js";

class ProcessedPostsManager {
  constructor({ storage, log, linkPrefix, persistProcessedPosts = false }) {
    this.storage = storage || { get: () => {}, set: () => {} };
    this.log = log || console.log.bind(console);
    this.linkPrefix = linkPrefix || "";
    this.persistProcessedPosts = persistProcessedPosts;
    this.posts = {};
    if (this.persistProcessedPosts) {
      this.load();
    }
  }

  load() {
    if (!this.persistProcessedPosts) {
      this.log("Persistence disabled, skipping load");
      return;
    }
    const state = this.storage.get("xGhostedState", {});
    this.posts = {};
    const savedPosts = state.processedPosts || {};
    for (const [id, { analysis, checked }] of Object.entries(savedPosts)) {
      this.posts[id] = {
        analysis: { ...analysis },
        checked,
      };
    }
    this.log(`Loaded ${Object.keys(this.posts).length} posts from storage`);
  }

  save() {
    if (!this.persistProcessedPosts) {
      this.log("Persistence disabled, skipping save");
      return;
    }
    const state = this.storage.get("xGhostedState", {});
    state.processedPosts = {};
    for (const [id, { analysis, checked }] of Object.entries(this.posts)) {
      state.processedPosts[id] = { analysis: { ...analysis }, checked };
    }
    this.storage.set("xGhostedState", state);
    this.log("Saved posts to storage");
  }

  registerPost(id, data) {
    if (!id || !data?.analysis?.quality) {
      this.log(`Skipping post registration: invalid id or data for id=${id}`);
      return;
    }
    this.posts[id] = {
      analysis: { ...data.analysis },
      checked: data.checked || false,
    };
    this.log(`Registered post: ${id}`);
    if (this.persistProcessedPosts) {
      this.save();
    }
  }

  getPost(id) {
    return this.posts[id] || null;
  }

  getAllPosts() {
    return Object.entries(this.posts);
  }

  clearPosts() {
    this.posts = {};
    if (this.persistProcessedPosts) {
      this.save();
    }
    this.log("Cleared all posts");
  }

  importPosts(csvText) {
    if (!csvText) {
      this.log("No CSV text provided, skipping import");
      return 0;
    }
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",");
    const expectedHeaders = ["Link", "Quality", "Reason", "Checked"];
    if (!expectedHeaders.every((h, i) => headers[i] === h)) {
      this.log(
        "Invalid CSV format, expected headers: " + expectedHeaders.join(",")
      );
      return 0;
    }
    let importedCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const [link, quality, reason, checked] = lines[i].split(",");
      const id = link.startsWith(this.linkPrefix)
        ? link.slice(this.linkPrefix.length)
        : link;
      const qualityObj = Object.values(postQuality).find(
        (q) => q.name === quality
      );
      if (!qualityObj) {
        this.log(`Skipping invalid quality for post: ${link}`);
        continue;
      }
      this.posts[id] = {
        analysis: {
          quality: qualityObj,
          reason: reason || "",
        },
        checked: checked === "true",
      };
      importedCount++;
    }
    if (importedCount > 0) {
      this.log(`Imported ${importedCount} posts from CSV`);
      if (this.persistProcessedPosts) {
        this.save();
      }
    }
    return importedCount;
  }
}

export { ProcessedPostsManager };
