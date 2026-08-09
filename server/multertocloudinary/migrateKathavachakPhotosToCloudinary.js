const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const database = require("../config/database");
const { cloudinaryConnect } = require("../config/cloudinary");
const Kathavachak = require("../models/kathavachak"); // adjust path/model name to match yours

database.connect();
cloudinaryConnect();

// Folder where multer originally saved files, relative to project root
// (adjust if kathavachak photos were saved to a different folder)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const isAlreadyUploaded = (val) =>
    typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));

async function uploadOneFile(oldPath, folder, contextLabel, failures) {
    if (typeof oldPath !== "string") {
        console.warn(`Skipping non-string photo entry for ${JSON.stringify(contextLabel)}:`, oldPath);
        failures.push({ ...contextLabel, reason: "non-string photo entry", value: oldPath });
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
    const query = {
        $or: [
            { profilePhoto: { $exists: true, $ne: null, $ne: "" } },
            { additionalPhotos: { $exists: true, $ne: [] } },
        ],
    };

    const totalMatching = await Kathavachak.countDocuments(query);
    console.log(`Found ${totalMatching} kathavachak records with photos set (processing via cursor)`);

    const cursor = Kathavachak.find(query).cursor();

    const failures = [];
    let migratedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    for (let record = await cursor.next(); record != null; record = await cursor.next()) {
        processed++;

        let changed = false;

        // --- profilePhoto (single string) ---
        const oldProfilePhoto = record.profilePhoto;
        let newProfilePhoto = oldProfilePhoto;

        if (oldProfilePhoto && typeof oldProfilePhoto === "string" && !isAlreadyUploaded(oldProfilePhoto)) {
            newProfilePhoto = await uploadOneFile(
                oldProfilePhoto,
                "kathavachak_photos",
                { kathavachakId: record.kathavachakId, field: "profilePhoto" },
                failures
            );
            if (newProfilePhoto !== oldProfilePhoto) changed = true;
        }

        // --- additionalPhotos (array of strings) ---
        let oldAdditional = record.additionalPhotos;
        if (!oldAdditional) {
            oldAdditional = [];
        } else if (typeof oldAdditional === "string") {
            oldAdditional = [oldAdditional];
        } else if (!Array.isArray(oldAdditional)) {
            console.warn(`Unexpected additionalPhotos type for kathavachakId ${record.kathavachakId}:`, typeof oldAdditional);
            failures.push({ kathavachakId: record.kathavachakId, reason: "unexpected additionalPhotos type" });
            oldAdditional = [];
        }

        const newAdditional = [];
        for (const oldPath of oldAdditional) {
            const newUrl = await uploadOneFile(
                oldPath,
                "kathavachak_photos",
                { kathavachakId: record.kathavachakId, field: "additionalPhotos" },
                failures
            );
            newAdditional.push(newUrl);
        }

        if (JSON.stringify(newAdditional) !== JSON.stringify(oldAdditional)) {
            changed = true;
        }

        // --- Save only changed fields, bypassing full-document validation ---
        if (changed) {
            try {
                const update = {};
                if (newProfilePhoto !== oldProfilePhoto) update.profilePhoto = newProfilePhoto;
                if (JSON.stringify(newAdditional) !== JSON.stringify(oldAdditional)) {
                    update.additionalPhotos = newAdditional;
                }

                await Kathavachak.updateOne({ _id: record._id }, { $set: update });
                migratedCount++;
            } catch (err) {
                console.error(`Failed to save kathavachakId ${record.kathavachakId}:`, err.message);
                failures.push({ kathavachakId: record.kathavachakId, reason: `save failed: ${err.message}` });
            }
        } else {
            skippedCount++;
        }

        if (processed % 50 === 0) {
            console.log(`--- Checkpoint: ${processed}/${totalMatching} processed ---`);
        }
    }

    console.log("\n=== Kathavachak migration complete ===");
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
        console.log(`\nWriting failure details to kathavachak-migration-failures.json`);
        console.table(failures);
        fs.writeFileSync(
            path.join(__dirname, "kathavachak-migration-failures.json"),
            JSON.stringify(failures, null, 2)
        );
    }

    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
});