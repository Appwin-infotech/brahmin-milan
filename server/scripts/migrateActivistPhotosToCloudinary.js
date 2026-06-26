const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const database = require("../config/database");
const { cloudinaryConnect } = require("../config/cloudinary");
const Activist = require("../models/activist"); // adjust path/model name to match yours

database.connect();
cloudinaryConnect();

// Folder where multer originally saved files, relative to project root
// (adjust if activist photos were saved to a different folder)
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
    // profilePhoto is a single required string field
    const query = {
        profilePhoto: { $exists: true, $nin: [null, ""] },
    };

    const totalMatching = await Activist.countDocuments(query);
    console.log(`Found ${totalMatching} activist records with profilePhoto set (processing via cursor)`);

    const cursor = Activist.find(query).cursor();

    const failures = [];
    let migratedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    for (let record = await cursor.next(); record != null; record = await cursor.next()) {
        processed++;

        const oldPhoto = record.profilePhoto;

        if (!oldPhoto || typeof oldPhoto !== "string") {
            skippedCount++;
            continue;
        }

        if (isAlreadyUploaded(oldPhoto)) {
            skippedCount++;
            continue;
        }

        const newPhoto = await uploadOneFile(
            oldPhoto,
            "activist_photos",
            { activistId: record.activistId, fullname: record.fullname, field: "profilePhoto" },
            failures
        );

        if (newPhoto !== oldPhoto) {
            try {
                // updateOne with a top-level field — only touches
                // profilePhoto, skips full-document validation of
                // unrelated required fields (fullname, subCaste, dob, etc.)
                await Activist.updateOne(
                    { _id: record._id },
                    { $set: { profilePhoto: newPhoto } }
                );
                migratedCount++;
            } catch (err) {
                console.error(`Failed to save activist ${record.activistId}:`, err.message);
                failures.push({ activistId: record.activistId, reason: `save failed: ${err.message}` });
            }
        } else {
            skippedCount++;
        }

        if (processed % 25 === 0) {
            console.log(`--- Checkpoint: ${processed}/${totalMatching} processed ---`);
        }
    }

    console.log("\n=== Activist profilePhoto migration complete ===");
    console.log(`Total records scanned: ${processed}`);
    console.log(`(Expected total matching query: ${totalMatching})`);
    console.log(`Records updated:       ${migratedCount}`);
    console.log(`Records skipped (no change): ${skippedCount}`);
    console.log(`Failures:               ${failures.length}`);

    if (processed !== totalMatching) {
        console.warn(
            `\n⚠️  WARNING: processed count (${processed}) does not match expected total (${totalMatching}). ` +
            `Re-run the script — already-migrated photos will be skipped automatically.`
        );
    }

    if (failures.length) {
        console.log(`\nWriting failure details to activist-migration-failures.json`);
        console.table(failures);
        fs.writeFileSync(
            path.join(__dirname, "activist-migration-failures.json"),
            JSON.stringify(failures, null, 2)
        );
    }

    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
});