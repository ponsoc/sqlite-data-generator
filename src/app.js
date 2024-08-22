const { faker } = require("@faker-js/faker");
const SQLiteDataGenerator = require("./lib/SQLiteDataGenerator");

// create a new instance of the SQLiteLib class
const db = new SQLiteDataGenerator("example.db");
// import the TableConfig and pass any dependencies
const tables = require("./config/tables.js")({ faker, db });

async function main() {
  try {
    await db.connect();
    await db.enableForeignKeySupport();
    await db.generate(tables);
  } catch (error) {
    throw error;
  } finally {
    await db.disconnect();
  }
}

main()
  .then(() => console.log("Database generated successfully!"))
  .catch((error) => console.error(error));

module.exports = { SQLiteDataGenerator };
