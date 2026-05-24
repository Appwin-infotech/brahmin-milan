/**
 * activityStatusCron.js
 * Runs every hour — auto-deactivates profiles whose activeEndDate has passed.
 * Place in config/ or utils/ and require it once in index.js.
 *
 * Usage in index.js:
 *   require('./config/activityStatusCron');
 */

const cron = require("node-cron");
const Biodata = require("../models/biodata");

cron.schedule("0 * * * *", async () => {
    try {
        const now = new Date();

        const result = await Biodata.updateMany(
            {
                activityStatus: "Active",
                activeEndDate: { $ne: null, $lte: now },
            },
            {
                $set: {
                    activityStatus: "Inactive",
                    activeStartDate: null,
                    activeEndDate: null,
                },
            }
        );

        if (result.modifiedCount > 0) {
            console.log(
                `[ActivityCron] Auto-deactivated ${result.modifiedCount} expired profile(s) at ${now.toISOString()}`
            );
        }
    } catch (err) {
        console.error("[ActivityCron] Error:", err.message);
    }
});

console.log("[ActivityCron] Scheduler started — checks every hour.");