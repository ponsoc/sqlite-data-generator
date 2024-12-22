class SQLiteDataGenerator {
  /**
   * Represents a SQLiteLib object.
   * @constructor
   * @param {string} database - The path to the SQLite database file.
   * @param {object} sqlite3 - The SQLite3 module.
   */
  constructor(fs = require("fs"), sqlite3 = require("sqlite3").verbose(), debug = require("debug")("sqlite-data-generator")) {
    this.temp_db_name = "sqlite_data_generator.db"
    this.fs = fs
    this.sqlite3 = sqlite3;
    this.db = new sqlite3.Database(this.temp_db_name);
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


  async enableForeignKeySupport() {
    return await new Promise((resolve, reject) => {
      this.db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          reject(new Error(`Error enabling foreign key support: ${err.message}`));
        } else {
          resolve();
        }
      });
    })
  }


  /**
   * Disconnects from the database.
   * @returns {Promise<void>} A promise that resolves when the disconnection is successful.
   */
  async disconnect() {
    return await new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(new Error(`Error closing the database connection: ${err.message}`));
        } else {
          this.fs.unlinkSync(this.temp_db_name)
          resolve();
        }
      });
    });
  }

  /**
   * Writes the temporary database to the final location
   * @returns {void} 
   */
  async writeToFile(db_name) {
    this.fs.copyFileSync(this.temp_db_name, db_name)
  }


  /**
   * Generates SQLite data for the given tables.
   *
   * @param {Array} tables - The tables to generate data for.
   * @returns {Promise} - A promise that resolves when the data generation is complete.
   */
  async generate(tables) {
    this.debug('Start generating...')
    for (const table of tables) {
      await this.#createTable(table);
      await this.#insertExampleData(table);
    }
  }

  /**
   * Retrieves a random row from a table in the SQLite database.
   *
   * @param {string} tableName - The name of the table.
   * @param {string} [filter=""] - The filter to apply to the query (optional).
   * @returns {Promise<Object|null>} - A promise that resolves with the random row object, or null if no row is found.
   * @throws {Error} - If there is an error retrieving the random row.
   */
  async getRandomRowFromTable(tableName, filter = "") {
    return await this.getRowFromTable(tableName, filter, "RANDOM()");
  }

  /**
   * Retrieves a single row from a table in the SQLite database.
   *
   * @param {string} tableName - The name of the table.
   * @param {string} [filter=""] - The filter condition to apply to the query.
   * @param {string} [order=""] - The order in which to retrieve the rows.
   * @returns {Promise<Object|null>} - A promise that resolves with the retrieved row object, or null if no row is found.
   * @throws {Error} - If there is an error retrieving the row from the table.
   */
  async getRowFromTable(tableName, filter = "", order = "") {
    return await new Promise(async (resolve, reject) => {
      if (await this.#tableExists(tableName)) {
        const query = `SELECT * FROM ${tableName} ${filter ? "WHERE " + filter : ""} ${order ? "ORDER BY " + order : ""}`;
        this.debug(`Executing query: ${query}`);
        this.db.get(query, (err, row) => {
          if (err) {
            reject(new Error(`Error getting row from table ${tableName}: ${err.message}`));
          } else {
            resolve(row || null);
          }
        });
      } else {
        reject(new Error(`Error getting row from table ${tableName}: Table doesn't exists.`));
      }
    });
  }

  // private methods

  /**
   * Creates a table in the SQLite database if it does not already exist.
   * @param {Object} table - The table object containing the name and fields of the table.
   * @returns {Promise} - A promise that resolves when the table is created.
   */
  async #createTable(table) {
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${table.name} (${table.fields
      .map((field) => (field.name ? field.name + " " + field.type : field.type))
      .join(", ")})`;
    return await this.#executeQuery(createTableQuery);
  }

  /**
   * Inserts example data into the specified table.
   * @param {object} table - The table object.
   * @returns {Promise<void>} - A promise that resolves when the example data is inserted.
   */
  async #insertExampleData(table) {
    this.debug(`Generating data for table '${table.name}'`);
    const variables = await this.#resolveVariables(table.vars);
    const fieldsWithName = table.fields.filter((field) => field.name);

    this.debug('table', table);
    this.debug('variables', variables);
    this.debug('fiedsWithName', fieldsWithName);

    if (typeof table.rows === "object") {
      await this.#eachRow(table.rows.sourceTable, table.name, fieldsWithName, variables, table.rows.filter);
    } else {
      await this.#forCount(table.name, fieldsWithName, variables, table.rowVars, table.rows);
    }
  }

  /**
   * Generates and inserts rows of data into a specified table for the given count.
   *
   * @param {string} tableName - The name of the table to insert data into.
   * @param {Array<Object>} fields - An array of field objects containing the name and type of each field.
   * @param {number} count - The number of rows to generate and insert.
   * @returns {Promise<void>} - A promise that resolves when all rows have been inserted.
   */
  async #forCount(tableName, fields, variables, rowVariables, count) {
    for (let i = 0; i < count; i++) {
      variables.row = await this.#resolveVariables(rowVariables);
      let insertQuery = `INSERT INTO ${tableName} (${fields.map((field) => field.name).join(", ")}) VALUES `;
      let rowValues = await this.#mapFieldsToValues(tableName, fields, variables);
      insertQuery += `(${rowValues.join(", ")})`;
      await this.#executeQuery(insertQuery);
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
  async #eachRow(ofTableName, newTableName, fields, variables = {}, filter = "") {
    return await new Promise((resolve, reject) => {
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
              const rowValues = await this.#mapFieldsToValues(newTableName, fields, variables, row);
              insertQuery += `(${rowValues.join(", ")})`;
              await this.#executeQuery(insertQuery);
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
   * Resolves variables by executing functions and storing the results.
   * @private
   * @param {Object} variables - The variables object.
   * @returns {Object} - The object containing the results of executing the functions.
   */
  async #resolveVariables(variables = {}) {
    const functionResults = {};
    // Loop through all keys (function names) in the object
    for (const key of Object.keys(variables)) {
      // Check if the value associated with the key is a function
      if (typeof variables[key] === "function") {
        // Execute the function and store the result
        functionResults[key] = await variables[key]();
      }
    }
    return functionResults;
  }

  /**
   * Executes the given SQL query.
   * @param {string} query - The SQL query to execute.
   * @returns {Promise<void>} - A promise that resolves when the query is executed successfully, or rejects with an error if there was a problem executing the query.
   */
  async #executeQuery(query) {
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
   * Maps fields to their corresponding values based on the provided rowData.
   * @param {Array} fields - The array of fields to map.
   * @param {Array} rowData - The optional array of row data.
   * @returns {Promise<Array>} - A promise that resolves to an array of mapped values.
   */
  async #mapFieldsToValues(tableName, fields, variables, rowData = []) {
    return await Promise.all(
      fields.map(async (field) => {
        if (typeof field.generator === "function") {
          try {
            return `"${await field.generator(variables, rowData)}"`;
          } catch (e) {
            throw new Error(`Error generating data for field ${field.name} in table ${tableName}: ${e?.message || e}`);
          }
        } else {
          return "NULL";
        }
      })
    );
  }

  async #tableExists(tableName) {
    return new Promise((resolve, reject) => {
      const query = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
      this.db.get(query, [tableName], (err, row) => {
        if (err) {
          reject(err);
        } else {
          // If row exists, table exists
          resolve(!!row);
        }
      });
    });
  }
}

module.exports = SQLiteDataGenerator;
