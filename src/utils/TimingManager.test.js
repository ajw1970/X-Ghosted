import { describe, it, expect, vi } from 'vitest';
import { TimingManager } from './TimingManager';

describe('TimingManager', () => {
    let timingManager, log, storage;

    beforeEach(() => {
        log = vi.fn();
        storage = {
            get: vi.fn(() => ({})),
            set: vi.fn()
        };
        timingManager = new TimingManager({
            timing: { pollInterval: 1000, scrollInterval: 1500 },
            log,
            storage
        });
    });

    it('initializes with default metrics', () => {
        expect(timingManager.metrics).toEqual({
            polls: 0,
            postsProcessed: [],
            pollSkips: 0,
            containerFinds: 0,
            containerDetectionAttempts: 0,
            containerFoundTimestamp: null,
            initialWaitTime: null,
            scrolls: 0,
            bottomReached: 0,
            highlightingDurations: [],
            postDensity: 0,
            pageType: 'unknown'
        });
        expect(log).toHaveBeenCalledWith('TimingManager initialized');
    });

    it('records poll metrics correctly', () => {
        timingManager.recordPoll({
            postsProcessed: 5,
            wasSkipped: false,
            containerFound: true,
            containerAttempted: true,
            pageType: 'with_replies'
        });
        expect(timingManager.metrics).toMatchObject({
            polls: 1,
            postsProcessed: [5],
            pollSkips: 0,
            containerFinds: 1,
            containerDetectionAttempts: 1,
            pageType: 'with_replies'
        });
        expect(timingManager.metrics.containerFoundTimestamp).toBeGreaterThan(0);
    });

    it('records skip metrics correctly', () => {
        timingManager.recordPoll({
            postsProcessed: 0,
            wasSkipped: true,
            containerFound: false,
            containerAttempted: false,
            pageType: 'timeline'
        });
        expect(timingManager.metrics).toMatchObject({
            polls: 1,
            postsProcessed: [0],
            pollSkips: 1,
            containerFinds: 0,
            containerDetectionAttempts: 0,
            pageType: 'timeline'
        });
    });

    it('records failed container attempt correctly', () => {
        timingManager.recordPoll({
            postsProcessed: 0,
            wasSkipped: false,
            containerFound: false,
            containerAttempted: true,
            pageType: 'profile'
        });
        expect(timingManager.metrics).toMatchObject({
            polls: 1,
            postsProcessed: [0],
            pollSkips: 0,
            containerFinds: 0,
            containerDetectionAttempts: 1,
            pageType: 'profile'
        });
    });

    it('records scroll metrics correctly', () => {
        timingManager.recordScroll({ bottomReached: true });
        expect(timingManager.metrics).toMatchObject({
            scrolls: 1,
            bottomReached: 1
        });
    });

    it('records highlighting duration correctly', () => {
        timingManager.recordHighlighting(50);
        expect(timingManager.metrics.highlightingDurations).toEqual([50]);
    });

    it('sets post density correctly', () => {
        timingManager.setPostDensity(20);
        expect(timingManager.metrics.postDensity).toBe(20);
        expect(log).toHaveBeenCalledWith('Set post density: 20');
    });

    it('sets initial wait time correctly', () => {
        timingManager.setInitialWaitTime(3000);
        expect(timingManager.metrics.initialWaitTime).toBe(3000);
        expect(log).toHaveBeenCalledWith('Initial wait time set: 3000ms');
    });

    it('logs metrics every 100 polls', () => {
        timingManager.metrics.polls = 99;
        timingManager.recordPoll({
            postsProcessed: 3,
            wasSkipped: false,
            containerFound: true,
            containerAttempted: true,
            pageType: 'profile'
        });
        expect(log).toHaveBeenCalledWith('Timing Metrics:', expect.any(Object));
    });

    it('saves and loads metrics', () => {
        timingManager.recordPoll({
            postsProcessed: 2,
            wasSkipped: false,
            containerFound: true,
            containerAttempted: true,
            pageType: 'timeline'
        });
        timingManager.setInitialWaitTime(3000);
        timingManager.saveMetrics();
        expect(storage.set).toHaveBeenCalledWith('xGhostedState', expect.any(Object));
        storage.get.mockReturnValue({ timingMetrics: timingManager.metrics });
        timingManager.loadMetrics();
        expect(timingManager.metrics.polls).toBe(1);
        expect(timingManager.metrics.containerFinds).toBe(1);
        expect(timingManager.metrics.initialWaitTime).toBe(3000);
    });

    it('does not save metrics without container or posts', () => {
        timingManager.recordPoll({
            postsProcessed: 0,
            wasSkipped: true,
            containerFound: false,
            containerAttempted: true,
            pageType: 'timeline'
        });
        timingManager.saveMetrics();
        expect(storage.set).not.toHaveBeenCalled();
    });
});