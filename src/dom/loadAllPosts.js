function loadAllPosts(gmGetValue, gmLog, state, uiElements, document) {
    if (!state.storageAvailable) {
        gmLog('Storage is unavailable, using in-memory storage.');
        state.allPosts = new Map();
        return;
    }

    try {
        const savedPosts = gmGetValue('allPosts', '{}');
        const parsedPosts = JSON.parse(savedPosts);
        state.allPosts = new Map(Object.entries(parsedPosts));
        gmLog(`Loaded ${state.allPosts.size} posts from storage`);
    } catch (e) {
        gmLog(`Failed to load posts from storage: ${e.message}. Using in-memory storage.`);
        state.storageAvailable = false;
        state.allPosts = new Map();
        if (!uiElements.storageWarning) {
            uiElements.storageWarning = document.createElement('div');
            Object.assign(uiElements.storageWarning.style, {
                color: 'yellow',
                fontSize: '12px',
                marginBottom: '8px',
            });
            uiElements.storageWarning.textContent = 'Warning: Storage is unavailable (e.g., InPrivate mode). Data will not persist.';
            if (uiElements.panel && uiElements.toolsSection) {
              uiElements.panel.insertBefore(uiElements.storageWarning, uiElements.toolsSection);
            }
        }
    }
}

export { loadAllPosts };