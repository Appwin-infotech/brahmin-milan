const {Router}=require('express');
const controller=require('../controllers/jyotish');
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');

const router=Router();

router.post(
  '/createJyotish',
  verifyToken,
  controller.createJyotishProfile
);

router.patch(
  '/update-jyotishProfile',
  verifyToken,
  controller.updateJyotishProfile
);
router.get("/jyotishProfileData/:id",verifyToken,controller.getJyotishProfileById);
router.post("/addReviewRating",verifyToken,controller.addJyotishReviewRating);
router.patch("/update-reviewRating",verifyToken,controller.updateJyotishReviewRating);
router.get("/getAllJyotish",verifyToken,controller.getAllJyotish);
router.get("/viewJyotish",verifyToken,controller.viewJyotish);
router.get("/share-jyotishProfile/:id",verifyToken,controller.shareJyotishProfile); 
router.delete("/delete-jyotishProfile",verifyToken,controller.deleteJyotishProfile);

module.exports=router;

