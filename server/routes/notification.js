const {Router} = require("express");
const controller = require("../controllers/notification");
const verifyToken = require("../middlewares/auth");

const router = Router();

router.get("/getAllNotification",verifyToken,controller.getAllNotification);
router.patch("/seeNotification/:notificationId",verifyToken,controller.markNotificationAsSeen);
router.post("/sendNoticationToAll",controller.sendNotificationToAll);

module.exports = router;