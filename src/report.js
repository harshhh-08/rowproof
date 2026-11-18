const fs = require("fs");
const path = require("path");

/**
 * Creates a clean, structured validation report object.
 * 
 * @param {Object} params
 * @param {number} params.totalRows - Total number of data rows evaluated
 * @param {Array<Object>} params.errors - List of validation errors
 * @param {string[]} params.headers - List of headers found
 * @returns {Object} Structured report with helper methods
 */
function createReport({ totalRows, errors, headers }) {
  const isValid = errors.length === 0;

  const report = {
    isValid,
    totalRows,
    totalErrors: errors.length,
    headers,
    errors,

    /**
     * Returns report as a formatted JSON string.
     * @param {number} indent
     * @returns {string}
     */
    toJSON(indent = 2) {
      return JSON.stringify(
        {
          isValid: this.isValid,
          totalRows: this.totalRows,
          totalErrors: this.totalErrors,
          headers: this.headers,
          errors: this.errors,
        },
        null,
        indent
      );
    },

    /**
     * Saves the validation report to a JSON file.
     * @param {string} exportPath - File path to save report JSON
     * @returns {Promise<void>}
     */
    async saveJSON(exportPath) {
      if (!exportPath || typeof exportPath !== "string") {
        throw new Error("Export path must be a valid string.");
      }
      const resolved = path.resolve(exportPath);
      await fs.promises.writeFile(resolved, this.toJSON(), "utf-8");
    },
  };

  return report;
}

module.exports = {
  createReport,
};
