import { postQuality } from "./postQuality.js";
import { CONFIG } from "../config.js";
import { EVENTS } from "../events.js";
import { domUtils } from "../dom/domUtils.js";

class ProcessedPostsManager {
  constructor({ storage, log, linkPrefix, persistProcessedPosts, document }) {
    this.storage = storage || { get: () => {}, set: () => {} };
    this.log = log || console.log.bind(console);
    this.linkPrefix = linkPrefix || CONFIG.linkPrefix;
    this.persistProcessedPosts =
      persistProcessedPosts ?? CONFIG.persistProcessedPosts;
    this.posts = {};
    this.document = document;
    if (this.persistProcessedPosts) {
      this.load();
    }
    this.initEventListeners();
  }

  initEventListeners() {
    domUtils.addEventListener(
      this.document,
      EVENTS.INIT_COMPONENTS,
      ({ detail: { config } }) => {
        this.linkPrefix = config.linkPrefix || this.linkPrefix;
        this.persistProcessedPosts =
          config.persistProcessedPosts ?? this.persistProcessedPosts;
        if (this.persistProcessedPosts) {
          this.load();
        }
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.POST_REGISTERED,
      ({ detail: { href, data } }) => {
        if (!data?.analysis?.quality) {
          this.log(
            `Skipping post registration: no quality data for href=${href}`
          );
          return;
        }
        if (!href || href === "false") {
          this.log(
            `Skipping post with invalid href: ${href}${data.analysis.quality.name === "Problem" ? " (PROBLEM)" : ""}`
          );
          return;
        }
        this.registerPost(href, data);
        this.log(`Registered post: ${href}`);
        domUtils.dispatchEvent(
          this.document,
          new CustomEvent(EVENTS.POST_REGISTERED_CONFIRMED, {
            detail: { href, data },
          })
        );
      }
    );

    domUtils.addEventListener(
      this.document,
      EVENTS.POST_REQUESTED,
      ({ detail: { href } }) => {
        const post = this.getPost(href);
        domUtils.dispatchEvent(
          this.document,
          new CustomEvent(EVENTS.POST_RETRIEVED, {
            detail: { href, post },
          })
        );
        this.log(`Retrieved post: ${href}`);
      }
    );

    domUtils.addEventListener(this.document, EVENTS.CLEAR_POSTS, async () => {
      await this.clearPosts();
      domUtils.dispatchEvent(
        this.document,
        new CustomEvent(EVENTS.POSTS_CLEARED_CONFIRMED, {
          detail: {},
        })
      );
      domUtils.dispatchEvent(
        this.document,
        new CustomEvent(EVENTS.POSTS_CLEARED, {
          detail: {},
        })
      );
      this.log("Cleared all posts");
    });

    domUtils.addEventListener(
      this.document,
      EVENTS.CLEAR_POSTS_UI,
      async () => {
        if (confirm("Clear all processed posts?")) {
          await this.clearPosts();
          domUtils.dispatchEvent(
            this.document,
            new CustomEvent(EVENTS.POSTS_CLEARED_CONFIRMED, {
              detail: {},
            })
          );
          domUtils.dispatchEvent(
            this.document,
            new CustomEvent(EVENTS.POSTS_CLEARED, {
              detail: {},
            })
          );
          this.log("Cleared all posts via UI");
        }
      }
    );

    domUtils.addEventListener(this.document, EVENTS.REQUEST_POSTS, () => {
      const posts = this.getAllPosts();
      domUtils.dispatchEvent(
        this.document,
        new CustomEvent(EVENTS.POSTS_RETRIEVED, {
          detail: { posts },
        })
      );
      this.log("Dispatched xghosted:posts-retrieved with posts:", posts);
    });

    domUtils.addEventListener(
      this.document,
      EVENTS.REQUEST_IMPORT_CSV,
      ({ detail: { csvText } }) => {
        const importedCount = this.importPosts(csvText);
        domUtils.dispatchEvent(
          this.document,
          new CustomEvent(EVENTS.CSV_IMPORTED, {
            detail: { importedCount },
          })
        );
        this.log("Dispatched xghosted:csv-imported with count:", importedCount);
      }
    );

    domUtils.addEventListener(this.document, EVENTS.EXPORT_CSV, () => {
      const csvData = this.exportPostsToCSV();
      domUtils.dispatchEvent(
        this.document,
        new CustomEvent(EVENTS.CSV_EXPORTED, {
          detail: { csvData },
        })
      );
      this.log("Dispatched xghosted:csv-exported");
    });
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

  exportPostsToCSV() {
    const headers = ["Link", "Quality", "Reason", "Checked"];
    const rows = Object.entries(this.posts).map(
      ([id, { analysis, checked }]) => {
        return [
          `${this.linkPrefix}${id}`,
          analysis.quality.name,
          analysis.reason,
          checked ? "true" : "false",
        ].join(",");
      }
    );
    return [headers.join(","), ...rows].join("\n");
  }
}

export { ProcessedPostsManager };