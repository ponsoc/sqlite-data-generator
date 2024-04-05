class SQLiteDataGenerator {
  /**
   * Represents a SQLiteLib object.
   * @constructor
   * @param {string} database - The path to the SQLite database file.
   * @param {object} sqlite3 - The SQLite3 module.
   */
  constructor(database, sqlite3 = require("sqlite3").verbose(), debug = require("debug")("sqlite-data-generator")) {
    this.sqlite3 = sqlite3;
    this.db = new sqlite3.Database(database);
    this.debug = debug;
  }

  /**
   * Establishes a connection to the SQLite database.
   * @returns {Promise<void>} A promise that resolves when the connection is established.
   */
  async connect() {
    return await new Promise((resolve) => {
      this.db.serialize(() => {
        resolve();
      });
    });
  }

  /**
   * Disconnects from the database.
   * @returns {Promise<void>} A promise that resolves when the disconnection is successful.
   */
  async disconnect() {
    return await new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          reject(new Error(`Error closing the database connection: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Creates a table in the SQLite database if it does not already exist.
   * @param {Object} table - The table object containing the name and fields of the table.
   * @returns {Promise} - A promise that resolves when the table is created.
   */
  async createTable(table) {
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${table.name} (${table.fields
      .map((field) => (field.name ? field.name + " " + field.type : field.type))
      .join(", ")})`;
    return await this.executeQuery(createTableQuery);
  }

  /**
   * Inserts example data into the specified table.
   * @param {object} table - The table object.
   * @returns {Promise<void>} - A promise that resolves when the example data is inserted.
   */
  async insertExampleData(table) {
    const fieldsWithName = table.fields.filter((field) => field.name);

    if (typeof table.rows === "function") {
      await table.rows(table.name, fieldsWithName);
    } else {
      await this.forCount(table.name, fieldsWithName, table.rows);
    }
  }

  /**
   * Maps fields to their corresponding values based on the provided rowData.
   * @param {Array} fields - The array of fields to map.
   * @param {Array} rowData - The optional array of row data.
   * @returns {Promise<Array>} - A promise that resolves to an array of mapped values.
   */
  async mapFieldsToValues(fields, rowData = []) {
    return await Promise.all(
      fields.map(async (field) => {
        if (typeof field.generator === "function") {
          try {
            return `"${await field.generator(rowData)}"`;
          } catch (e) {
            reject(new Error(`Error generating data for field ${field.name} in table ${table.name}: ${e?.message || e}`));
          }
        } else {
          return "NULL";
        }
      })
    );
  }

  /**
   * Retrieves a random ID from the specified table.
   *
   * @param {string} tableName - The name of the table.
   * @param {string} [filter=""] - The optional filter to apply to the query.
   * @returns {Promise<number|null>} - A promise that resolves with the random ID or null if no ID is found.
   * @throws {Error} - If there is an error retrieving the random ID.
   */
  getRandomIdFromTable(tableName, filter = "") {
    return new Promise((resolve, reject) => {
      const query = `SELECT id FROM ${tableName} ${filter ? "WHERE " + filter : ""} ORDER BY RANDOM() LIMIT 1`;
      this.debug(`Executing query: ${query}`);
      this.db.get(query, (err, row) => {
        if (err) {
          reject(new Error(`Error getting random ID from table ${tableName}: ${err.message}`));
        } else {
          resolve(row ? row.id : null);
        }
      });
    });
  }

  /**
   * Generates and inserts rows of data into a specified table for the given count.
   *
   * @param {string} tableName - The name of the table to insert data into.
   * @param {Array<Object>} fields - An array of field objects containing the name and type of each field.
   * @param {number} count - The number of rows to generate and insert.
   * @returns {Promise<void>} - A promise that resolves when all rows have been inserted.
   */
  async forCount(tableName, fields, count) {
    for (let i = 0; i < count; i++) {
      let insertQuery = `INSERT INTO ${tableName} (${fields.map((field) => field.name).join(", ")}) VALUES `;
      let rowValues = await this.mapFieldsToValues(fields);
      insertQuery += `(${rowValues.join(", ")})`;
      await this.executeQuery(insertQuery);
    }
  }

  /**
   * Executes a query to retrieve rows from a table and generates the same number of rows and inserts them into a new table. This can be used for related tables.
   * @param {string} ofTableName - The name of the table to iterate over.
   * @param {string} newTableName - The name of the table to insert the new rows into.
   * @param {Array} fields - An array of field objects.
   * @param {string} [filter=""] - An optional filter to apply to the query.
   * @returns {Promise} A promise that resolves when all rows have been processed and inserted.
   */
  eachRow(ofTableName, newTableName, fields, filter = "") {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM ${ofTableName} ${filter ? "WHERE " + filter : ""}`;
      this.debug(`Executing query: ${query}`);

      const rowPromises = [];
      this.db.each(
        query,
        (err, row) => {
          if (err) {
            reject(new Error(`Error retrieving rows from table ${tableName}: ${err.message}`));
          } else {
            let insertQuery = `INSERT INTO ${newTableName} (${fields.map((field) => field.name).join(", ")}) VALUES `;
            const rowPromise = new Promise(async (resolve) => {
              this.debug(`Processing row: ${JSON.stringify(row)}`);
              const rowValues = await this.mapFieldsToValues(fields, row);
              insertQuery += `(${rowValues.join(", ")})`;
              await this.executeQuery(insertQuery);
              resolve();
            });
            rowPromises.push(rowPromise);
          }
        },
        (err) => {
          if (err) {
            reject(new Error(`Error retrieving rows from table ${tableName}: ${err.message}`));
          } else {
            Promise.all(rowPromises)
              .then(() => {
                resolve();
              })
              .catch((error) => {
                reject(new Error(`Error resolving rows: ${error.message}`));
              });
          }
        }
      );
    });
  }

  /**
   * Executes the given SQL query.
   * @param {string} query - The SQL query to execute.
   * @returns {Promise<void>} - A promise that resolves when the query is executed successfully, or rejects with an error if there was a problem executing the query.
   */
  async executeQuery(query) {
    return new Promise((resolve, reject) => {
      this.debug(`Executing query: ${query}`);
      this.db.run(query, (err) => {
        if (err) {
          reject(new Error(`Error executing query: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Generates SQLite data for the given tables.
   *
   * @param {Array} tables - The tables to generate data for.
   * @returns {Promise} - A promise that resolves when the data generation is complete.
   */
  async generate(tables) {
    for (const table of tables) {
      await this.createTable(table);
      await this.insertExampleData(table);
    }
  }
}

module.exports = SQLiteDataGenerator;
