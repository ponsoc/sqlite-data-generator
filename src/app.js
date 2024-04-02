const faker = require("faker");
const SQLLiteDataGenerator = require("./lib/SQLLiteDataGenerator");

// create a new instance of the SQLLiteLib class
const db = new SQLLiteDataGenerator("example.db");
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

module.exports = { SQLLiteDataGenerator };
