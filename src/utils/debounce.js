function debounce(func, wait) {
  let timeout;
  return (...args) => {
      clearTimeout(timeout);
      if (wait === 0) {
          func(...args); // Call synchronously if wait is 0
      } else {
          timeout = setTimeout(() => func(...args), wait);
      }
  };
}

export default debounce;