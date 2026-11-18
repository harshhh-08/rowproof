/**
 * Helper to check if a value is considered empty or missing.
 * @param {string} value
 * @returns {boolean}
 */
function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

/**
 * Validates a value against an expected data type.
 * Supported types: number, integer, boolean, date, email, string.
 * @param {string} value
 * @param {string} expectedType
 * @returns {boolean}
 */
function isValidType(value, expectedType) {
  if (isBlank(value)) {
    return true; // Skip type checking for blank values; missing checks handle blanks
  }

  const trimmed = String(value).trim();
  const lowerType = expectedType.toLowerCase();

  switch (lowerType) {
    case "number":
      return !isNaN(Number(trimmed));

    case "integer": {
      const num = Number(trimmed);
      return !isNaN(num) && Number.isInteger(num);
    }

    case "boolean": {
      const lower = trimmed.toLowerCase();
      return ["true", "false", "1", "0", "yes", "no"].includes(lower);
    }

    case "date":
      return !isNaN(Date.parse(trimmed));

    case "email": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(trimmed);
    }

    case "string":
      return typeof trimmed === "string";

    default:
      return true;
  }
}

/**
 * Runs all validation rules against parsed CSV data.
 * 
 * @param {{ headers: string[], rows: Array<{ rowNumber: number, data: Object, isEmpty: boolean }> }} parsedData
 * @param {Object} options - Validation configuration rules
 * @param {string[]} [options.required] - Columns that must exist and not be blank
 * @param {string[]} [options.unique] - Columns where values must be unique across rows
 * @param {Object.<string, string>} [options.types] - Expected data types per column
 * @param {boolean} [options.allowEmptyRows=false] - Whether blank rows are allowed (default: false)
 * @param {boolean} [options.disallowDuplicateRows=true] - Whether identical rows are disallowed
 * 
 * @returns {Array<{ row: number | null, column: string | null, message: string, rule: string }>}
 */
function validateData(parsedData, options = {}) {
  const errors = [];
  const { headers, rows } = parsedData;

  const requiredColumns = options.required || [];
  const uniqueColumns = options.unique || [];
  const columnTypes = options.types || {};
  const allowEmptyRows = options.allowEmptyRows === true;
  const disallowDuplicateRows = options.disallowDuplicateRows !== false; // true by default

  // 1. Validate that required columns exist in headers
  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      errors.push({
        row: 1,
        column: col,
        rule: "required_column",
        message: `Required column '${col}' is missing in CSV headers.`,
      });
    }
  }

  // Tracking structures for duplicate detection
  const seenUniqueValues = {};
  for (const col of uniqueColumns) {
    seenUniqueValues[col] = new Map(); // value -> firstSeenRowNumber
  }

  const seenRowSignatures = new Map(); // JSON signature -> firstSeenRowNumber

  // 2. Validate row-by-row
  for (const item of rows) {
    const { rowNumber, data, isEmpty } = item;

    // Feature: Empty row detection
    if (isEmpty) {
      if (!allowEmptyRows) {
        errors.push({
          row: rowNumber,
          column: null,
          rule: "empty_row",
          message: `Row ${rowNumber} is empty.`,
        });
      }
      continue; // Skip further cell validations for completely empty row
    }

    // Feature: Duplicate full record detection
    if (disallowDuplicateRows) {
      const rowSignature = JSON.stringify(data);
      if (seenRowSignatures.has(rowSignature)) {
        const originalRow = seenRowSignatures.get(rowSignature);
        errors.push({
          row: rowNumber,
          column: null,
          rule: "duplicate_record",
          message: `Duplicate record found. Row ${rowNumber} is identical to row ${originalRow}.`,
        });
      } else {
        seenRowSignatures.set(rowSignature, rowNumber);
      }
    }

    // Feature: Required values check
    for (const col of requiredColumns) {
      if (headers.includes(col)) {
        const val = data[col];
        if (isBlank(val)) {
          errors.push({
            row: rowNumber,
            column: col,
            rule: "missing_value",
            message: `Missing required value in column '${col}'.`,
          });
        }
      }
    }

    // Feature: Unique column validation
    for (const col of uniqueColumns) {
      if (headers.includes(col)) {
        const val = data[col];
        if (!isBlank(val)) {
          const map = seenUniqueValues[col];
          if (map.has(val)) {
            const originalRow = map.get(val);
            errors.push({
              row: rowNumber,
              column: col,
              rule: "unique_violation",
              message: `Duplicate value '${val}' in column '${col}'. Already exists in row ${originalRow}.`,
            });
          } else {
            map.set(val, rowNumber);
          }
        }
      }
    }

    // Feature: Data type validation
    for (const [col, expectedType] of Object.entries(columnTypes)) {
      if (headers.includes(col)) {
        const val = data[col];
        if (!isBlank(val) && !isValidType(val, expectedType)) {
          errors.push({
            row: rowNumber,
            column: col,
            rule: "invalid_type",
            message: `Invalid ${expectedType} value '${val}' in column '${col}'.`,
          });
        }
      }
    }
  }

  return errors;
}

module.exports = {
  validateData,
  isValidType,
  isBlank,
};
