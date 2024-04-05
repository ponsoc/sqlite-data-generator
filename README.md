# sqlite-data-generator

A CLI for generating SQLite database files with example data

## Configuration

To change the configuration edit the `config/tables.js` file. The configuration is an array of objects, each object represents a table in the database. The object has the following properties:

- `name`: The name of the table
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

- `rows`: The number of rows to generate for the table or a function with the signature `(tableName, fields) -> db.eachRow("sourceTable", tableName, fields)` Where `db` is a instance of the `SQLiteDataGenerator` class. This will generate rows based on the rows of the source table. The source table must be defined before the table that uses it.

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

## Debugging

To enable debugging set the `DEBUG` environment variable to `sqlite-data-generator`

## Roadmap

- Fix foreign key constraints issue
- Extend the example configuration to include more complex examples

## Known Issues

- Foreign key constraints can be configured however they are not properly set up in the database.
