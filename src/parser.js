const fs = require("fs");
const path = require("path");

/**
 * Reads and parses a CSV file from the given file path.
 * @param {string} filePath - Absolute or relative path to the CSV file.
 * @returns {Promise<{ headers: string[], rows: Array<{ rowNumber: number, data: Object, isEmpty: boolean }>, rawRowCount: number }>}
 */
async function loadCSV(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("File path must be a valid non-empty string.");
  }

  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }

  const fileContent = await fs.promises.readFile(resolvedPath, "utf-8");
  return parseCSV(fileContent);
}

/**
 * Parses raw CSV text into headers and structured row objects.
 * Supports standard CSV rules (RFC 4180):
 * - Quoted fields containing commas
 * - Escaped quotes ("")
 * - Handles Windows (\r\n) and Unix (\n) line endings
 * 
 * @param {string} content - Raw CSV text
 * @returns {{ headers: string[], rows: Array<{ rowNumber: number, data: Object, isEmpty: boolean }>, rawRowCount: number }}
 */
function parseCSV(content) {
  if (typeof content !== "string") {
    throw new Error("CSV content must be a string.");
  }

  // Normalize newlines
  const text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rawRows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped double quote ("")
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // End of field
      currentRow.push(currentField);
      currentField = "";
    } else if (char === "\n" && !insideQuotes) {
      // End of line
      currentRow.push(currentField);
      rawRows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // If file ended while still inside quotes, it's malformed
  if (insideQuotes) {
    throw new Error("Malformed CSV: Unclosed quote detected in file.");
  }

  // Push final field/row if text didn't end with a newline
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rawRows.push(currentRow);
  }

  if (rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      rawRowCount: 0,
    };
  }

  // First row is treated as the headers
  const headerRow = rawRows[0];
  const headers = headerRow.map((h) => h.trim());

  const structuredRows = [];

  // Data rows start from index 1 (line number 2 in human counting)
  for (let i = 1; i < rawRows.length; i++) {
    const rawLine = rawRows[i];
    const rowNumber = i + 1; // 1-indexed (Row 1 was headers)

    // Check if the entire row is empty (all fields empty string or whitespace)
    const isEmpty = rawLine.length === 0 || rawLine.every((val) => val.trim() === "");

    const rowData = {};
    headers.forEach((header, colIndex) => {
      // Match header to column value (or empty string if column missing)
      rowData[header] = rawLine[colIndex] !== undefined ? rawLine[colIndex].trim() : "";
    });

    structuredRows.push({
      rowNumber,
      data: rowData,
      rawValues: rawLine,
      isEmpty,
    });
  }

  return {
    headers,
    rows: structuredRows,
    rawRowCount: rawRows.length,
  };
}

module.exports = {
  loadCSV,
  parseCSV,
};
