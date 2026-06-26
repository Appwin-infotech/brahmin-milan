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
// (adjust if biodata photos were saved to a different folder than user photos)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function migrate() {
    // personalDetails.closeUpPhoto is a nested array field — query accordingly
    const records = await Biodata.find({
        "personalDetails.closeUpPhoto": { $exists: true, $ne: [] },
    });

    console.log(`Found ${records.length} biodata records with closeUpPhoto set`);

    const failures = [];
    let migratedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    for (const record of records) {
        processed++;

        let photoUrls = record.personalDetails?.closeUpPhoto;

        if (!photoUrls) {
            photoUrls = [];
        } else if (typeof photoUrls === "string") {
            photoUrls = [photoUrls];
        } else if (!Array.isArray(photoUrls)) {
            console.warn(
                `Unexpected closeUpPhoto type for bioDataId ${record.bioDataId}:`,
                typeof photoUrls,
                photoUrls
            );
            failures.push({
                bioDataId: record.bioDataId,
                reason: "unexpected closeUpPhoto type",
                value: photoUrls,
            });
            continue;
        }

        if (photoUrls.length === 0) {
            continue; // nothing to migrate for this record
        }

        const updatedUrls = [];
        let anyUploaded = false;

        for (const oldPath of photoUrls) {
            if (typeof oldPath !== "string") {
                console.warn(
                    `Skipping non-string photo entry for bioDataId ${record.bioDataId}:`,
                    oldPath
                );
                failures.push({
                    bioDataId: record.bioDataId,
                    reason: "non-string photo entry",
                    value: oldPath,
                });
                continue;
            }

            // already migrated (or never local) — keep as is
            if (oldPath.startsWith("http://") || oldPath.startsWith("https://")) {
                updatedUrls.push(oldPath);
                continue;
            }

            const filename = path.basename(oldPath);
            const localFilePath = path.join(UPLOADS_DIR, filename);

            if (!fs.existsSync(localFilePath)) {
                console.warn(
                    `Missing file for bioDataId ${record.bioDataId}: ${localFilePath}`
                );
                failures.push({
                    bioDataId: record.bioDataId,
                    reason: "file not found",
                    path: localFilePath,
                });
                updatedUrls.push(oldPath); // keep old value, don't lose data
                continue;
            }

            try {
                const result = await cloudinary.uploader.upload(localFilePath, {
                    folder: "biodata_photos", // separate folder from user_photos
                    public_id: path.parse(filename).name,
                });

                updatedUrls.push(result.secure_url);
                anyUploaded = true;
                console.log(
                    `[${processed}/${records.length}] Uploaded ${filename} -> ${result.secure_url}`
                );
            } catch (err) {
                console.error(
                    `Failed to upload ${filename} for bioDataId ${record.bioDataId}:`,
                    err.message
                );
                failures.push({
                    bioDataId: record.bioDataId,
                    reason: err.message,
                    path: localFilePath,
                });
                updatedUrls.push(oldPath); // keep old value on failure
            }
        }

        const changed = JSON.stringify(updatedUrls) !== JSON.stringify(photoUrls);

        if (changed) {
            try {
                // Use updateOne with a dotted path so we only touch
                // personalDetails.closeUpPhoto and skip full-document
                // validation of unrelated required fields (fullname,
                // subCaste, dob, fatherName, etc. on legacy records).
                await Biodata.updateOne(
                    { _id: record._id },
                    { $set: { "personalDetails.closeUpPhoto": updatedUrls } }
                );
                if (anyUploaded) migratedCount++;
            } catch (err) {
                console.error(`Failed to save bioDataId ${record.bioDataId}:`, err.message);
                failures.push({
                    bioDataId: record.bioDataId,
                    reason: `save failed: ${err.message}`,
                });
            }
        } else {
            skippedCount++;
        }
    }

    console.log("\n=== Biodata migration complete ===");
    console.log(`Total records scanned: ${records.length}`);
    console.log(`Records updated:       ${migratedCount}`);
    console.log(`Records skipped (no change): ${skippedCount}`);
    console.log(`Failures:               ${failures.length}`);

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