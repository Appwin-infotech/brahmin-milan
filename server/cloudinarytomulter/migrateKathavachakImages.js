require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Kathavachak = require('../models/kathavachak');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url} (status ${res.statusCode})`));
      }
      const fileStream = fs.createWriteStream(filepath);
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(resolve));
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

let migrated = 0;
let skipped = 0;
let failed = 0;

// Handles a field that may be a single string or an array of strings.
// Returns the same shape back (string in -> string out, array in -> array out).
async function migrateField(value, label) {
  const wasArray = Array.isArray(value);
  const urls = wasArray ? value : (value ? [value] : []);

  const results = [];
  for (const url of urls) {
    if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
      if (typeof url === 'string') results.push(url); // already local, leave as-is
      skipped++;
      continue;
    }

    try {
      const ext = path.extname(new URL(url).pathname) || '.jpg';
      const filename = `migrated-kathavachak-${label}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const filepath = path.join(uploadDir, filename);

      await downloadImage(url, filepath);

      results.push(`${process.env.BASE_URL}/uploads/${filename}`);
      migrated++;
      console.log(`✓ ${label}: ${url} -> ${filename}`);
    } catch (err) {
      console.error(`✗ ${label}: failed on ${url} — ${err.message}`);
      results.push(url); 
      failed++;
    }
  }

  if (wasArray) return results;
  return results[0] || null; 
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URL);

  const kathavachaks = await Kathavachak.find({});
  console.log(`Found ${kathavachaks.length} kathavachak records`);

  for (const doc of kathavachaks) {
    const label = doc.kathavachakId || doc._id;
    const update = {};

    if (doc.profilePhoto) {
      update.profilePhoto = await migrateField(doc.profilePhoto, `${label}-profile`);
    }
    if (doc.additionalPhotos) {
      update.additionalPhotos = await migrateField(doc.additionalPhotos, `${label}-additional`);
    }

    if (Object.keys(update).length > 0) {
      // Targeted update only — avoids full-document validation on unrelated fields
      await Kathavachak.updateOne({ _id: doc._id }, { $set: update });
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, already local: ${skipped}, failed: ${failed}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});