const { Router } = require("express");
const verifyToken = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const controller = require("../controllers/activist");

const router = Router();

router.post(
  "/createActivist",
  verifyToken,
  upload.single("profilePhoto"),
  controller.createActivistProfileRequest
);
router.patch(
  "/updateActivist",
  verifyToken,
  upload.single("profilePhoto"),
  controller.updateActivistProfile
);
router.get("/viewActivist", verifyToken, controller.viewActivist);
router.get("/getAllActivist", verifyToken, controller.getAllActivist);
router.post("/verify-metrimonialProfile/:bioDataId", verifyToken, controller.verifyMetrimonialProfile);

module.exports = router;