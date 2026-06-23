// const { Router } = require('express');
// const controller = require('../controllers/biodata');
// const verifyToken = require("../middlewares/auth");
// const upload = require('../config/multerConfig');

// const router = Router();

// router.post(
//   '/createPersonalDetails',
//   verifyToken,
//   upload.fields([
//     { name: 'closeUpPhoto', maxCount: 3 }, 
//   ]),
//   controller.createPersonalDetails
// );
// router.put(
//   '/updatePersonalDetails',
//   verifyToken,
//   upload.fields([
//     { name: 'closeUpPhoto', maxCount: 3 },
//   ]),
//   controller.updatePersonalDetails
// );

// router.post('/createPartnerPreferences', verifyToken, controller.createPartnerPreferences);
// router.put('/updatePartnerPreferences', verifyToken, controller.updatePartnerPreferences);
// router.get('/getBiodata', verifyToken, controller.getBiodata);
// router.get('/getBiodataByUserId/:id', verifyToken, controller.getBiodataByUserId);
// router.post('/repostBioData', verifyToken, controller.repostBioData);
// router.delete('/deleteBioData', verifyToken, controller.deleteBiodataProfile);

// module.exports = router;

const { Router } = require('express');
const controller = require('../controllers/biodata');
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');

const router = Router();

// router.post(
//   '/createPersonalDetails',
//   verifyToken,
//   upload.any(),
//   controller.createPersonalDetails
// );
router.post(
  '/createPersonalDetails',
  verifyToken,
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        console.error("MULTER ERROR:", err.code, "| field:", err.field, "| message:", err.message);
        return res.status(400).json({
          status: false,
          message: "Unexpected field",
          debug_code: err.code,
          debug_field: err.field,
        });
      }
      next();
    });
  },
  controller.createPersonalDetails
);

router.put(
  '/updatePersonalDetails',
  verifyToken,
  upload.any(),
  controller.updatePersonalDetails
);

router.post('/createPartnerPreferences', verifyToken, controller.createPartnerPreferences);
router.put('/updatePartnerPreferences', verifyToken, controller.updatePartnerPreferences);
router.get('/getBiodata', verifyToken, controller.getBiodata);
router.get('/getBiodataByUserId/:id', verifyToken, controller.getBiodataByUserId);
router.post('/repostBioData', verifyToken, controller.repostBioData);
router.delete('/deleteBioData', verifyToken, controller.deleteBiodataProfile);

module.exports = router;