const {Router} = require("express");
const controller = require("../controllers/settings");
const verifyToken = require("../middlewares/auth");

const router = Router();    

router.patch("/hide-contact",verifyToken,controller.hideContact);
router.patch("/hide-OptionalDetails",verifyToken,controller.hideOptinalDetails);
router.patch("/set-Blur",verifyToken,controller.setBlur);
// notification`
router.patch("/set-connReqNotification",verifyToken,controller.setConnReqNotification);
router.patch("/set-eventPostNotification",verifyToken,controller.setEventPostNotification);
router.patch("/set-activityStatus",verifyToken,controller.setActivityStatus);

module.exports = router;