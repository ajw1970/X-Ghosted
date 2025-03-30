import { JSDOM } from 'jsdom';
import { togglePanelVisibility } from './togglePanelVisibility';

describe('togglePanelVisibility', () => {
  let dom, doc, state, uiElements;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    doc = dom.window.document;
    state = { isPanelVisible: true };
    uiElements = {
      panel: doc.createElement('div'),
      label: doc.createElement('span'),
      toolsToggle: doc.createElement('button'),
      modeSelector: doc.createElement('select'),
      toggleButton: doc.createElement('button'),
      contentWrapper: doc.createElement('div'),
      controlRow: doc.createElement('div'),
      toolsSection: doc.createElement('div'),
      config: {
        PANEL: {
          WIDTH: '350px',
          MAX_HEIGHT: 'calc(100vh - 70px)',
          RIGHT: '10px',
          TOP: '60px',
        },
      },
    };
    // Set initial styles
    uiElements.panel.style.width = '350px';
    uiElements.panel.style.maxHeight = 'calc(100vh - 70px)';
    uiElements.panel.style.minWidth = '250px';
    uiElements.panel.style.minHeight = '150px';
    uiElements.label.style.display = 'inline-block';
    uiElements.toolsToggle.style.display = 'flex';
    uiElements.modeSelector.style.display = 'inline-block';
    uiElements.contentWrapper.style.display = 'block';
    uiElements.controlRow.style.display = 'flex';
    uiElements.toolsSection.style.display = 'none';
    uiElements.toggleButton.innerHTML = '<span>Hide</span>';
    uiElements.toggleButton.style.display = 'flex';
  });

  test('hides panel and updates toggle button text', () => {
    togglePanelVisibility(state, uiElements);
    expect(state.isPanelVisible).toBe(false);
    expect(uiElements.panel.style.width).toBe('auto');
    expect(uiElements.panel.style.minWidth).toBe('180px');
    expect(uiElements.panel.style.maxHeight).toBe('80px');
    expect(uiElements.label.style.display).toBe('none');
    expect(uiElements.toolsToggle.style.display).toBe('none');
    expect(uiElements.modeSelector.style.display).toBe('none');
    expect(uiElements.contentWrapper.style.display).toBe('none');
    expect(uiElements.controlRow.style.display).toBe('none');
    expect(uiElements.toolsSection.style.display).toBe('none');
    expect(uiElements.toggleButton.querySelector('span').textContent).toBe('Show');
    expect(uiElements.toggleButton.style.display).toBe('inline-block');
  });

  test('shows panel and restores dimensions', () => {
    state.isPanelVisible = false;
    uiElements.panel.style.width = 'auto';
    uiElements.panel.style.minWidth = '180px';
    uiElements.panel.style.maxHeight = '80px';
    uiElements.toggleButton.querySelector('span').textContent = 'Show';
    togglePanelVisibility(state, uiElements);
    expect(state.isPanelVisible).toBe(true);
    expect(uiElements.panel.style.width).toBe('350px');
    expect(uiElements.panel.style.maxHeight).toBe('calc(100vh - 70px)');
    expect(uiElements.panel.style.minWidth).toBe('250px');
    expect(uiElements.panel.style.minHeight).toBe('150px');
    expect(uiElements.label.style.display).toBe('inline-block');
    expect(uiElements.toolsToggle.style.display).toBe('inline-block');
    expect(uiElements.modeSelector.style.display).toBe('inline-block');
    expect(uiElements.contentWrapper.style.display).toBe('block');
    expect(uiElements.controlRow.style.display).toBe('flex');
    expect(uiElements.toolsSection.style.display).toBe('none');
    expect(uiElements.toggleButton.querySelector('span').textContent).toBe('Hide');
  });

  test('dynamically hides all elements except toggleButton when hiding', () => {
    togglePanelVisibility(state, uiElements);
    const hiddenElements = [
      uiElements.label,
      uiElements.toolsToggle,
      uiElements.modeSelector,
      uiElements.contentWrapper,
      uiElements.controlRow,
      uiElements.toolsSection,
    ];
    hiddenElements.forEach((el) => expect(el.style.display).toBe('none'));
    expect(uiElements.toggleButton.style.display).toBe('inline-block');
  });

  test('shrinks panel dimensions when hiding and restores when showing', () => {
    togglePanelVisibility(state, uiElements);
    expect(uiElements.panel.style.width).toBe('auto');
    expect(uiElements.panel.style.minWidth).toBe('180px');
    expect(uiElements.panel.style.maxHeight).toBe('80px');

    togglePanelVisibility(state, uiElements);
    expect(uiElements.panel.style.width).toBe('350px');
    expect(uiElements.panel.style.maxHeight).toBe('calc(100vh - 70px)');
    expect(uiElements.panel.style.minWidth).toBe('250px');
    expect(uiElements.panel.style.minHeight).toBe('150px');
  });
});