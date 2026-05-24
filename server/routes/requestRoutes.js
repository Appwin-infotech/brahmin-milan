const {Router} = require("express");
const ConnectionRequest = require("../models/connectionRequest");
const controller = require("../controllers/connectionRequest");
const verifyToken = require("../middlewares/auth");
// const router = require("./otp");
// const { getConnectedUsers, getIO } = require("../socket/socket.server");


const router = Router();
// sendConnectionRequest api request and use uerAuth for user Authentication
router.post("/send/:status/:userId",verifyToken,controller.sendRequest);

//request Recieved Api
router.get("/request/recieved",verifyToken,controller.recievedConnectionRequests) 

//request sent by loggedInUser
router.get("/request/sent",verifyToken,controller.sentConnectionRequests) 


//accept or reject connection request
router.post("/review/:status/:requestId",verifyToken,controller.responseToRequest)

//remove connection from Connection Request Model
router.delete("/delete/connection/:requestId",verifyToken,controller.deleteConnectionRequest)
module.exports = router;