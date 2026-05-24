const {Server} = require("socket.io");
require("dotenv").config;
let io;

const connectedUsers =  new Map();
// {userId: socketId}

const initializeSocket = (httpServer) =>{
    io = new Server(httpServer,{
        cors:{
            origin:"*",
            credentials: true,
        }
    })
  
    io.use((socket,next)=>{
        const userId = socket.handshake.auth.userId;
        if(!userId) return next(new Error("Invalid User ID"))

       socket.userId = userId;
       next();
    
    })

    io.on("connection",(socket)=>{
        console.log(`User Connected with Socket id:${socket.id} and ${socket.userId}`);
        connectedUsers.set(socket.userId,socket.id);
      
        socket.on("disconnect",()=>{
            console.log(`User Disconnected with Socket id: ${socket.id}`)
            connectedUsers.delete(socket.userId);
        })
    })
}

const sendNotificationToAdmin = (notificationType,userId, message,photoUrl,newData) => {
    const io = getIO();
    const connectedUser = getConnectedUsers();
    const socketId = connectedUser.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit(notificationType, { message ,photoUrl,newData});
    } else {
      console.log(`User with ID ${userId} is not connected.`);
    }
  };

  const sendNotificationToUsers = (userId, message,notification) => {
    const io = getIO();
    const connectedUser = getConnectedUsers();
    const socketId = connectedUser.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit("user-notification", { message,notification });
    } else {
      console.log(`User with ID ${userId} is not connected.`);
    }
  };

  const sendNotificationToUsersEvents = (userId, message,notification) => {
    const io = getIO();
    const connectedUser = getConnectedUsers();
    const socketId = connectedUser.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit("eventCreation-notification", { message,notification});
    } else {
      console.log(`User with ID ${userId} is not connected.`);
    }
  };


const getIO = () => {
  if(!io){
    throw new Error("Socket.io not initialized!")
  }
  return io;
}

const getConnectedUsers =  ( ) => connectedUsers;

module.exports = {initializeSocket, getIO, getConnectedUsers,sendNotificationToAdmin,sendNotificationToUsers,sendNotificationToUsersEvents};