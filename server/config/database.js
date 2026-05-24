const mongooose = require("mongoose");
require("dotenv").config();

const { MONGODB_URL } = process.env;

exports.connect = () => {
  mongooose
    .connect(MONGODB_URL, {
      useNewUrlparser: true,
      useUnifiedTopology: true,
    })
    .then(console.log(`Database Connected Successfully`))
    .catch((error) => {
      console.log(`Error Connecting to Database : ${error}`);
      process.exit(1);
    });
};
