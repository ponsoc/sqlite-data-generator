class SQLLite {
  constructor(database, sqlite3) {
    this.sqlite3 = sqlite3;
    this.db = new sqlite3.Database(database);
  }

  connect() {
    return new Promise((resolve) => {
      this.db.serialize(() => {
        resolve();
      });
    });
  }

  disconnect() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          reject(`Error closing the database connection: ${err.message}`);
        } else {
          resolve();
        }
      });
    });
  }

  createTable(table) {
    return new Promise((resolve, reject) => {
      const createTableQuery = `CREATE TABLE IF NOT EXISTS ${table.name} (${table.fields
        .map((field) => (field.name ? field.name + " " + field.type : field.type))
        .join(", ")})`;
      this.db.run(createTableQuery, (err) => {
        if (err) {
          reject(`Error creating table ${table.name}: ${err.message}`);
        } else {
          resolve();
        }
      });
    });
  }

  insertExampleData(table) {
    return new Promise(async (resolve, reject) => {
      const fieldsWithName = table.fields.filter((field) => field.name);
      let insertQuery = `INSERT INTO ${table.name} (${fieldsWithName.map((field) => field.name).join(", ")}) VALUES `;
      for (let i = 0; i < table.numRows; i++) {
        let rowValues = fieldsWithName.map(async (field) => {
          if (typeof field.generator === "function") {
            try {
              return `"${await field.generator()}"`;
            } catch (e) {
              reject(`Error generating data for field ${field.name} in table ${table.name}: ${e.message}`);
            }
          } else {
            return "NULL";
          }
        });
        rowValues = await Promise.all(rowValues);
        insertQuery += `(${rowValues.join(", ")}), `;
      }
      insertQuery = insertQuery.slice(0, -2); // Remove the last comma and space

      this.db.run(insertQuery, (err) => {
        if (err) {
          reject(`Error inserting data into table ${table.name}: ${err.message}`);
        } else {
          resolve();
        }
      });
    });
  }

  getRandomIdFromTable(tableName) {
    return new Promise((resolve, reject) => {
      const query = `SELECT id FROM ${tableName} ORDER BY RANDOM() LIMIT 1`;
      this.db.get(query, (err, row) => {
        if (err) {
          reject(`Error getting random ID from table ${tableName}: ${err.message}`);
        } else {
          resolve(row ? row.id : null);
        }
      });
    });
  }

  async generate(tables) {
    for (const table of tables) {
      await this.createTable(table);
      await this.insertExampleData(table);
    }
  }
}

module.exports = SQLLite;
