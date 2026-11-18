const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");
const rowproof = require("../src/index");

const FIXTURES_DIR = path.join(__dirname, "fixtures");

test("RowProof Test Suite", async (t) => {
  await t.test("1. Valid CSV file passes validation", async () => {
    const filePath = path.join(FIXTURES_DIR, "valid_students.csv");
    const result = await rowproof.validate(filePath, {
      required: ["name", "email", "age"],
      unique: ["email"],
      types: {
        age: "number",
        email: "email",
      },
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.totalRows, 3);
    assert.strictEqual(result.totalErrors, 0);
    assert.deepStrictEqual(result.errors, []);
  });

  await t.test("2. Detects missing required column in headers", async () => {
    const csvContent = "name,email\nJohn,john@example.com";
    const result = rowproof.validateString(csvContent, {
      required: ["name", "email", "student_id"],
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.totalErrors, 1);
    assert.strictEqual(result.errors[0].rule, "required_column");
    assert.strictEqual(result.errors[0].column, "student_id");
    assert.strictEqual(result.errors[0].row, 1);
  });

  await t.test("3. Detects missing values in required columns", async () => {
    const filePath = path.join(FIXTURES_DIR, "missing_values.csv");
    const result = await rowproof.validate(filePath, {
      required: ["name", "email", "age"],
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.totalErrors, 2);

    const nameError = result.errors.find((e) => e.row === 3 && e.column === "name");
    assert.ok(nameError);
    assert.strictEqual(nameError.rule, "missing_value");

    const emailError = result.errors.find((e) => e.row === 4 && e.column === "email");
    assert.ok(emailError);
    assert.strictEqual(emailError.rule, "missing_value");
  });

  await t.test("4. Detects identical duplicate records", async () => {
    const filePath = path.join(FIXTURES_DIR, "duplicates.csv");
    const result = await rowproof.validate(filePath);

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.totalErrors, 1);
    assert.strictEqual(result.errors[0].rule, "duplicate_record");
    assert.strictEqual(result.errors[0].row, 4);
  });

  await t.test("5. Detects duplicate values in unique columns", () => {
    const csvContent = `id,email
1,sam@example.com
2,alex@example.com
3,sam@example.com`;

    const result = rowproof.validateString(csvContent, {
      unique: ["email"],
    });

    assert.strictEqual(result.isValid, false);
    const uniqueError = result.errors.find((e) => e.rule === "unique_violation");
    assert.ok(uniqueError);
    assert.strictEqual(uniqueError.row, 4);
    assert.strictEqual(uniqueError.column, "email");
  });

  await t.test("6. Validates data types (number, boolean, date, email)", () => {
    const csvContent = `name,age,active,signupDate,email
Valid User,25,true,2024-01-15,valid@test.com
Invalid User,not_a_number,maybe,not_a_date,not_an_email`;

    const result = rowproof.validateString(csvContent, {
      types: {
        age: "number",
        active: "boolean",
        signupDate: "date",
        email: "email",
      },
    });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.totalErrors, 4);

    const typeErrors = result.errors.filter((e) => e.rule === "invalid_type");
    assert.strictEqual(typeErrors.length, 4);
    assert.ok(typeErrors.some((e) => e.column === "age"));
    assert.ok(typeErrors.some((e) => e.column === "active"));
    assert.ok(typeErrors.some((e) => e.column === "signupDate"));
    assert.ok(typeErrors.some((e) => e.column === "email"));
  });

  await t.test("7. Detects empty rows", () => {
    const csvContent = `name,email,age
Alice,alice@example.com,20
,,
Bob,bob@example.com,22`;

    const result = rowproof.validateString(csvContent);

    assert.strictEqual(result.isValid, false);
    const emptyRowError = result.errors.find((e) => e.rule === "empty_row");
    assert.ok(emptyRowError);
    assert.strictEqual(emptyRowError.row, 3);
  });

  await t.test("8. Handles quoted values and commas inside quotes", () => {
    const csvContent = `name,address,bio
"Doe, John","123 Main St, Apt 4","He said ""Hello world"""`;

    const result = rowproof.validateString(csvContent, {
      required: ["name", "address", "bio"],
    });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.totalRows, 1);
  });

  await t.test("9. Handles empty CSV file gracefully", async () => {
    const filePath = path.join(FIXTURES_DIR, "empty.csv");
    const result = await rowproof.validate(filePath);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.totalRows, 0);
    assert.strictEqual(result.totalErrors, 0);
  });

  await t.test("10. Handles invalid file path gracefully", async () => {
    const result = await rowproof.validate("./does_not_exist.csv");

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.totalErrors, 1);
    assert.strictEqual(result.errors[0].rule, "system_error");
    assert.ok(result.errors[0].message.includes("File not found"));
  });

  await t.test("11. Handles malformed CSV (unclosed quotes)", async () => {
    const filePath = path.join(FIXTURES_DIR, "malformed.csv");
    const result = await rowproof.validate(filePath);

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.totalErrors, 1);
    assert.strictEqual(result.errors[0].rule, "system_error");
    assert.ok(result.errors[0].message.includes("Malformed CSV"));
  });

  await t.test("12. Generates JSON output and file export", async () => {
    const csvContent = `name,email
Alice,alice@example.com`;

    const result = rowproof.validateString(csvContent);
    const jsonStr = result.toJSON();
    const parsed = JSON.parse(jsonStr);

    assert.strictEqual(parsed.isValid, true);
    assert.strictEqual(parsed.totalRows, 1);

    const tempJsonPath = path.join(__dirname, "temp_report.json");
    await result.saveJSON(tempJsonPath);
    assert.ok(fs.existsSync(tempJsonPath));

    fs.unlinkSync(tempJsonPath);
  });
});
