const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const database = require("../config/database");
const { cloudinaryConnect } = require("../config/cloudinary");
const User = require("../models/user"); // adjust path/model name to match yours

database.connect();
cloudinaryConnect();

// Folder where multer originally saved files, relative to project root
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function migrate() {
    // Use a cursor instead of .find() materializing into an array.
    // This avoids any hidden default limit and processes ALL matching
    // documents regardless of collection size.
    const cursor = User.find({
        photoUrl: { $exists: true, $ne: [] },
    })
        .lean(false) // keep as full Mongoose docs so .save()/updateOne logic stays consistent
        .cursor();

    const totalMatching = await User.countDocuments({
        photoUrl: { $exists: true, $ne: [] },
    });
    console.log(`Found ${totalMatching} users with photoUrl set (processing via cursor)`);

    const failures = [];
    let migratedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    for (let user = await cursor.next(); user != null; user = await cursor.next()) {
        processed++;

        // Normalize photoUrl to always be an array, regardless of what's actually stored
        let photoUrls = user.photoUrl;

        if (!photoUrls) {
            photoUrls = [];
        } else if (typeof photoUrls === "string") {
            photoUrls = [photoUrls];
        } else if (!Array.isArray(photoUrls)) {
            console.warn(`Unexpected photoUrl type for user ${user.userId}:`, typeof photoUrls, photoUrls);
            failures.push({ userId: user.userId, reason: "unexpected photoUrl type", value: photoUrls });
            continue; // skip this user entirely, don't crash
        }

        if (photoUrls.length === 0) {
            continue; // nothing to migrate for this user
        }

        const updatedUrls = [];
        let anyUploaded = false;

        for (const oldPath of photoUrls) {
            if (typeof oldPath !== "string") {
                console.warn(`Skipping non-string photo entry for user ${user.userId}:`, oldPath);
                failures.push({ userId: user.userId, reason: "non-string photo entry", value: oldPath });
                continue;
            }

            if (oldPath.startsWith("http://") || oldPath.startsWith("https://")) {
                // already migrated (or never local) — keep as is
                updatedUrls.push(oldPath);
                continue;
            }

            const filename = path.basename(oldPath);
            const localFilePath = path.join(UPLOADS_DIR, filename);

            if (!fs.existsSync(localFilePath)) {
                console.warn(`Missing file for user ${user.userId}: ${localFilePath}`);
                failures.push({ userId: user.userId, reason: "file not found", path: localFilePath });
                updatedUrls.push(oldPath); // keep old value, don't lose data
                continue;
            }

            try {
                const result = await cloudinary.uploader.upload(localFilePath, {
                    folder: "user_photos",
                    public_id: path.parse(filename).name,
                });

                updatedUrls.push(result.secure_url);
                anyUploaded = true;
                console.log(`[${processed}/${totalMatching}] Uploaded ${filename} -> ${result.secure_url}`);
            } catch (err) {
                console.error(`Failed to upload ${filename} for user ${user.userId}:`, err.message);
                failures.push({ userId: user.userId, reason: err.message, path: localFilePath });
                updatedUrls.push(oldPath); // keep old value on failure
            }
        }

        const changed = JSON.stringify(updatedUrls) !== JSON.stringify(photoUrls);

        if (changed) {
            try {
                await User.updateOne(
                    { _id: user._id },
                    { $set: { photoUrl: updatedUrls } }
                );
                if (anyUploaded) migratedCount++;
            } catch (err) {
                console.error(`Failed to save user ${user.userId}:`, err.message);
                failures.push({ userId: user.userId, reason: `save failed: ${err.message}` });
            }
        } else {
            skippedCount++;
        }

        // Progress checkpoint every 100 records so long runs are easy to monitor
        if (processed % 100 === 0) {
            console.log(`--- Checkpoint: ${processed}/${totalMatching} processed ---`);
        }
    }

    console.log("\n=== Migration complete ===");
    console.log(`Total users scanned: ${processed}`);
    console.log(`(Expected total matching query: ${totalMatching})`);
    console.log(`Users updated:       ${migratedCount}`);
    console.log(`Users skipped (no change): ${skippedCount}`);
    console.log(`Failures:            ${failures.length}`);

    if (processed !== totalMatching) {
        console.warn(
            `\n⚠️  WARNING: processed count (${processed}) does not match expected total (${totalMatching}). ` +
            `The cursor may have been interrupted. Re-run the script — already-migrated users will be skipped automatically.`
        );
    }

    if (failures.length) {
        console.log(`\nWriting failure details to migration-failures.json`);
        console.table(failures);
        fs.writeFileSync(
            path.join(__dirname, "migration-failures.json"),
            JSON.stringify(failures, null, 2)
        );
    }

    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
});