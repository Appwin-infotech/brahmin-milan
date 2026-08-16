const { Router } = require('express');
const controller = require('../controllers/kathavachak');
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');

const router = Router();

const kathavachakPhotoUpload = upload.fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "additionalPhotos", maxCount: 5 },
]);

// Create Kathavachak Profile
router.post(
  '/createKathavachak',
  verifyToken,
  kathavachakPhotoUpload,
  controller.createKathavachakProfile
);

// Update Kathavachak Profile
router.patch(
  '/update-kathavachakProfile',
  verifyToken,
  kathavachakPhotoUpload,
  controller.updateKathavachakProfile
);

router.get("/kathavachakProfileData/:id", verifyToken, controller.getKathavachakProfileById);
router.post("/addReviewRating", verifyToken, controller.addKathavachakReviewRating);
router.patch("/update-reviewRating", verifyToken, controller.updateKathavachakReviewRating);
router.get("/getAllKathavachak", verifyToken, controller.getAllKathavachak);
router.get("/viewKathavachak", verifyToken, controller.viewKathavachak);
router.get("/share-kathavachakProfile/:id", verifyToken, controller.shareKathavachakProfile);
router.delete("/delete-kathavachakProfile", verifyToken, controller.deleteKathavachakProfile);

module.exports = router;