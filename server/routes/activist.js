const { Router } = require("express");
const verifyToken = require("../middlewares/auth");
const controller = require("../controllers/activist")

const router = Router();

router.post(
  "/createActivist",
  verifyToken,
  controller.createActivistProfileRequest
);
router.patch(
  "/updateActivist",
  verifyToken,
  controller.updateActivistProfile
);
router.get("/viewActivist", verifyToken, controller.viewActivist);
router.get("/getAllActivist", verifyToken, controller.getAllActivist);
router.post("/verify-metrimonialProfile/:bioDataId", verifyToken, controller.verifyMetrimonialProfile);

module.exports = router;