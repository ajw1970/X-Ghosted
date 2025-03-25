import { jest } from '@jest/globals';
import saveAllPosts from './saveAllPosts';

describe('saveAllPosts', () => {
    let state;
    let gm_setValueFn;
    let gm_logFn;

    beforeEach(() => {
        // Reset mocks and state before each test
        gm_logFn = jest.fn();
        gm_setValueFn = jest.fn();

        // Set up a default state mirroring production
        state = {
            processedArticles: new WeakSet(),
            fullyProcessedArticles: new Set(),
            problemLinks: new Set(),
            allPosts: new Map(),
            isDarkMode: true,
            isPanelVisible: true,
            isCollapsingEnabled: false,
            isCollapsingRunning: false,
            isRateLimited: false,
            storageAvailable: true,
        };
    });

    it('should not save if storage is unavailable', () => {
        state.storageAvailable = false;
        saveAllPosts(state, gm_setValueFn, gm_logFn);

        expect(gm_logFn).toHaveBeenCalledWith('Storage is unavailable, skipping save.');
        expect(gm_setValueFn).not.toHaveBeenCalled();
    });

    it('should save posts to storage if available', () => {
        state.allPosts = new Map([
            ['post1', { title: 'Post 1', content: 'Content 1' }],
            ['post2', { title: 'Post 2', content: 'Content 2' }],
        ]);

        saveAllPosts(state, gm_setValueFn, gm_logFn);

        expect(gm_setValueFn).toHaveBeenCalledWith('allPosts', JSON.stringify({
            post1: { title: 'Post 1', content: 'Content 1' },
            post2: { title: 'Post 2', content: 'Content 2' },
        }));
        expect(gm_logFn).toHaveBeenCalledWith('Saved 2 posts to storage');
    });

    it('should handle errors during save and set storageAvailable to false', () => {
        gm_setValueFn.mockImplementation(() => {
            throw new Error('Failed to save');
        });

        state.allPosts = new Map([['post1', { title: 'Post', content: 'Content' }]]); // Ensure there's something to try saving

        saveAllPosts(state, gm_setValueFn, gm_logFn);

        expect(gm_setValueFn).toHaveBeenCalled();
        expect(gm_logFn).toHaveBeenCalledWith('Failed to save posts to storage: Failed to save. Data will be lost on page reload.');
        expect(state.storageAvailable).toBe(false);
    });

    it('should handle an empty map', () => {
        saveAllPosts(state, gm_setValueFn, gm_logFn);

        expect(gm_setValueFn).toHaveBeenCalledWith('allPosts', JSON.stringify({}));
        expect(gm_logFn).toHaveBeenCalledWith('Saved 0 posts to storage');
    });

    it('should correctly log the number of saved posts, even with complex data', () => {
        // Add more diverse data to the map
        state.allPosts = new Map([
            ['post1', { title: 'Post 1', content: 'Content 1', author: 'John Doe' }],
            ['post2', { title: 'Post 2', content: 'Content 2', tags: ['tag1', 'tag2'] }],
            ['post3', { title: 'Post 3', content: 'Content 3', comments: [{ user: 'Alice', text: 'Comment' }] }],
        ]);

        saveAllPosts(state, gm_setValueFn, gm_logFn);

        expect(gm_logFn).toHaveBeenCalledWith('Saved 3 posts to storage');
    });

    it('should not modify the original state object when saving', () => {
        // Deep copy the state, handling WeakSet, Set, and Map
        const originalState = {
            ...state,
            fullyProcessedArticles: new Set(state.fullyProcessedArticles),
            problemLinks: new Set(state.problemLinks),
            allPosts: new Map(state.allPosts),
        };

        // Add items to the processedArticles WeakSet *before* running saveAllPosts
        // to simulate a real-world scenario
        const article1 = { id: 1 };
        state.processedArticles.add(article1);
        const article2 = { id: 2 };
        state.processedArticles.add(article2);

        saveAllPosts(state, gm_setValueFn, gm_logFn);

        expect(state.storageAvailable).toEqual(originalState.storageAvailable);
        expect(areMapsEqual(state.allPosts, originalState.allPosts)).toBe(true);
        expect(areSetsEqual(state.fullyProcessedArticles, originalState.fullyProcessedArticles)).toBe(true);
        expect(areSetsEqual(state.problemLinks, originalState.problemLinks)).toBe(true);

        // Because WeakSet doesn't support iteration or comparison of values,
        // all we can do is ensure that the *reference* hasn't changed.
        // We want to make sure that we didn't reassign state.processedArticles
        expect(state.processedArticles).toBe(state.processedArticles);


    });

    // Helper functions to compare Set and Map content
    function areSetsEqual(set1, set2) {
        if (set1.size !== set2.size) return false;
        for (let item of set1) {
            if (!set2.has(item)) return false;
        }
        return true;
    }

    function areMapsEqual(map1, map2) {
        if (map1.size !== map2.size) return false;
        for (let [key, val] of map1) {
            if (!map2.has(key) || !deepCompare(val, map2.get(key))) {
                return false;
            }
        }
        return true;
    }

    function deepCompare(obj1, obj2) {
        if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
            return obj1 === obj2;
        }

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) {
            return false;
        }

        for (let key of keys1) {
            if (!obj2.hasOwnProperty(key) || !deepCompare(obj1[key], obj2[key])) {
                return false;
            }
        }

        return true;
    }
});