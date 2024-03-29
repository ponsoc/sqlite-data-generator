module.exports = function (dependencies) {
  return [
    {
      name: "users",
      fields: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "name", type: "TEXT", generator: () => dependencies.faker.name.findName() },
        { name: "email", type: "TEXT", generator: () => dependencies.faker.internet.email() },
        { name: "age", type: "INTEGER", generator: () => dependencies.faker.datatype.number({ min: 18, max: 90 }) },
      ],
      numRows: 10,
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
          generator: async () => await dependencies.db.getRandomIdFromTable("users"),
        },
        {
          type: "FOREIGN KEY(author_id) REFERENCES users(id)",
        },
      ],
      numRows: 20,
    },
  ];
};
