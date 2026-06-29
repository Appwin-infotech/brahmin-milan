const { Router } = require('express');
const controller = require('../controllers/admin');
const notificationController = require("../controllers/notification");
const commiitteeController = require("../controllers/committee")
const dharmshalaController = require("../controllers/dharmshala")
const subscriptionController = require("../controllers/subscription")
const eventsController = require("../controllers/eventPost");
const activistController = require("../controllers/activist");
const successStoryController = require("../controllers/successStory");
const advertisementController = require("../controllers/advertisement")
const verifyAdminToken = require("../middlewares/authAdmin");
const upload = require('../config/multerConfig');

const router = Router();

router.post("/createSuperAdmin", controller.createFirstAdmin);
router.post("/createAdmin", verifyAdminToken, controller.createAdmin);
router.post("/adminLogin", controller.adminLogin);
router.post("/adminLogout", controller.adminLogout);
router.post("/changeAdminPassword", verifyAdminToken, controller.changeAdminPassword);
//special route for approveOrRejectMultipleRequests
router.post("/approveOrRejectMultipleRequests", verifyAdminToken, controller.approveOrRejectMultipleRequests);
router.put("/panditRequest/:requestId", verifyAdminToken, controller.approveOrRejectPanditRequest);
router.put("/jyotishRequest/:requestId", verifyAdminToken, controller.approveOrRejectJyotishRequest);
router.put("/activistRequest/:requestId", verifyAdminToken, controller.approveOrRejectActivistRequest);
router.put("/kathavachakRequest/:requestId", verifyAdminToken, controller.approveOrRejectKathavachakRequest);
router.post("/reviewSuccessStory/:status/:requestId", verifyAdminToken, controller.reviewSuccessStoryRequest);
router.get("/getAllRequests", verifyAdminToken, controller.getAllRequests);
router.get("/getAllStoryRequests", verifyAdminToken, controller.getAllStoryRequests);
router.get("/getAllUsers", verifyAdminToken, controller.getAllUsers);
router.get("/getAllReports", verifyAdminToken, controller.getAllReports);
router.get("/specialists/:userType/:customId", controller.fetchSpecialist)
router.patch('/specialists/:userType', controller.specialistController);
router.get('/getAllFeedBacks', verifyAdminToken, controller.getAllFeedBacks);
router.get('/getAllMetrionial', verifyAdminToken, controller.getAllMetrimonial);
router.get('/getAllAdvertisement-Request', verifyAdminToken, controller.getAllAdvertisementRequest);
router.patch('/setMetrionial_ActivityStatus', verifyAdminToken, controller.setMetrionial_ActivityStatus);
router.get('/getAllNotification', verifyAdminToken, notificationController.getAllNotification);
router.post("/updateUser/:id/access", verifyAdminToken, controller.updateUserAccess);
router.get('/getBiodata/:bioDataId', verifyAdminToken, controller.getBiodataById);
router.get('/getPlans', verifyAdminToken, subscriptionController.getAllSubscriptionPlans);
router.get("/getAllCommittee", verifyAdminToken, commiitteeController.getAllCommittee);
router.get("/getAllDharmshala", verifyAdminToken, dharmshalaController.getAllDharmshala);
router.delete('/delete-User/:id', verifyAdminToken, controller.delete_UserById);
// Committee creation: photoUrl (single file)
router.post(
  "/create-CommitteeByAdmin",
  verifyAdminToken,
  upload.fields([{ name: "photoUrl", maxCount: 1 }]),
  controller.committeeByAdmin
);

// Committee update: photoUrl (single file)
router.patch(
  "/updateCommiteeByAdmin/:committeeId",
  verifyAdminToken,
  upload.fields([{ name: 'photoUrl', maxCount: 1 }]),
  controller.updateCommitteeByAdmin
);

