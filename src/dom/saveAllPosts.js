import { jest } from '@jest/globals';

function saveAllPosts(state, gm_setValueFn, gm_logFn) {
    if (!state.storageAvailable) {
        gm_logFn('Storage is unavailable, skipping save.');
        return;
    }

    try {
        const postsObj = Object.fromEntries(state.allPosts);
        gm_setValueFn('allPosts', JSON.stringify(postsObj));
        gm_logFn(`Saved ${state.allPosts.size} posts to storage`);
    } catch (e) {
        gm_logFn(`Failed to save posts to storage: ${e.message}. Data will be lost on page reload.`);
        state.storageAvailable = false;
    }
}

export { saveAllPosts };