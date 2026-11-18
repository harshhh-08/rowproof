# RowProof

> Validate your rows. Trust your data.

RowProof is a lightweight, zero-dependency Node.js library for validating CSV files and catching common data quality defects before they reach your databases or application pipelines.

---

## Highlights

- **Zero dependencies**: Uses Node.js built-ins.
- **RFC 4180 compliant parsing**: Handles quotes, commas within quotes, and escaped quotes.
- **Rule-based validation**:
  - Missing required columns in headers.
  - Blank values in required columns.
  - Duplicate entire records.
  - Duplicate entries in unique columns (e.g. email, roll number).
  - Data type checking (`number`, `integer`, `boolean`, `date`, `email`, `string`).
  - Detection of empty rows.
- **Detailed error reports**: Supplies row number, column name, rule name, and clear messages.
- **JSON report export**: Export findings via `.toJSON()` or `.saveJSON(path)`.

---

## Installation

```bash
npm install rowproof
```

---

## Quick Start

```javascript
const rowproof = require("rowproof");

async function main() {
  const report = await rowproof.validate("./students.csv", {
    required: ["name", "email", "age"],
    unique: ["email"],
    types: {
      age: "number",
      email: "email"
    }
  });

  if (!report.isValid) {
    console.error(`Found ${report.totalErrors} issues in CSV!`);
    console.table(report.errors);
  } else {
    console.log("CSV passed all data quality checks.");
  }
}

main();
```

---

## Configuration Options

Pass an options object to `validate(filePath, options)` or `validateString(csvString, options)`:

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `string[]` | `[]` | Column headers that must exist and must not be blank in any row |
| `unique` | `string[]` | `[]` | Columns whose values must be unique across all rows |
| `types` | `object` | `{}` | Key-value pairs mapping column names to expected types |
| `allowEmptyRows` | `boolean` | `false` | Whether completely empty lines should be ignored or flagged |
| `disallowDuplicateRows` | `boolean` | `true` | Whether identical rows are reported as duplicates |

### Supported Types

- `"number"`: Valid decimal or integer numbers.
- `"integer"`: Whole integer numbers.
- `"boolean"`: `true`, `false`, `1`, `0`, `yes`, `no` (case-insensitive).
- `"date"`: Valid date strings parseable by JavaScript `Date.parse`.
- `"email"`: Standard email address format (`name@domain.ext`).
- `"string"`: Any text string.

---

## Validation Report Schema

Calling `validate()` returns an object with:

```json
{
  "isValid": false,
  "totalRows": 3,
  "totalErrors": 2,
  "headers": ["name", "email", "age"],
  "errors": [
    {
      "row": 3,
      "column": "name",
      "rule": "missing_value",
      "message": "Missing required value in column 'name'."
    },
    {
      "row": 4,
      "column": "email",
      "rule": "unique_violation",
      "message": "Duplicate value 'sam@test.com' in column 'email'. Already exists in row 2."
    }
  ]
}
```

---

## In-Memory Validation

If you already have CSV text loaded into memory or received from an HTTP upload:

```javascript
const { validateString } = require("rowproof");

const csvData = `name,email\nSam,sam@test.com`;
const result = validateString(csvData, { required: ["name", "email"] });
console.log(result.isValid);
```

---

## License

MIT
