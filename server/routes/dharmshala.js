const { Router } = require("express");
const controller = require("../controllers/dharmshala");
const verifyToken = require("../middlewares/auth");

const router = Router();

router.post(
  "/createDharmshala",
  verifyToken,
  controller.createDharmshala
);

router.patch(
  "/updateDharmshala/:dharmshalaId",
  verifyToken,
  controller.updateDharmshala
);

router.get("/viewDharmshala", verifyToken, controller.viewDharmshala);
router.get("/getAllDharmshala", verifyToken, controller.getAllDharmshala);
router.get("/getDharmshalaById/:dharmshalaId", verifyToken, controller.getDharmshalaById);
router.delete("/delete-Dharmshala/:dharmshalaId", verifyToken, controller.deleteDharmshalaProfile);


module.exports = router;