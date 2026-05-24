const {Router} = require("express");
const verifyToken = require("../middlewares/auth");
const controller = require("../controllers/savedProfiles")

const router = Router();

router.post("/save-profile/:id",verifyToken,controller.saveProfiles);
router.get("/getSavedProfiles",verifyToken,controller.getSavedProfiles);
router.delete("/deleteSavedProfiles/:id",verifyToken,controller.deleteSavedProfiles);



module.exports = router;