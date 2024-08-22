# sqlite-data-generator

A CLI for generating SQLite database files with example data

## Configuration

To change the configuration edit the `config/tables.js` file. The configuration is an array of objects, each object represents a table in the database. The object has the following properties:

- `name`: The name of the table
- `vars`: An object with key-value pairs. The value can a value or a function with the signature `() -> value`. The function is evaluated before the table is generated. The variables can be accessed in a generator function using the `variables` parameter.
- `rowVars`: An object with key-value pairs. The value can a value or a function with the signature `() -> value`. The function is evaluated for each row generated. The variables can be accessed through `variables.row` in a generator function using the `variables` parameter.
- `fields`: An array of objects, each object represents a field in the table. The object has the following properties:

  - `name`: The name of the field. Omit for foreign key constraints.
  - `type`: The type of the field, options are the sqlite3 types (INTEGER, TEXT, REAL, BLOB, NULL) followed by an optional constraint (NOT NULL, PRIMARY KEY, UNIQUE, CHECK, DEFAULT, COLLATE). The constraint is optional and can be omitted. The type and constraint are separated by a space. You can combine multiple constraints by separating them with a space. For more information please refer to the SQLite documentation.

    _Examples:_

    - `INTEGER NOT NULL`
    - `TEXT PRIMARY KEY`
    - `REAL NOT NULL`
    - `TEXT UNIQUE NOT NULL`
    - `TEXT DEFAULT 'Hello' CHECK(columnName <> 'World')`
    - `FOREIGN KEY(columnName) REFERENCES tableName(columnName)`. Use this format to create a foreign key constraint. Omit the `name` property when using this format. Add `FOREIGN KEY` constraints to the end of the table definition. Note that the field itself still needs to be added to the table definition. Make sure to order the tables in the configuration so that the referenced table is created first.

  - `generator`: A function with the signature `(variables, row) -> value`. The function is evaluated for each row generated. The variables contains the variables defined in the table configuration. The row contains the row data when generating rows based on the source table.

- `rows`: The number of rows to generate for the table or an object with the following properties:

  - `sourceTable`: The name of the source table to generate rows from. The source table must be defined before the table that uses it.
  - `filter`: A string that can be used to filter the rows of the source table. The filter is a SQL WHERE clause without the WHERE keyword.

For an example configuration see the `config/tables.js` file.

## Usage

To generate a database file run the following command:

```cmd
npm run start
```

Or use it as an NPM package:

```cmd
npm install sqlite-data-generator
```

```javascript
const db = new SQLiteDataGenerator("example.db");

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
```

## API

`constructor(filename: string [, sqlite3: sqlite3 package instance, debug: debug instance])`: Creates a new instance of the SQLiteDataGenerator class. The filename is the name of the database file to generate.

`async connect()`: Connects to the database.

`async enableForeignKeySupport`: Enables foreign keys on the connection.

`async disconnect()`: Disconnects from the database.

`async generate(tables: Array)`: Generates the database file based on the configuration. The tables parameter is an array of objects, each object represents a table in the database. The object has properties as described in the configuration section.

`async getRandomRowFromTable(tableName: string [, filter: string = ""])`: Returns a random row from the table. The filter parameter is a string that can be used to filter the rows of the table. The filter is a SQL WHERE clause without the WHERE keyword.

`async getRowFromTable(tableName: string [, filter: string = "", order: string = ""])`: Returns a row from the table. The filter parameter is a string that can be used to filter the rows of the table. The filter is a SQL WHERE clause without the WHERE keyword. The order parameter is a string that can be used to order the rows of the table. The order is a SQL ORDER BY clause without the ORDER BY keyword.

## Debugging

To enable debugging set the `DEBUG` environment variable to `sqlite-data-generator`

## Roadmap

- Fix foreign key constraints issue
- Extend the example configuration to include more complex examples
- Add the ability to generate multiple rows of data for a single row in the source table

## Known Issues

- Foreign key constraints can be configured however they are not properly set up in the database.
