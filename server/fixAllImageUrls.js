require('dotenv').config();
const mongoose = require('mongoose');

const OLD_BASE_URL = 'http://localhost:8000';
const NEW_BASE_URL = 'https://api.brahminmilan.in';

const DRY_RUN = process.env.DRY_RUN === 'true';

const SKIP_COLLECTIONS = ['sessions', 'system.indexes'];

function deepFix(value) {
  if (typeof value === 'string') {
    if (value.startsWith(OLD_BASE_URL)) {
      return { changed: true, value: value.replace(OLD_BASE_URL, NEW_BASE_URL) };
    }
    return { changed: false, value };
  }

  if (Array.isArray(value)) {
    let anyChanged = false;
    const newArr = value.map((item) => {
      const { changed, value: fixedItem } = deepFix(item);
      if (changed) anyChanged = true;
      return fixedItem;
    });
    return { changed: anyChanged, value: newArr };
  }

  if (value && typeof value === 'object' && !(value instanceof mongoose.Types.ObjectId) && !(value instanceof Date)) {
    let anyChanged = false;
    const newObj = {};
    for (const [key, val] of Object.entries(value)) {
      const { changed, value: fixedVal } = deepFix(val);
      if (changed) anyChanged = true;
      newObj[key] = fixedVal;
    }
    return { changed: anyChanged, value: newObj };
  }

  return { changed: false, value };
}

async function fixCollection(db, collectionName) {
  const collection = db.collection(collectionName);
  const cursor = collection.find({});

  let scanned = 0;
  let matched = 0;
  const bulkOps = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    const { changed, value: fixedDoc } = deepFix(doc);

    if (changed) {
      matched++;
      const { _id, ...rest } = fixedDoc;

      if (DRY_RUN) {
        console.log(`  [DRY RUN] would fix _id=${doc._id} in ${collectionName}`);
      } else {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: rest },
          },
        });
      }
    }
  }

  if (!DRY_RUN && bulkOps.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      const chunk = bulkOps.slice(i, i + chunkSize);
      await collection.bulkWrite(chunk);
    }
  }

  console.log(
    `${collectionName}: scanned ${scanned}, ${DRY_RUN ? 'would fix' : 'fixed'} ${matched}`
  );

  return { collectionName, scanned, matched };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log(`Connected to MongoDB${DRY_RUN ? ' — DRY RUN MODE (no writes)' : ''}\n`);

  const db = mongoose.connection.db;
  const allCollections = await db.listCollections().toArray();
  const collectionNames = allCollections
    .map((c) => c.name)
    .filter((name) => !SKIP_COLLECTIONS.includes(name))
    .sort();

  console.log(`Found ${collectionNames.length} collections:`, collectionNames.join(', '), '\n');

  const summary = [];
  for (const name of collectionNames) {
    const result = await fixCollection(db, name);
    summary.push(result);
  }

  console.log('\n=== Summary ===');
  let totalMatched = 0;
  for (const s of summary) {
    if (s.matched > 0) {
      console.log(`${s.collectionName}: ${s.matched} document(s) ${DRY_RUN ? 'would be' : ''} updated`);
      totalMatched += s.matched;
    }
  }
  console.log(`\nTotal documents ${DRY_RUN ? 'that would be' : ''} updated: ${totalMatched}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});