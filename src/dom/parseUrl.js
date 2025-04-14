function parseUrl(url) {
  const reservedPaths = [
    'i',
    'notifications',
    'home',
    'explore',
    'messages',
    'compose',
    'settings'
  ];
  const regex = /^https:\/\/x\.com\/([^/]+)(?:\/(with_replies))?/;
  const match = url.match(regex);
  if (match && !reservedPaths.includes(match[1])) {
    return {
      isWithReplies: !!match[2],
      userProfileName: match[1]
    };
  }
  return {
    isWithReplies: false,
    userProfileName: null
  };
}

export { parseUrl };