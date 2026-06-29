const express = require("express");
const cors = require("cors");

const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");

const database = require("./config/database");
const { cloudinaryConnect } = require("./config/cloudinary");

const { initializeSocket } = require("./socket/socket.server")

dotenv.config();
const cookieParser = require("cookie-parser");
require('./config/subscriptionChecker');
const userRoute = require('./routes/user')
const panditRoute = require("./routes/pandit")
const kathavachakRoute = require("./routes/kathavachak")
const jyotishRoute = require("./routes/jyotish")
const requestRouter = require("./routes/requestRoutes");
const biodataRouter = require("./routes/biodata");
const activistRouter = require("./routes/activist");
const reportRouter = require("./routes/report");
const savedRouter = require("./routes/savedProfiles");
const committeeRouter = require("./routes/committe");
const dharmshalaRouter = require("./routes/dharmshala");
const eventPostRouter = require("./routes/eventPost");
const subscriptionRouter = require("./routes/subscription");
const settingsRouter = require("./routes/setting");
const adminRouter = require("./routes/admin");
const deeplinkRoutes = require("./routes/deeplinkRoutes");
const contactRoutes = require("./routes/contactRoutes");
const notificationRouter = require("./routes/notification");
const PORT = process.env.PORT || 5000;
const { createServer } = require("http");

const app = express();
const httpServer = createServer(app);

dotenv.config();

database.connect();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Define allowed origins in an array
const allowedOrigins = [
  process.env.CLIENT_URI, // Live development environment
  process.env.DELETION_URI, // Production environment
  process.env.APPWIN_URI,
  process.env.APPWIN_WWW_URI,
  process.env.CLIENT_LOCAL_URI, // Local development environment
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Check if the incoming origin is in the allowedOrigins list
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error('Not allowed by CORS')); // Reject the request
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'authToken'] // Allowed headers
  })
);

//initializeSocket 
initializeSocket(httpServer);

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

cloudinaryConnect();

// routes
const path = require('path');

// Serve static files from the "uploads" directory
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/v1/user', userRoute);
app.use('/api/v1/biodata', biodataRouter);
app.use('/api/v1/pandit', panditRoute);
app.use('/api/v1/jyotish', jyotishRoute);
app.use('/api/v1/kathavachak', kathavachakRoute);
app.use('/api/v1/connectionRequest', requestRouter);
app.use('/api/v1/activist', activistRouter);
app.use('/api/v1/committee', committeeRouter);
app.use('/api/v1/dharmshala', dharmshalaRouter);
app.use('/api/v1/event', eventPostRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/saved', savedRouter);
app.use('/api/v1/report', reportRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/notification', notificationRouter);
app.use("/api/v1/deeplink", deeplinkRoutes);
app.use("/api/v1/contact", contactRoutes);


app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running...",
  });
});

httpServer.listen(PORT, () => {
  console.log(`App is listening at http://localhost:${PORT}`);
});