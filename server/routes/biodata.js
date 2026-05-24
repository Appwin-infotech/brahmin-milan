const { Router } = require('express');
const controller = require('../controllers/biodata');
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');

const router = Router();

router.post(
  '/createPersonalDetails',
  verifyToken,
  upload.fields([
    { name: 'closeUpPhoto', maxCount: 1 },
    { name: 'fullPhoto', maxCount: 1 },
    { name: 'bestPhoto', maxCount: 1 }
  ]),
  controller.createPersonalDetails
);
router.put(
  '/updatePersonalDetails',
  verifyToken,
  upload.fields([
    { name: 'closeUpPhoto', maxCount: 1 },
    { name: 'fullPhoto', maxCount: 1 },
    { name: 'bestPhoto', maxCount: 1 },
  ]),
  controller.updatePersonalDetails
);
router.post('/createPartnerPreferences', verifyToken, controller.createPartnerPreferences);
router.put('/updatePartnerPreferences', verifyToken, controller.updatePartnerPreferences);
router.get('/getBiodata', verifyToken, controller.getBiodata);
router.get('/getBiodataByUserId/:id', verifyToken, controller.getBiodataByUserId);
router.post('/repostBioData', verifyToken, controller.repostBioData);
router.delete('/deleteBioData', verifyToken, controller.deleteBiodataProfile);

module.exports = router;