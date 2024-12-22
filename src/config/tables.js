module.exports = function (dependencies) {
  return [
    {
      name: "users",
      rowVars: {
        name: () => dependencies.faker.person.fullName(),
      },
      fields: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "name", type: "TEXT", generator: (variables) => variables.row.name },
        { name: "email", type: "TEXT", generator: (variables) => variables.row.name.replaceAll(/\s/g, "").toLowerCase() + "@example.com" },
        { name: "age", type: "INTEGER", generator: () => dependencies.faker.number.int({ min: 18, max: 90 }) },
      ],
      rows: 8,
    },
    {
      name: "posts",
      rowVars: {
        state: () => dependencies.faker.helpers.arrayElement(["draf", "review","published"]),
      },
      fields: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "title", type: "TEXT", generator: () => dependencies.faker.lorem.words(3) },
        { name: "content", type: "TEXT", generator: () => dependencies.faker.lorem.paragraph() },
        { name: "created_at", type: "TEXT", generator: () => dependencies.faker.date.past().toISOString() },
        {name: "published_at", type: "TEXT", generator: (variables) => {
          if (variables.row.state === "published") {
            return dependencies.faker.date.past().toISOString()
          }
          return ""
        },
      },
        {
          name: "author_id",
          type: "INTEGER",
          generator: async () => {
            const row = await dependencies.db.getRandomRowFromTable("users")
            return row.id;
          }
        },
        {
          type: "FOREIGN KEY(author_id) REFERENCES users(id)",
        },
      ],
      rows: 20,
    },
    {
      name: "post_versions",
      rowVars: {
        object_id: async () => {
          const row = await dependencies.db.getRandomRowFromTable("posts");
          return row.id;
        },
      },
      fields: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        {
          name: "object_id",
          type: "INTEGER",
          generator: async (variables) => variables.row.object_id,
        },
        {
          name: "version",
          type: "INTEGER",
          generator: async (variables) => {
            const row = await dependencies.db.getRowFromTable("post_versions", `object_id = ${variables.row.object_id}`, `version DESC`);
            return row ? row.version + 1 : 1;
          },
        },
        {
          name: "created_at",
          type: "TEXT",
          generator: async (variables) => {
            const versionRow = await dependencies.db.getRowFromTable(
              "post_versions",
              `object_id = ${variables.row.object_id}`,
              `version DESC`
            );
            if (versionRow) {
              return dependencies.faker.date.between({ from: versionRow.created_at, to: new Date() }).toISOString();
            }
            const objectRow = await dependencies.db.getRowFromTable("posts", `id = ${variables.row.object_id}`);
            return objectRow.created_at;
          },
        },
        {
          type: "FOREIGN KEY(object_id) REFERENCES posts(id)",
        },
      ],
      rows: 35,
    },
  ];
};
