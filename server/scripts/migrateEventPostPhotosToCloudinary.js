const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const database = require("../config/database");
const { cloudinaryConnect } = require("../config/cloudinary");
const EventPost = require("../models/eventPost"); // adjust path/model name to match yours

database.connect();
cloudinaryConnect();

// Folder where multer originally saved files, relative to project root
// (adjust if event post images were saved to a different folder)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const isAlreadyUploaded = (val) =>
    typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));

async function uploadOneFile(oldPath, folder, contextLabel, failures) {
    if (typeof oldPath !== "string" || oldPath.trim() === "") {
        if (oldPath != null && oldPath !== "") {
            console.warn(`Skipping non-string photo entry for ${JSON.stringify(contextLabel)}:`, oldPath);
            failures.push({ ...contextLabel, reason: "non-string photo entry", value: oldPath });
        }
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
        });
        console.log(`Uploaded ${filename} -> ${result.secure_url}`);
        return result.secure_url;
    } catch (err) {
        console.error(`Failed to upload ${filename} for ${JSON.stringify(contextLabel)}:`, err.message);
        failures.push({ ...contextLabel, reason: err.message, path: localFilePath });
        return oldPath; // keep old value on failure
    }
}

async function migrate() {
    // images is optional here (required: false), so only match records
    // that actually have at least one non-empty entry.
    const query = {
        images: { $exists: true, $nin: [null, "", []] },
    };

    const totalMatching = await EventPost.countDocuments(query);
    console.log(`Found ${totalMatching} event post records with images set (processing via cursor)`);

    const cursor = EventPost.find(query).cursor();

    const failures = [];
    let migratedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    for (let record = await cursor.next(); record != null; record = await cursor.next()) {
        processed++;

        const rawImages = record.images;

        // Normalize to array regardless of stored shape (string vs array)
        let imagesArr;
        if (!rawImages) {
            imagesArr = [];
        } else if (typeof rawImages === "string") {
            imagesArr = [rawImages];
        } else if (Array.isArray(rawImages)) {
            imagesArr = rawImages;
        } else {
            console.warn(`Unexpected images type for eventPost ${record._id}:`, typeof rawImages);
            failures.push({ eventPostId: record._id.toString(), reason: "unexpected images type" });
            continue;
        }

        if (imagesArr.length === 0) {
            skippedCount++;
            continue;
        }

        const newImagesArr = [];
        for (const oldPath of imagesArr) {
            const newUrl = await uploadOneFile(
                oldPath,
                "eventpost_photos",
                { eventPostId: record._id.toString(), title: record.title, field: "images" },
                failures
            );
            newImagesArr.push(newUrl);
        }

        const changed = JSON.stringify(newImagesArr) !== JSON.stringify(imagesArr);

        if (changed) {
            try {
                // updateOne with a top-level field — only touches images,
                // skips full-document validation of unrelated required
                // fields (description, activistId, activistName, etc.)
                await EventPost.updateOne(
                    { _id: record._id },
                    { $set: { images: newImagesArr } }
                );
                migratedCount++;
            } catch (err) {
                console.error(`Failed to save eventPost ${record._id}:`, err.message);
                failures.push({ eventPostId: record._id.toString(), reason: `save failed: ${err.message}` });
            }
        } else {
            skippedCount++;
        }

        if (processed % 25 === 0) {
            console.log(`--- Checkpoint: ${processed}/${totalMatching} processed ---`);
        }
    }

    console.log("\n=== EventPost images migration complete ===");
    console.log(`Total records scanned: ${processed}`);
    console.log(`(Expected total matching query: ${totalMatching})`);
    console.log(`Records updated:       ${migratedCount}`);
    console.log(`Records skipped (no change): ${skippedCount}`);
    console.log(`Failures:               ${failures.length}`);

    if (processed !== totalMatching) {
        console.warn(
            `\n⚠️  WARNING: processed count (${processed}) does not match expected total (${totalMatching}). ` +
            `Re-run the script — already-migrated images will be skipped automatically.`
        );
    }

    if (failures.length) {
        console.log(`\nWriting failure details to eventpost-migration-failures.json`);
        console.table(failures);
        fs.writeFileSync(
            path.join(__dirname, "eventpost-migration-failures.json"),
            JSON.stringify(failures, null, 2)
        );
    }

    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
});