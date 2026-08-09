const { Router } = require("express");
const controller = require("../controllers/dharmshala");
const verifyToken = require("../middlewares/auth");
const upload = require("../config/multerConfig");

const router = Router();

router.post(
  "/createDharmshala",
  verifyToken,
  upload.array("images", 5),
  controller.createDharmshala
);

router.patch(
  "/updateDharmshala/:dharmshalaId",
  verifyToken,
  upload.array("images", 5),
  controller.updateDharmshala
);

router.get("/viewDharmshala", verifyToken, controller.viewDharmshala);
router.get("/getAllDharmshala", verifyToken, controller.getAllDharmshala);
router.get("/getDharmshalaById/:dharmshalaId", verifyToken, controller.getDharmshalaById);
router.delete("/delete-Dharmshala/:dharmshalaId", verifyToken, controller.deleteDharmshalaProfile);


module.exports = router;