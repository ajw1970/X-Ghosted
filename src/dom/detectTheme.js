function detectTheme({ dataTheme = '', classList = [], bgColor = '' } = {}) {
    if (dataTheme.includes('lights-out') || dataTheme.includes('dark') || classList.includes('dark') || bgColor === 'rgb(0, 0, 0)') {
        return 'dark';
    } else if (dataTheme.includes('dim') || classList.includes('dim') || bgColor === 'rgb(21, 32, 43)') {
        return 'dim';
    } else {
        return 'light';
    }
}

module.exports = { detectTheme };