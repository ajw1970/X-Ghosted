// detectTheme.test.js
const { detectTheme } = require('./detectTheme');

describe('detectTheme', () => {
    test('returns "dark" when dataTheme includes "lights-out"', () => {
        const result = detectTheme({ dataTheme: 'lights-out' });
        expect(result).toBe('dark');
    });

    test('returns "dark" when dataTheme includes "dark"', () => {
        const result = detectTheme({ dataTheme: 'dark-mode' });
        expect(result).toBe('dark');
    });

    test('returns "dark" when classList includes "dark"', () => {
        const result = detectTheme({ classList: ['dark'] });
        expect(result).toBe('dark');
    });

    test('returns "dark" when bgColor is "rgb(0, 0, 0)"', () => {
        const result = detectTheme({ bgColor: 'rgb(0, 0, 0)' });
        expect(result).toBe('dark');
    });

    test('returns "dim" when dataTheme includes "dim"', () => {
        const result = detectTheme({ dataTheme: 'dim-theme' });
        expect(result).toBe('dim');
    });

    test('returns "dim" when classList includes "dim"', () => {
        const result = detectTheme({ classList: ['dim'] });
        expect(result).toBe('dim');
    });

    test('returns "dim" when bgColor is "rgb(21, 32, 43)"', () => {
        const result = detectTheme({ bgColor: 'rgb(21, 32, 43)' });
        expect(result).toBe('dim');
    });

    test('returns "light" when no conditions match', () => {
        const result = detectTheme({ dataTheme: 'other', classList: ['foo'], bgColor: 'rgb(255, 255, 255)' });
        expect(result).toBe('light');
    });

    test('returns "light" with default empty inputs', () => {
        const result = detectTheme();
        expect(result).toBe('light');
    });

    test('prioritizes "dark" over "dim" when both conditions present', () => {
        const result = detectTheme({ dataTheme: 'dark dim', classList: ['dim', 'dark'], bgColor: 'rgb(0, 0, 0)' });
        expect(result).toBe('dark');
    });

    test('handles empty classList and invalid bgColor correctly', () => {
        const result = detectTheme({ dataTheme: '', classList: [], bgColor: 'invalid' });
        expect(result).toBe('light');
    });

    test('is case-sensitive for dataTheme and classList checks', () => {
        const result = detectTheme({ dataTheme: 'DARK', classList: ['DARK'] });
        expect(result).toBe('light'); // Should not match 'dark'
    });

    test('handles partial matches in dataTheme correctly', () => {
        const result = detectTheme({ dataTheme: 'darkish lights-outside' });
        expect(result).toBe('dark'); // Should match 'lights-out'
    });
});