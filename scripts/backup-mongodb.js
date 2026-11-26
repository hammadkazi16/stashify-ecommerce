import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { EJSON } from 'bson';
import fs from 'node:fs';
import path from 'node:path';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'stashify';

if (!uri) {
  throw new Error('MONGODB_URI is not configured.');
}

const client = new MongoClient(uri, {
  appName: 'stashify-backup'
});

try {
  await client.connect();

  const db = client.db(dbName);
  const names = await db.listCollections({}, { nameOnly: true }).toArray();
  const backup = {
    database: dbName,
    createdAt: new Date().toISOString(),
    collections: {}
  };

  for (const { name } of names) {
    backup.collections[name] = await db.collection(name).find({}).toArray();
  }

  const backupDir = path.resolve('backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.join(backupDir, `stashify-${timestamp}.ejson`);

  fs.writeFileSync(output, EJSON.stringify(backup, null, 2), 'utf8');

  console.log('Backup completed successfully.');
  console.log(`Collections: ${names.length}`);
  console.log(`Backup file: ${output}`);
  console.log(
    'Documents:',
    Object.values(backup.collections).reduce(
      (total, documents) => total + documents.length,
      0
    )
  );
} finally {
  await client.close();
}
