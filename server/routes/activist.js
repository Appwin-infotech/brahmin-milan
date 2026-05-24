const { Router } = require("express");
const verifyToken = require("../middlewares/auth");
const controller = require("../controllers/activist")
const upload = require('../config/multerConfig');

const router = Router();

router.post(
  "/createActivist",
  verifyToken,
  upload.fields([{ name: "profilePhoto", maxCount: 1 }]),
  controller.createActivistProfileRequest
);
router.patch(
  "/updateActivist",
  verifyToken,
  upload.fields([{ name: "profilePhoto", maxCount: 1 }]),
  controller.updateActivistProfile
);
router.get("/viewActivist", verifyToken, controller.viewActivist);
router.get("/getAllActivist", verifyToken, controller.getAllActivist);
router.post("/verify-metrimonialProfile/:bioDataId", verifyToken, controller.verifyMetrimonialProfile);

module.exports = router;