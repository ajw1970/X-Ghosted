import { JSDOM } from 'jsdom';
import { renderPanel } from './renderPanel';
import { postQuality } from '../utils/postQuality';

describe('renderPanel', () => {
  let doc, state, uiElements;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    state = {
      processedPosts: new Map([
        ['/test/problem', { analysis: { quality: { name: 'Problem' } } }],
        ['/test/potential', { analysis: { quality: { name: 'Potential Problem' } } }]
      ]),
      postQuality: postQuality
    };
    uiElements = {
      label: doc.createElement('span'),
      contentWrapper: doc.createElement('div'),
      panel: null
    };
  });

  test('renders flagged posts', () => {
    renderPanel(doc, state, uiElements, () => {});
    expect(uiElements.label.textContent).toBe('Problem Posts (2):');
    expect(uiElements.contentWrapper.querySelectorAll('.link-item a').length).toBe(2);
  });
});