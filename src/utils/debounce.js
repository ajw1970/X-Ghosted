function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        return new Promise((resolve, reject) => {
            timeout = setTimeout(() => {
                try {
                    const result = func(...args);
                    // If func returns a Promise, resolve with its result
                    if (result && typeof result.then === 'function') {
                        result.then(resolve).catch(reject);
                    } else {
                        resolve(result);
                    }
                } catch (error) {
                    reject(error);
                }
            }, wait);
        });
    };
}

export { debounce };