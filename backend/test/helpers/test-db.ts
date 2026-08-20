import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect, Model } from 'mongoose';

let mongod: MongoMemoryServer;
let connection: Connection;

export async function connectTestDb(): Promise<Connection> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  connection = await connect(uri);
  return connection;
}

export async function closeTestDb(): Promise<void> {
  if (connection) {
    await connection.dropDatabase();
    await connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
}

export async function clearCollections(): Promise<void> {
  if (!connection) return;
  const collections = connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export function getConnection(): Connection {
  return connection;
}

export function isTestDatabase(uri: string): boolean {
  return uri.includes('test') || uri.includes('memory');
}
