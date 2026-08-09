require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Biodata = require('../models/biodata');

const BASE_URL = process.env.BASE_URL;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function buildStoredUrl(filename) {
  return `${BASE_URL}/uploads/${filename}`;
}

function normalizeLocalUrl(value) {
  if (typeof value !== 'string') return value;
  if (/^https?:\/\//i.test(value)) return value;
  const filename = value.replace(/^\/?uploads\//, '');
  return buildStoredUrl(filename);
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

let migratedFromCloudinary = 0;
let normalizedToFullUrl = 0;
let alreadyCorrect = 0;
let failed = 0;

async function migrateField(value, label) {
  const wasArray = Array.isArray(value);
  const items = wasArray ? value : (value ? [value] : []);

  const results = [];
  for (const item of items) {
    if (typeof item !== 'string') {
      results.push(item);
      continue;
    }

    // Case 1: still a live Cloudinary URL — download it locally
    if (item.includes('res.cloudinary.com')) {
      try {
        const ext = path.extname(new URL(item).pathname) || '.jpg';
        const filename = `migrated-biodata-${label}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await downloadImage(item, filepath);

        results.push(buildStoredUrl(filename));
        migratedFromCloudinary++;
        console.log(`✓ downloaded ${label}: ${item} -> ${filename}`);
      } catch (err) {
        console.error(`✗ ${label}: failed on ${item} — ${err.message}`);
        results.push(item); // keep old Cloudinary URL so nothing breaks
        failed++;
      }
      continue;
    }

    // Case 2: already local, but possibly a bare relative path from the old
    const normalizedUrl = normalizeLocalUrl(item);
    if (normalizedUrl !== item) {
      normalizedToFullUrl++;
      console.log(`↻ normalized ${label}: ${item} -> ${normalizedUrl}`);
    } else {
      alreadyCorrect++;
    }
    results.push(normalizedUrl);
  }

  if (wasArray) return results;
  return results[0] || null; 
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URL);

  const biodatas = await Biodata.find({});
  console.log(`Found ${biodatas.length} biodata records`);

  for (const doc of biodatas) {
    const label = doc.bioDataId || doc._id;
    const pd = doc.personalDetails || {};

    const update = {};

    if (pd.closeUpPhoto) {
      update['personalDetails.closeUpPhoto'] = await migrateField(pd.closeUpPhoto, `${label}-closeup`);
    }
    if (pd.fullPhoto) {
      update['personalDetails.fullPhoto'] = await migrateField(pd.fullPhoto, `${label}-full`);
    }
    if (pd.bestPhoto) {
      update['personalDetails.bestPhoto'] = await migrateField(pd.bestPhoto, `${label}-best`);
    }

    if (Object.keys(update).length > 0) {
      await Biodata.updateOne({ _id: doc._id }, { $set: update });
    }
  }

  console.log(
    `\nDone. Downloaded from Cloudinary: ${migratedFromCloudinary}, ` +
    `normalized relative -> full URL: ${normalizedToFullUrl}, ` +
    `already correct: ${alreadyCorrect}, failed: ${failed}`
  );
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});