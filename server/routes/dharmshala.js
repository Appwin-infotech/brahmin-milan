const {Router} = require("express");
const controller = require("../controllers/dharmshala");
const verifyToken = require("../middlewares/auth");
const upload = require('../config/multerConfig');  // Make sure your multer config is imported

const router = Router();

router.post(
  "/createDharmshala",
  verifyToken,
  upload.fields([{ name: "images", maxCount: 4 }]),  // Accept multiple images
  controller.createDharmshala
);
router.patch(
  "/updateDharmshala/:dharmshalaId",
  verifyToken,
  upload.fields([{ name: "images", maxCount: 4 }]),  // Maximum of 4 images
  controller.updateDharmshala
);
router.get("/viewDharmshala",verifyToken,controller.viewDharmshala);
router.get("/getAllDharmshala",verifyToken,controller.getAllDharmshala);
router.get("/getDharmshalaById/:dharmshalaId",verifyToken,controller.getDharmshalaById);
router.delete("/delete-Dharmshala/:dharmshalaId",verifyToken,controller.deleteDharmshalaProfile);


module.exports = router;