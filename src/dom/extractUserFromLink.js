function extractUserFromLink (link) {
    if (!link) return null;
    const match = link.match(/^\/([^/]+)/);
    return match ? match[1] : null;
  };

  export { extractUserFromLink }