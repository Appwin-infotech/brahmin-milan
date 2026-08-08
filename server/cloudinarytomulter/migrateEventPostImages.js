require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
const EventPost = require('../models/eventPost');

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

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URL);

  const posts = await EventPost.find({ images: { $exists: true, $ne: [] } });
  console.log(`Found ${posts.length} event posts with images`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    const newUrls = [];

    let images = post.images;
    if (!images) {
      images = [];
    } else if (!Array.isArray(images)) {
      images = [images];
    }

    if (images.length === 0) {
      console.log(`- ${post._id}: no images, skipping`);
      continue;
    }

    const label = post.activistId || post._id;

    for (const url of images) {
      if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
        if (typeof url === 'string') newUrls.push(url); // already local, leave as-is
        skipped++;
        continue;
      }

      try {
        const ext = path.extname(new URL(url).pathname) || '.jpg';
        const filename = `migrated-eventpost-${label}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await downloadImage(url, filepath);

        newUrls.push(`${process.env.BASE_URL}/uploads/${filename}`);
        migrated++;
        console.log(`✓ ${post._id}: ${url} -> ${filename}`);
      } catch (err) {
        console.error(`✗ ${post._id}: failed on ${url} — ${err.message}`);
        newUrls.push(url); // keep the old Cloudinary URL so nothing breaks
        failed++;
      }
    }

    // Targeted update only — avoids full-document validation on unrelated fields
    await EventPost.updateOne({ _id: post._id }, { $set: { images: newUrls } });
  }

  console.log(`\nDone. Migrated: ${migrated}, already local: ${skipped}, failed: ${failed}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});