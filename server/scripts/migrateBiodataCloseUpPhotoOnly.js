const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const database = require("../config/database");
const { cloudinaryConnect } = require("../config/cloudinary");
const Biodata = require("../models/biodata"); // adjust path/model name to match yours

database.connect();
cloudinaryConnect();

// Folder where multer originally saved files, relative to project root
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
    // Only closeUpPhoto — schema enforces 1 to 3 photos per record.
    // $nin reliably matches whether stored as a string (legacy) or array (current).
    const query = {
        "personalDetails.closeUpPhoto": {
            $exists: true,
            $nin: [null, "", []],
        },
    };

    const totalMatching = await Biodata.countDocuments(query);
    console.log(`Found ${totalMatching} biodata records with closeUpPhoto set (processing via cursor)`);

    const cursor = Biodata.find(query).cursor();

    const failures = [];
    let migratedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    for (let record = await cursor.next(); record != null; record = await cursor.next()) {
        processed++;

        const pd = record.personalDetails || {};
        const rawCloseUp = pd.closeUpPhoto;

        // Normalize to array regardless of stored shape (string vs array)
        let closeUpArr;
        if (!rawCloseUp) {
            closeUpArr = [];
        } else if (typeof rawCloseUp === "string") {
            closeUpArr = [rawCloseUp];
        } else if (Array.isArray(rawCloseUp)) {
            closeUpArr = rawCloseUp;
        } else {
            console.warn(`Unexpected closeUpPhoto type for bioDataId ${record.bioDataId}:`, typeof rawCloseUp);
            failures.push({ bioDataId: record.bioDataId, reason: "unexpected closeUpPhoto type" });
            continue;
        }

        if (closeUpArr.length === 0) {
            skippedCount++;
            continue;
        }

        const newCloseUpArr = [];
        for (const oldPath of closeUpArr) {
            const newUrl = await uploadOneFile(
                oldPath,
                "biodata_photos",
                { bioDataId: record.bioDataId, field: "closeUpPhoto" },
                failures
            );
            newCloseUpArr.push(newUrl);
        }

        const changed = JSON.stringify(newCloseUpArr) !== JSON.stringify(closeUpArr);

        if (changed) {
            try {
                // updateOne with dotted path — only touches closeUpPhoto,
                // skips full-document validation of unrelated required
                // fields (fullname, subCaste, dob, fatherName, etc.)
                await Biodata.updateOne(
                    { _id: record._id },
                    { $set: { "personalDetails.closeUpPhoto": newCloseUpArr } }
                );
                migratedCount++;
            } catch (err) {
                console.error(`Failed to save bioDataId ${record.bioDataId}:`, err.message);
                failures.push({ bioDataId: record.bioDataId, reason: `save failed: ${err.message}` });
            }
        } else {
            skippedCount++;
        }

        if (processed % 50 === 0) {
            console.log(`--- Checkpoint: ${processed}/${totalMatching} processed ---`);
        }
    }

    console.log("\n=== Biodata closeUpPhoto migration complete ===");
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
        console.log(`\nWriting failure details to biodata-migration-failures.json`);
        console.table(failures);
        fs.writeFileSync(
            path.join(__dirname, "biodata-migration-failures.json"),
            JSON.stringify(failures, null, 2)
        );
    }

    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration script crashed:", err);
    process.exit(1);
});