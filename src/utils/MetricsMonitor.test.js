import { describe, it, expect, vi } from 'vitest';
import { MetricsMonitor } from './MetricsMonitor';

describe('MetricsMonitor', () => {
    let metricsMonitor, log, storage;

    beforeEach(() => {
        log = vi.fn();
        storage = {
            get: vi.fn(() => ({})),
            set: vi.fn()
        };
        metricsMonitor = new MetricsMonitor({
            timing: { pollInterval: 1000, scrollInterval: 1500 },
            log,
            storage
        });
    });

    it('initializes with default metrics', () => {
        expect(metricsMonitor.metrics).toEqual({
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
        expect(log).toHaveBeenCalledWith('MetricsMonitor initialized');
    });

    it('records poll metrics correctly', () => {
        metricsMonitor.recordPoll({
            postsProcessed: 5,
            wasSkipped: false,
            containerFound: true,
            containerAttempted: true,
            pageType: 'with_replies'
        });
        expect(metricsMonitor.metrics).toMatchObject({
            polls: 1,
            postsProcessed: [5],
            pollSkips: 0,
            containerFinds: 1,
            containerDetectionAttempts: 1,
            pageType: 'with_replies'
        });
        expect(metricsMonitor.metrics.containerFoundTimestamp).toBeGreaterThan(0);
    });

    it('records skip metrics correctly', () => {
        metricsMonitor.recordPoll({
            postsProcessed: 0,
            wasSkipped: true,
            containerFound: false,
            containerAttempted: false,
            pageType: 'timeline'
        });
        expect(metricsMonitor.metrics).toMatchObject({
            polls: 1,
            postsProcessed: [0],
            pollSkips: 1,
            containerFinds: 0,
            containerDetectionAttempts: 0,
            pageType: 'timeline'
        });
    });

    it('records failed container attempt correctly', () => {
        metricsMonitor.recordPoll({
            postsProcessed: 0,
            wasSkipped: false,
            containerFound: false,
            containerAttempted: true,
            pageType: 'profile'
        });
        expect(metricsMonitor.metrics).toMatchObject({
            polls: 1,
            postsProcessed: [0],
            pollSkips: 0,
            containerFinds: 0,
            containerDetectionAttempts: 1,
            pageType: 'profile'
        });
    });

    it('records scroll metrics correctly', () => {
        metricsMonitor.recordScroll({ bottomReached: true });
        expect(metricsMonitor.metrics).toMatchObject({
            scrolls: 1,
            bottomReached: 1
        });
    });

    it('records highlighting duration correctly', () => {
        metricsMonitor.recordHighlighting(50);
        expect(metricsMonitor.metrics.highlightingDurations).toEqual([50]);
    });

    it('sets post density correctly', () => {
        metricsMonitor.setPostDensity(20);
        expect(metricsMonitor.metrics.postDensity).toBe(20);
        expect(log).toHaveBeenCalledWith('Set post density: 20');
    });

    it('sets initial wait time correctly', () => {
        metricsMonitor.setInitialWaitTime(3000);
        expect(metricsMonitor.metrics.initialWaitTime).toBe(3000);
        expect(log).toHaveBeenCalledWith('Initial wait time set: 3000ms');
    });

    it('logs metrics every 100 polls', () => {
        metricsMonitor.metrics.polls = 99;
        metricsMonitor.recordPoll({
            postsProcessed: 3,
            wasSkipped: false,
            containerFound: true,
            containerAttempted: true,
            pageType: 'profile'
        });
        expect(log).toHaveBeenCalledWith('Timing Metrics:', expect.any(Object));
    });

    it('saves and loads metrics', () => {
        metricsMonitor.recordPoll({
            postsProcessed: 2,
            wasSkipped: false,
            containerFound: true,
            containerAttempted: true,
            pageType: 'timeline'
        });
        metricsMonitor.setInitialWaitTime(3000);
        metricsMonitor.saveMetrics();
        expect(storage.set).toHaveBeenCalledWith('xGhostedState', expect.any(Object));
        storage.get.mockReturnValue({ timingMetrics: metricsMonitor.metrics });
        metricsMonitor.loadMetrics();
        expect(metricsMonitor.metrics.polls).toBe(1);
        expect(metricsMonitor.metrics.containerFinds).toBe(1);
        expect(metricsMonitor.metrics.initialWaitTime).toBe(3000);
    });

    it('does not save metrics without container or posts', () => {
        metricsMonitor.recordPoll({
            postsProcessed: 0,
            wasSkipped: true,
            containerFound: false,
            containerAttempted: true,
            pageType: 'timeline'
        });
        metricsMonitor.saveMetrics();
        expect(storage.set).not.toHaveBeenCalled();
    });
});