const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const database = require("../config/database");
const { cloudinaryConnect } = require("../config/cloudinary");
const Advertisement = require("../models/advertisementSchema"); // adjust path/model name to match yours

database.connect();
cloudinaryConnect();

// Folder where multer originally saved files, relative to project root
// (adjust if ad media was saved to a different folder)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const isAlreadyUploaded = (val) =>
    typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));

async function uploadOneFile(oldPath, mediaType, folder, contextLabel, failures) {
    if (typeof oldPath !== "string" || oldPath.trim() === "") {
        console.warn(`Skipping non-string mediaUrl for ${JSON.stringify(contextLabel)}:`, oldPath);
        failures.push({ ...contextLabel, reason: "non-string mediaUrl", value: oldPath });
        return oldPath;
    }

    if (isAlreadyUploaded(oldPath)) {
        return oldPath; // already migrated (or never local)
    }

    const filename = path.basename(oldPath);
    const localFilePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(localFilePath)) {
        console.warn(`Missing file for ${JSON.stringify(contextLabel)}: ${localFilePath}`);
        failures.push({ ...contextLabel, reason: "file not found", path: localFilePath });
        return oldPath; // keep old value, don't lose data
    }

    try {
        const result = await cloudinary.uploader.upload(localFilePath, {
            folder,
            public_id: path.parse(filename).name,
            // Videos MUST use resource_type "video" — uploading as the
            // default "image" type will fail or silently corrupt the asset.
            resource_type: mediaType === "video" ? "video" : "image",
        });
        console.log(`Uploaded (${mediaType}) ${filename} -> ${result.secure_url}`);
        return result.secure_url;
    } catch (err) {
        console.error(`Failed to upload ${filename} for ${JSON.stringify(contextLabel)}:`, err.message);
        failures.push({ ...contextLabel, reason: err.message, path: localFilePath });
        return oldPath; // keep old value on failure
    }
}

async function migrate() {
    // Match any advertisement that has at least one media item with a
    // non-empty mediaUrl that isn't already an http(s) URL.
    const query = {
        media: {
            $elemMatch: {
                mediaUrl: { $exists: true, $nin: [null, ""] },
            },
        },
    };

    const totalMatching = await Advertisement.countDocuments(query);
    console.log(`Found ${totalMatching} advertisement records with media set (processing via cursor)`);

    const cursor = Advertisement.find(query).cursor();

    const failures = [];
    let migratedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    for (let record = await cursor.next(); record != null; record = await cursor.next()) {
        processed++;

        const mediaArr = Array.isArray(record.media) ? record.media : [];

        if (mediaArr.length === 0) {
            skippedCount++;
            continue;
        }

        let changed = false;
        const updatedMedia = [];

        for (let i = 0; i < mediaArr.length; i++) {
            const item = mediaArr[i];
            const oldUrl = item.mediaUrl;
            const mediaType = item.mediaType; // "image" or "video"

            const newUrl = await uploadOneFile(
                oldUrl,
                mediaType,
                "advertisement_media",
                { advertisementId: record._id.toString(), title: record.title, mediaIndex: i, mediaType },
                failures
            );

            if (newUrl !== oldUrl) changed = true;

            // Preserve the full subdocument shape, only swapping mediaUrl
            updatedMedia.push({
                ...item.toObject(),
                mediaUrl: newUrl,
            });
        }

        if (changed) {
            try {
                // Replace the whole media array via updateOne so we don't
                // trigger full-document validation on unrelated required
                // fields (createdBy, targetProfileTypes, etc.) on legacy docs.
                await Advertisement.updateOne(
                    { _id: record._id },
                    { $set: { media: updatedMedia } }
                );
                migratedCount++;
            } catch (err) {
                console.error(`Failed to save advertisement ${record._id}:`, err.message);
                failures.push({ advertisementId: record._id.toString(), reason: `save failed: ${err.message}` });
            }
        } else {
            skippedCount++;
        }

        if (processed % 25 === 0) {
            console.log(`--- Checkpoint: ${processed}/${totalMatching} processed ---`);
        }
    }

    console.log("\n=== Advertisement media migration complete ===");
    console.log(`Total records scanned: ${processed}`);
    console.log(`(Expected total matching query: ${totalMatching})`);
    console.log(`Records updated:       ${migratedCount}`);
    console.log(`Records skipped (no change): ${skippedCount}`);
    console.log(`Failures:               ${failures.length}`);

    if (processed !== totalMatching) {
        console.warn(
            `\n⚠️  WARNING: processed count (${processed}) does not match expected total (${totalMatching}). ` +
            `Re-run the script — already-migrated media will be skipped automatically.`
        );
    }

    if (failures.length) {
        console.log(`\nWriting failure details to advertisement-migration-failures.json`);
        console.table(failures);
        fs.writeFileSync(
            path.join(__dirname, "advertisement-migration-failures.json"),
            JSON.stringify(failures, null, 2)
        );
    }

    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
});