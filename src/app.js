const sqlite3 = require("sqlite3").verbose();
const faker = require("faker");

const SQLLiteLib = require("./lib/SQLLiteLib");

// create a new instance of the SQLLiteLib class
const db = new SQLLiteLib("example.db", sqlite3);
// import the TableConfig and pass any dependencies
const tables = require("./config/tables")({ faker, db });

async function main() {
  try {
    await db.connect();
    await db.generate(tables);
  } catch (error) {
    console.error(error);
  } finally {
    await db.disconnect();
  }
}

main()
  .then(() => console.log("Database generated successfully!"))
  .catch((error) => console.error(error));
