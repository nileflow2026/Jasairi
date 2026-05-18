const {
  Client,
  Databases,
  Users,
  Avatars,
  Functions,
  Storage,
  Permission,
  ID,
  Role,
  Query,
} = require("node-appwrite");

const client = new Client()
  // @ts-ignore
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  // @ts-ignore
  .setProject(process.env.APPWRITE_PROJECT_ID)
  // @ts-ignore
  .setKey(process.env.APPWRITE_API_KEY); // secret server key

const databases = new Databases(client);
const users = new Users(client);
const avatars = new Avatars(client);
const functions = new Functions(client);
const storage = new Storage(client);

module.exports = {
  client,
  databases,
  users,
  avatars,
  functions,
  storage,
  Permission,
  ID,
  Role,
  Query,
};
