const express = require("express");
const {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  deleteMultipleContactMessages,
} = require("../controllers/contactController.js");
const verifyAdminToken = require("../middlewares/authAdmin.js");

const router = express.Router();

router.post("/createContact", createContactMessage);
router.get("/getAllContact",verifyAdminToken, getAllContactMessages); // for admin panel
router.get("/getContactById/:id",verifyAdminToken ,getContactMessageById);
router.delete("/deleteMultipleContact",verifyAdminToken,deleteMultipleContactMessages);


module.exports = router;
