const { Router } = require('express');
const controller = require('../controllers/user');
const subscriptionController = require("../controllers/subscription");
const successStoryController = require("../controllers/successStory");
const advertisementController = require("../controllers/advertisement");
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');

const router = Router();

router.post("/signUp", controller.SignUp);
router.post('/signIn', controller.SignIn);
router.post('/logout', verifyToken, controller.Logout);
router.get("/view", verifyToken, controller.viewProfile);
router.patch("/edit", verifyToken, controller.updateProfile);
router.get("/connections", verifyToken, controller.connections);
router.get("/feed", verifyToken, controller.feed);
router.get("/getMatchProfiles", verifyToken, controller.getMatchProfiles);
router.get("/profile/:id", verifyToken, controller.matchMatrimonialProfile);
router.put("/updateProfile", verifyToken, controller.updateProfile);
router.put("/updateProfileImage", verifyToken, upload.single('photoUrl'), controller.updateProfileImage);
router.delete("/delete-profileImage", verifyToken, controller.deleteProfileImage);
router.post("/sendOTP", controller.sendOTPtoUser);// before signup api hit
router.post("/sendResetOTP", controller.sendResetOTP);//before forgetPassword api hit
router.get("/share-bioDataProfile/:id", verifyToken, controller.shareBioDataProfile);
router.post("/forgotPassword", controller.forgotPassword);
router.post("/changePassword", verifyToken, controller.changePassword);
router.get('/profiles/:profileType', verifyToken, controller.fetchUserProfile);
router.patch(
  "/update-serviceProfile/:profileType",
  verifyToken,
  controller.updateServiceProfiles
);
router.get('/getMetrimonial-Summary', verifyToken, controller.getMetrimonialSummary);
router.post('/create-feedback', verifyToken, controller.createFeedBack);
router.post('/advertise-WithUs', verifyToken, controller.advertiseWithUs);
router.get('/getPlans/:serviceType', verifyToken, subscriptionController.plansByServiceType);
router.get('/get-successStories', verifyToken, successStoryController.getSuccessStories);
router.post(
  '/create-successStory',
  verifyToken,
  successStoryController.createSuccessStory
);
router.delete('/delete-successStory/:id', verifyToken, successStoryController.deleteSuccessStory);
///getAdvertisement
router.get('/get-advertisement', verifyToken, advertisementController.getAdvertisements);

//sendOTPforUserDeletion
router.post("/sendOTP-forDeletion", controller.sendOTPforUserDeletion);// before signup api hit
//verifyOTP-forDeletion
router.post("/verifyOTP-forDeletion", controller.verifyOTPforUserDeletion);// before signup api hit
//deleteUser
router.delete('/deleteUser', controller.Delete_UserAccount);

router.post("/save-token", verifyToken, controller.saveUserToken); // Save FCM token


module.exports = router;

