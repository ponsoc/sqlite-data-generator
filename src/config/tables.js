module.exports = function (dependencies) {
  return [
    {
      name: "users",
      fields: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "name", type: "TEXT", generator: () => dependencies.faker.person.fullName() },
        { name: "email", type: "TEXT", generator: () => dependencies.faker.internet.email() },
        { name: "age", type: "INTEGER", generator: () => dependencies.faker.number.int({ min: 18, max: 90 }) },
      ],
      rows: 10,
    },
    {
      name: "posts",
      fields: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "title", type: "TEXT", generator: () => dependencies.faker.lorem.words(3) },
        { name: "content", type: "TEXT", generator: () => dependencies.faker.lorem.paragraph() },
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
  ];
};
