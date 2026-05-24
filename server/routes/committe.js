const {Router} = require("express");
const controller = require("../controllers/committee");
const verifyToken = require("../middlewares/auth");
const upload = require("../config/multerConfig");

const router = Router();

router.post(
  "/createCommittee",
  verifyToken,
  upload.fields([{ name: "photoUrl", maxCount: 1 }]),
  controller.createCommittee
);

router.patch(
  "/updateCommittee/:committeeId",
  verifyToken,
  upload.fields([{ name: "photoUrl", maxCount: 1 }]), // For updating photo
  controller.updateCommittee
);
router.get("/viewCommittee",verifyToken,controller.viewCommittee);
router.get("/getAllCommittee",verifyToken,controller.getAllCommittee);
router.delete("/delete-Committee/:committeeId",verifyToken,controller.deleteCommitteeProfile);

module.exports = router;