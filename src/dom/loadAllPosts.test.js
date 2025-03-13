const { loadAllPosts } = require('./loadAllPosts');

describe('loadAllPosts', () => {
    let mockGM_getValue;
    let mockGM_log;
    let mockState;
    let mockUiElements;
    let mockDocument;

    beforeEach(() => {
        // Reset mocks before each test
        mockGM_getValue = jest.fn();
        mockGM_log = jest.fn();
        mockState = { storageAvailable: true, allPosts: new Map() };
        mockUiElements = { panel: document.createElement('div'), toolsSection: document.createElement('div'), storageWarning: null };
        mockDocument = {
            createElement: jest.fn().mockReturnValue({ style: {}, textContent: '' }), // Mock createElement
            body: { appendChild: jest.fn() } // Mock appendChild on document.body
        };
    });

    test('Storage Available, Successful Load', () => {
        mockGM_getValue.mockReturnValue(JSON.stringify({ post1: 'value1', post2: 'value2' }));

        loadAllPosts(mockGM_getValue, mockGM_log, mockState, mockUiElements, mockDocument);

        expect(mockGM_getValue).toHaveBeenCalledWith('allPosts', '{}');
        expect(mockGM_log).toHaveBeenCalledWith('Loaded 2 posts from storage');
        expect(mockState.allPosts.size).toBe(2);
        expect(mockState.allPosts.get('post1')).toBe('value1');
        expect(mockState.allPosts.get('post2')).toBe('value2');
    });

    test('Storage Available, Load Fails (JSON Parsing Error)', () => {
        mockGM_getValue.mockReturnValue('{invalid: json}');
        mockDocument.body.insertBefore = jest.fn();
        const mockStorageWarning = {
            style: {},
            textContent: '',
        };

        mockDocument.createElement.mockReturnValue(mockStorageWarning); // Mock the result of createElement
        mockUiElements.panel = { insertBefore: jest.fn() };
        mockUiElements.toolsSection = {};

        loadAllPosts(mockGM_getValue, mockGM_log, mockState, mockUiElements, mockDocument);

        expect(mockGM_log).toHaveBeenCalledWith(expect.stringContaining('Failed to load posts from storage'));
        expect(mockState.storageAvailable).toBe(false);
        expect(mockState.allPosts.size).toBe(0);
        expect(mockDocument.createElement).toHaveBeenCalledWith('div');
        expect(mockUiElements.panel.insertBefore).toHaveBeenCalledWith(mockStorageWarning, mockUiElements.toolsSection); // Assert insertBefore was called
    });

    test('Storage Not Available', () => {
        mockState.storageAvailable = false;

        loadAllPosts(mockGM_getValue, mockGM_log, mockState, mockUiElements, mockDocument);

        expect(mockGM_log).toHaveBeenCalledWith('Storage is unavailable, using in-memory storage.');
        expect(mockState.allPosts.size).toBe(0);
    });
});