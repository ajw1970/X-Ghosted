function detectTheme(doc) {
    // First, check for data-theme attribute
    const dataTheme = doc.body.getAttribute('data-theme');
    // console.log(`Detected data-theme: ${dataTheme}`);
    if (dataTheme) {
        if (dataTheme.includes('lights-out') || dataTheme.includes('dark')) {
            return 'dark';
        } else if (dataTheme.includes('dim')) {
            return 'dim';
        } else if (dataTheme.includes('light') || dataTheme.includes('default')) {
            return 'light';
        }
    }

    // Fallback: Check body class
    const bodyClasses = doc.body.classList;
    // console.log(`Body classes: ${Array.from(bodyClasses).join(', ')}`);
    if (
        bodyClasses.contains('dark') ||
        bodyClasses.contains('theme-dark') ||
        bodyClasses.contains('theme-lights-out')
    ) {
        return 'dark';
    } else if (
        bodyClasses.contains('dim') ||
        bodyClasses.contains('theme-dim')
    ) {
        return 'dim';
    } else if (
        bodyClasses.contains('light') ||
        bodyClasses.contains('theme-light')
    ) {
        return 'light';
    }

    // Fallback: Check background color of the body
    // --- Changed line: Use doc.defaultView.getComputedStyle for jsdom compatibility ---
    const bodyBgColor = doc.defaultView.getComputedStyle(doc.body).backgroundColor;
    // console.log(`Body background color: ${bodyBgColor}`);
    if (bodyBgColor === 'rgb(0, 0, 0)') {
        // Lights Out / Dark
        return 'dark';
    } else if (bodyBgColor === 'rgb(21, 32, 43)') {
        // Dim (#15202B)
        return 'dim';
    } else if (bodyBgColor === 'rgb(255, 255, 255)') {
        // Light
        return 'light';
    }

    // Default to Light if all detection fails
    return 'light';
}

export default detectTheme;