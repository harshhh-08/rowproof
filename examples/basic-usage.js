const path = require("path");
const rowproof = require("../src/index");

async function main() {
  const filePath = path.join(__dirname, "students.csv");

  const report = await rowproof.validate(filePath, {
    required: ["id", "name", "email", "age"],
    unique: ["email"],
    types: {
      id: "integer",
      age: "number",
      email: "email",
    },
  });

  console.log("Validation Result:");
  console.log(`- Is CSV valid? ${report.isValid}`);
  console.log(`- Total rows: ${report.totalRows}`);
  console.log(`- Total errors: ${report.totalErrors}`);

  if (!report.isValid) {
    console.log("\nErrors found:");
    console.table(report.errors);
  }
}

main().catch(console.error);
