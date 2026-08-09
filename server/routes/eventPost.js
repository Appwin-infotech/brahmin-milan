const { Router } = require("express");
const verifyToken = require("../middlewares/auth");
const controller = require("../controllers/eventPost");
const upload = require("../config/multerConfig");

const router = Router();

router.post(
  "/createEventPost",
  verifyToken,
  upload.array("images", 5),
  controller.createEventPost
);
router.patch(
  "/updateEventPost",
  verifyToken,
  upload.array("images", 5),
  controller.updateEventPost
);
router.post("/like", verifyToken, controller.likePost);
router.post("/comment", verifyToken, controller.postComments);
router.get("/getAllEventsPost", verifyToken, controller.getAllEventsPost);
router.get("/getEventPostById/:postId", verifyToken, controller.getEventPostById);
router.get("/viewPost", verifyToken, controller.viewEventPost);
router.delete("/delete-eventPost/:postId", verifyToken, controller.deleteEventPost);
router.delete("/:postId/delete-comment/:commentId", verifyToken, controller.deleteCommentFromPost);

module.exports = router;