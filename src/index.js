const { loadCSV, parseCSV } = require("./parser");
const { validateData } = require("./validator");
const { createReport } = require("./report");

/**
 * Validates a CSV file from disk against given rules.
 * 
 * @param {string} filePath - Path to the CSV file.
 * @param {Object} [options={}] - Validation options.
 * @param {string[]} [options.required] - List of required column names.
 * @param {string[]} [options.unique] - List of column names that must have unique values.
 * @param {Object.<string, string>} [options.types] - Map of column names to expected types ('number', 'integer', 'boolean', 'date', 'email', 'string').
 * @param {boolean} [options.allowEmptyRows=false] - Whether blank rows are considered valid.
 * @param {boolean} [options.disallowDuplicateRows=true] - Whether identical rows are flagged.
 * @param {boolean} [options.throwOnError=false] - If true, throws on parsing/file reading failure.
 * 
 * @returns {Promise<{ isValid: boolean, totalRows: number, totalErrors: number, headers: string[], errors: Array<Object>, toJSON: Function, saveJSON: Function }>}
 */
async function validate(filePath, options = {}) {
  try {
    const parsedData = await loadCSV(filePath);
    const errors = validateData(parsedData, options);

    return createReport({
      totalRows: parsedData.rows.length,
      errors,
      headers: parsedData.headers,
    });
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }

    return createReport({
      totalRows: 0,
      headers: [],
      errors: [
        {
          row: null,
          column: null,
          rule: "system_error",
          message: error.message,
        },
      ],
    });
  }
}

/**
 * Validates a raw CSV string in memory against given rules.
 * 
 * @param {string} csvContent - Raw CSV text.
 * @param {Object} [options={}] - Validation options.
 * @returns {{ isValid: boolean, totalRows: number, totalErrors: number, headers: string[], errors: Array<Object>, toJSON: Function, saveJSON: Function }}
 */
function validateString(csvContent, options = {}) {
  try {
    const parsedData = parseCSV(csvContent);
    const errors = validateData(parsedData, options);

    return createReport({
      totalRows: parsedData.rows.length,
      errors,
      headers: parsedData.headers,
    });
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }

    return createReport({
      totalRows: 0,
      headers: [],
      errors: [
        {
          row: null,
          column: null,
          rule: "system_error",
          message: error.message,
        },
      ],
    });
  }
}

module.exports = {
  validate,
  validateString,
};

module.exports.default = module.exports;