router.delete("/deleteCommiteeByAdmin/:committeeId", verifyAdminToken, controller.deleteCommiteeByAdmin);
// Dharmshala creation: images (multiple files)
router.post(
  "/create-DharmshalaByAdmin",
  verifyAdminToken,
  controller.dharmshalaByAdmin
);
// Dharmshala update: images (multiple files)
router.patch(
  "/updateDharmshala/:id",
  verifyAdminToken,
  controller.updateDharmshalaById
);
router.get('/getDharmshalaById/:id', verifyAdminToken, controller.getDharmshalaById);
router.get("/subscriptions", verifyAdminToken, controller.getSubscriptions);
router.get("/getAllEvents", verifyAdminToken, eventsController.getAllEventsPost);
router.get("/fetchActivistForAdmin", activistController.fetchActivistForAdmin);
//create-Advertisement
router.post('/createAdvertisement', verifyAdminToken, upload.array("media", 10), advertisementController.createAdvertisement);
//update-Advertisement
router.patch('/updateAdvertisement/:id', verifyAdminToken, upload.array('media', 10), advertisementController.updateAdvertisement);
//getAdvertisement
router.get('/get-advertisement', verifyAdminToken, advertisementController.getAdvertisementsForAdmin);
//delete-defaultAdvertisement
router.delete('/delete-Advertisement/:id', verifyAdminToken, advertisementController.deleteAdvertisement);
//create-default advertisement
router.put('/update-defaultAdvertisement', verifyAdminToken, upload.array("media", 10), advertisementController.updateDefaultAdvertisement);
//get-defaultAdvertisement
router.get('/get-defaultAdvertisement', verifyAdminToken, advertisementController.getDefaultAdvertisement);
//delete-defaultAdvertisement
router.delete('/delete-defaultAdvertisement/:id', verifyAdminToken, advertisementController.deleteDefaultAdvertisement);

router.patch('/updateBiodata/:bioDataId', verifyAdminToken, controller.updateBiodataByAdmin);
router.delete('/deleteBiodata/:bioDataId', verifyAdminToken, controller.deleteBiodataByAdmin);
router.get('/getBiodataAdmin/user/:bioDataId', verifyAdminToken, controller.getBiodataByUserAdmin);
router.get('/getSpecialistAdmin/:userType/:userId', verifyAdminToken, controller.getSpecialistByAdmin);
router.patch('/updateSpecialist/:userType/:userId', verifyAdminToken, controller.updateSpecialistByAdmin);
router.delete('/deleteSpecialist/:userType/:userId', verifyAdminToken, controller.deleteSpecialistByAdmin);
router.delete('/deleteDharmshala/:id', verifyAdminToken, controller.deleteDharmshalaById);
router.get('/get-successStories', verifyAdminToken, successStoryController.getSuccessStories);
router.patch('/editSuccessStory/:id', verifyAdminToken, successStoryController.editSuccessStory);
router.delete('/delete-successStory/:id', verifyAdminToken, successStoryController.deleteSuccessStory);

router.delete("/delete-eventPost/:postId", verifyAdminToken, controller.deleteEventPostById);
router.patch(
  "/updateEventPostByAdmin/:postId",
  verifyAdminToken,
  controller.updateEventPostByAdmin
);

router.get("/getAllNotificationsForAdmin", verifyAdminToken, controller.getAllNotificationsForAdmin);
//Activist 
router.get("/getActivistById/:id", verifyAdminToken, controller.getActivistProfileById);
router.post("/updateActivist/:id", verifyAdminToken, controller.updateActivistAccess);
// Route
router.patch(
  "/updateActivistByAdmin/:id",
  verifyAdminToken,
  controller.updateActivistProfileByAdmin
);

router.delete("/delete-Activist/:id", verifyAdminToken, controller.deleteActivistProfile);
router.patch('/update-advertisementStatus/:id', verifyAdminToken, advertisementController.updateAdvertisementStatus);

//markNotificationAsSeenByAdmin
router.patch("/seeNotification/:notificationId", verifyAdminToken, notificationController.markNotificationAsSeenByAdmin);
//markAllNotification as seen
router.patch("/markSeenAllNotification", verifyAdminToken, notificationController.markNotificationAsSeenByAdmin);
//Respond to user about its given feedback
router.patch("/feedBackReceivedByAdmin/:id", verifyAdminToken, controller.feedBackReceivedByAdmin);

router.put("/updateUser/:userId", verifyAdminToken, controller.editUser);
router.put("/updateAdvertisementByAdmin/:id", upload.array("media"), verifyAdminToken, controller.updateAdvertisementByAdmin);


//Admin OTP
router.post("/requestAdminOTP", controller.requestAdminOTP);
router.post("/resetAdminPassword", controller.verifyAdminOTPAndResetPassword);

//feedback
router.delete("/delete-feedbackByAdmin/:feedbackId", verifyAdminToken, controller.deleteFeedbackByAdmin);

//delete_AdvertiseWithUs request
router.delete("/delete-advertise-request/:advertiseId", verifyAdminToken, controller.deleteAdvertiseRequestByAdmin);


module.exports = router;    