import { postConnector } from "./postConnector";

function identifyPostConnectors(post) {
    const container = post.querySelector('.r-18u37iz');
    if (!container) {
        return postConnector.DISCONNECTED;
    }

    // Check for the presence of connecting lines and indentation
    const lines = container.querySelectorAll('.r-m5arl1');
    const hasIndentation = container.querySelector('.r-15zivkp');

    if (lines.length === 1) {
        if (hasIndentation) {
            return postConnector.ENDS;
        }
        return postConnector.STARTS;
    } 
    return postConnector.CONTINUES;
  }

  export { identifyPostConnectors };