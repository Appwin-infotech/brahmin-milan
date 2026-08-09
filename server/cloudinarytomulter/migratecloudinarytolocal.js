require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');

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

  const users = await User.find({ photoUrl: { $exists: true, $ne: [] } });
  console.log(`Found ${users.length} users with a photoUrl set`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const newUrls = [];

    // normalize: photoUrl might be a string (legacy data), null, or an array
    let photoUrls = user.photoUrl;
    if (!photoUrls) {
      photoUrls = [];
    } else if (!Array.isArray(photoUrls)) {
      photoUrls = [photoUrls];
    }

    if (photoUrls.length === 0) {
      console.log(`- ${user.userId}: no photoUrl, skipping`);
      continue;
    }

    for (const url of photoUrls) {
      if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
        if (typeof url === 'string') newUrls.push(url); // already local, leave as-is
        skipped++;
        continue;
      }

      try {
        const ext = path.extname(new URL(url).pathname) || '.jpg';
        const filename = `migrated-${user.userId}-${Date.now()}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await downloadImage(url, filepath);

        newUrls.push(`${process.env.BASE_URL}/uploads/${filename}`);
        migrated++;
        console.log(`✓ ${user.userId}: ${url} -> ${filename}`);
      } catch (err) {
        console.error(`✗ ${user.userId}: failed on ${url} — ${err.message}`);
        newUrls.push(url); // keep the old Cloudinary URL so nothing breaks
        failed++;
      }
    }

    // Update only photoUrl — avoids triggering full-document validation
    // on unrelated fields (some legacy records have empty username/city).
    await User.updateOne({ _id: user._id }, { $set: { photoUrl: newUrls } });
  }

  console.log(`\nDone. Migrated: ${migrated}, already local: ${skipped}, failed: ${failed}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});