const { Router } = require('express');
const controller = require('../controllers/biodata');
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');

const router = Router();

const biodataPhotoUpload = upload.fields([
  { name: "closeUpPhoto", maxCount: 3 },
]);

router.post(
  '/createPersonalDetails',
  verifyToken,
  biodataPhotoUpload,
  controller.createPersonalDetails
);

router.put(
  '/updatePersonalDetails',
  verifyToken,
  biodataPhotoUpload,
  controller.updatePersonalDetails
);

router.post('/createPartnerPreferences', verifyToken, controller.createPartnerPreferences);
router.put('/updatePartnerPreferences', verifyToken, controller.updatePartnerPreferences);
router.get('/getBiodata', verifyToken, controller.getBiodata);
router.get('/getBiodataByUserId/:id', verifyToken, controller.getBiodataByUserId);
router.post('/repostBioData', verifyToken, controller.repostBioData);
router.delete('/deleteBioData', verifyToken, controller.deleteBiodataProfile);

module.exports = router;