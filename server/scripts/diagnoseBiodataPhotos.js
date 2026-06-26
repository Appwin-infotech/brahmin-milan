const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const fs = require("fs");
const database = require("../config/database");
const Biodata = require("../models/biodata"); // adjust path/model name to match yours

database.connect();

const isHttp = (val) =>
    typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));

async function diagnose() {
    const totalRecords = await Biodata.countDocuments({});
    console.log(`Total biodata records in DB: ${totalRecords}`);

    // Use a cursor so we don't rely on a single .find() call that
    // might silently cap results on large collections.
    const cursor = Biodata.find({}).cursor();

    const report = {
        totalScanned: 0,

        closeUpPhoto: {
            missingOrEmpty: 0,
            storedAsString: 0,
            storedAsArray: 0,
            allMigrated: 0,      // every entry is http(s)
            partiallyMigrated: 0, // some http(s), some local
            allLocal: 0,          // none are http(s)
            unexpectedType: 0,
        },

        fullPhoto: {
            missingOrEmpty: 0,
            storedAsString: 0,
            storedAsArray: 0,
            allMigrated: 0,
            partiallyMigrated: 0,
            allLocal: 0,
            unexpectedType: 0,
        },
    };

    const stillLocal = []; // bioDataId + field + raw value, for anything not fully migrated

    const analyzeField = (val, fieldName, bioDataId) => {
        const stats = report[fieldName];

        if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) {
            stats.missingOrEmpty++;
            return;
        }

        let arr;
        if (typeof val === "string") {
            stats.storedAsString++;
            arr = [val];
        } else if (Array.isArray(val)) {
            stats.storedAsArray++;
            arr = val;
        } else {
            stats.unexpectedType++;
            stillLocal.push({ bioDataId, field: fieldName, reason: "unexpected type", value: val });
            return;
        }

        const httpCount = arr.filter(isHttp).length;
        const total = arr.length;

        if (httpCount === total) {
            stats.allMigrated++;
        } else if (httpCount === 0) {
            stats.allLocal++;
            stillLocal.push({ bioDataId, field: fieldName, reason: "all local", value: arr });
        } else {
            stats.partiallyMigrated++;
            stillLocal.push({
                bioDataId,
                field: fieldName,
                reason: "partially migrated",
                value: arr.filter((v) => !isHttp(v)),
            });
        }
    };

    for (let record = await cursor.next(); record != null; record = await cursor.next()) {
        report.totalScanned++;

        const pd = record.personalDetails || {};
        analyzeField(pd.closeUpPhoto, "closeUpPhoto", record.bioDataId);
        analyzeField(pd.fullPhoto, "fullPhoto", record.bioDataId);

        if (report.totalScanned % 100 === 0) {
            console.log(`--- Scanned ${report.totalScanned}/${totalRecords} ---`);
        }
    }

    console.log("\n=== Biodata photo migration status ===");
    console.log(`Total records scanned: ${report.totalScanned} (expected ${totalRecords})\n`);

    console.log("closeUpPhoto:");
    console.table(report.closeUpPhoto);

    console.log("fullPhoto:");
    console.table(report.fullPhoto);

    const needsAttention = stillLocal.length;
    console.log(`\nRecords needing attention (not fully migrated): ${needsAttention}`);

    if (needsAttention) {
        fs.writeFileSync(
            path.join(__dirname, "biodata-not-migrated.json"),
            JSON.stringify(stillLocal, null, 2)
        );
        console.log(`Details written to biodata-not-migrated.json`);
        console.table(stillLocal.slice(0, 20)); // preview first 20 in console
        if (stillLocal.length > 20) {
            console.log(`...and ${stillLocal.length - 20} more — see the JSON file.`);
        }
    } else {
        console.log("All closeUpPhoto and fullPhoto entries are fully migrated to Cloudinary.");
    }

    process.exit(0);
}

diagnose().catch((err) => {
    console.error("Diagnostic script crashed:", err);
    process.exit(1);
});