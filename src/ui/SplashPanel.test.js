import { describe, it, expect, vi } from 'vitest';
import { SplashPanel } from './SplashPanel.js';
import { JSDOM } from 'jsdom';

describe('SplashPanel', () => {
  let dom, doc, logger;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body></body>');
    doc = dom.window.document;
    logger = vi.fn();
  });

  it('initializes and renders default content', () => {
    const splash = new SplashPanel(doc, logger);
    
    expect(doc.getElementById('xghosted-splash')).toBeTruthy();
    expect(doc.querySelector('h2').textContent).toBe('Welcome to xGhosted!');
    expect(doc.querySelectorAll('p')[0].textContent).toBe('Tampermonkey Version: 0.6.1');
    expect(doc.querySelectorAll('p')[1].textContent).toBe('Poll Interval: Unknown ms');
    expect(doc.querySelectorAll('p')[2].textContent).toBe('Scroll Interval: Unknown ms');
    expect(logger).toHaveBeenCalledWith('Initializing SplashPanel...');
  });

  it('updates content on xghosted:init event', () => {
    const splash = new SplashPanel(doc, logger);
    
    doc.dispatchEvent(new dom.window.CustomEvent('xghosted:init', {
      detail: {
        config: {
          pollInterval: 1000,
          scrollInterval: 1500
        }
      }
    }));

    expect(doc.querySelectorAll('p')[1].textContent).toBe('Poll Interval: 1000 ms');
    expect(doc.querySelectorAll('p')[2].textContent).toBe('Scroll Interval: 1500 ms');
    expect(logger).toHaveBeenCalledWith('Received xghosted:init with config:', {
      pollInterval: 1000,
      scrollInterval: 1500
    });
  });

  it('removes container on close button click', () => {
    const splash = new SplashPanel(doc, logger);
    
    const closeButton = doc.querySelector('button');
    closeButton.click();
    
    expect(doc.getElementById('xghosted-splash')).toBeNull();
    expect(logger).toHaveBeenCalledWith('SplashPanel closed');
  });
});