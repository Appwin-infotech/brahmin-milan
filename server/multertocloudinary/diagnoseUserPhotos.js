const dotenv = require("dotenv");
dotenv.config();
const database = require("../config/database");
const User = require("../models/user");

database.connect();

async function diagnose() {
    const totalUsers = await User.countDocuments({});
    console.log(`Total users in DB: ${totalUsers}`);

    const withPhotoUrl = await User.countDocuments({
        photoUrl: { $exists: true, $ne: [] },
    });
    console.log(`Users with non-empty photoUrl array: ${withPhotoUrl}`);

    const withHttpPhoto = await User.countDocuments({
        photoUrl: { $elemMatch: { $regex: "^http" } },
    });
    console.log(`Users with at least one http(s) (already migrated) photo: ${withHttpPhoto}`);

    const withLocalPhoto = await User.countDocuments({
        photoUrl: { $elemMatch: { $not: { $regex: "^http" } } },
    });
    console.log(`Users with at least one NON-http (still local) photo: ${withLocalPhoto}`);

    const noPhotoAtAll = await User.countDocuments({
        $or: [
            { photoUrl: { $exists: false } },
            { photoUrl: { $size: 0 } },
        ],
    });
    console.log(`Users with no photoUrl at all (empty/missing): ${noPhotoAtAll}`);

    process.exit(0);
}

diagnose().catch((err) => {
    console.error("Diagnostic script crashed:", err);
    process.exit(1);
});