const { Router } = require('express');
const controller = require('../controllers/pandit');
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');

const router = Router();

router.post('/createPandit', verifyToken,
  controller.createPanditProfile
);

router.patch("/update-panditProfile", verifyToken,
  controller.updatePanditProfile
);

// router.delete('/deletePandit',verifyToken, controller.Delete_panditAccount);
router.get('/viewPandit', verifyToken, controller.viewPandit);
router.get("/panditProfileData/:id", verifyToken, controller.getPanditProfileById);
router.post("/addReviewRating", verifyToken, controller.addPanditReviewRating);
router.patch("/update-reviewRating", verifyToken, controller.updatePanditReviewRating);
router.get("/getAllPandit", verifyToken, controller.getAllPandit);
router.get("/share-panditProfile/:id", verifyToken, controller.sharePanditProfile);
router.delete("/delete-panditProfile", verifyToken, controller.deletePanditProfile);

module.exports = router;

