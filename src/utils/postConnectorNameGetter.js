import { postConnector } from "./postConnector";

/**
 * Gets the name of a postConnector value or 'none' if false
 * @param {postConnector | false} connector
 * @returns {string}
 */
function postConnectorNameGetter(connector) {
    if (!connector) return "none";
    if (connector === postConnector.DIVIDES) return "DIVIDES";
    if (connector === postConnector.INDEPENDENT) return "INDEPENDENT";
    if (connector === postConnector.STARTS) return "STARTS";
    if (connector === postConnector.CONTINUES) return "CONTINUES";
    if (connector === postConnector.DANGLES) return "DANGLES";
    return "unknown";
  }

  export { postConnectorNameGetter }