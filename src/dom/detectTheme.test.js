import { JSDOM } from 'jsdom';
import { detectTheme } from './detectTheme';

describe('getThemeMode', () => {
    let dom;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><body></body>', { 
            url: 'https://x.com/user/with_replies',
            resources: 'usable', // Ensures styles are processed
            runScripts: 'dangerously' // Allows scripts to manipulate DOM
        });
    });

    afterEach(() => {
        // Fully reset the body
        dom.window.document.body.removeAttribute('data-theme');
        dom.window.document.body.className = '';
        dom.window.document.body.style.backgroundColor = '';
        dom.window.document.body.innerHTML = '';
    });

    test('returns "dark" when data-theme includes "lights-out" or "dark"', () => {
        dom.window.document.body.setAttribute('data-theme', 'lights-out');
        expect(detectTheme(dom.window.document)).toBe('dark');
        dom.window.document.body.setAttribute('data-theme', 'dark');
        expect(detectTheme(dom.window.document)).toBe('dark');
    });

    test('returns "dim" when data-theme includes "dim"', () => {
        dom.window.document.body.setAttribute('data-theme', 'dim');
        expect(detectTheme(dom.window.document)).toBe('dim');
    });

    test('returns "light" when data-theme includes "light" or "default"', () => {
        dom.window.document.body.setAttribute('data-theme', 'light');
        expect(detectTheme(dom.window.document)).toBe('light');
        dom.window.document.body.setAttribute('data-theme', 'default');
        expect(detectTheme(dom.window.document)).toBe('light');
    });

    test('returns "dark" when body has dark classes', () => {
        dom.window.document.body.removeAttribute('data-theme'); // Ensure data-theme doesn’t interfere
        dom.window.document.body.classList.add('dark');
        expect(detectTheme(dom.window.document)).toBe('dark');
    });

    test('returns "dim" when body has dim classes', () => {
        dom.window.document.body.removeAttribute('data-theme');
        dom.window.document.body.classList.add('dim');
        expect(detectTheme(dom.window.document)).toBe('dim');
    });

    test('returns "light" when body has light classes', () => {
        dom.window.document.body.removeAttribute('data-theme');
        dom.window.document.body.classList.add('light');
        expect(detectTheme(dom.window.document)).toBe('light');
    });

    test('returns "dark" when background is rgb(0, 0, 0)', () => {
        dom.window.document.body.removeAttribute('data-theme');
        dom.window.document.body.className = '';
        dom.window.document.body.style.backgroundColor = 'rgb(0, 0, 0)';
        expect(detectTheme(dom.window.document)).toBe('dark');
    });

    test('returns "dim" when background is rgb(21, 32, 43)', () => {
        dom.window.document.body.removeAttribute('data-theme');
        dom.window.document.body.className = '';
        dom.window.document.body.style.backgroundColor = 'rgb(21, 32, 43)';
        expect(detectTheme(dom.window.document)).toBe('dim');
    });

    test('returns "light" when background is rgb(255, 255, 255)', () => {
        dom.window.document.body.removeAttribute('data-theme');
        dom.window.document.body.className = '';
        dom.window.document.body.style.backgroundColor = 'rgb(255, 255, 255)';
        expect(detectTheme(dom.window.document)).toBe('light');
    });

    test('returns "light" as default', () => {
        dom.window.document.body.removeAttribute('data-theme');
        dom.window.document.body.className = '';
        dom.window.document.body.style.backgroundColor = '';
        expect(detectTheme(dom.window.document)).toBe('light');
    });
});