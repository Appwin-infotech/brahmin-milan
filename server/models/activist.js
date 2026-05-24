const mongoose = require("mongoose");

const activistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  fullname: { type: String, required: true },
  subCaste: { type: String, required: true },
  dob: { type: Date, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  mobileNo: { type: String, required: true, unique: true },
  knownActivistId: {
    type: String,
    required: false,
    validate: {
      validator: function (v) {
        // Validate that userId matches the pattern of two letters followed by four digits
        return /^[A-Z]{2}[0-9]{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid activistId! It should be in the format 'XX0001' to 'ZZ9999'.`
    }
  },
  access: {
    type: String,
    enum: ["enable", "disable"],
    default: "enable"
  },
  engagedWithCommittee: { type: String, enum: ["Yes", "No"], required: false },
  profilePhoto: { type: String, required: true },
  activistId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        // Validate that userId matches the pattern of two letters followed by four digits
        return /^[A-Z]{2}[0-9]{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid activistId! It should be in the format 'XX0001' to 'ZZ9999'.`
    }
  },
  profileType: {
    type: String,
    default: "Activist",
    enum: ["Activist"]
  },

}, { timestamps: true });

// Virtual reference to populate the activist details by activistId
activistSchema.virtual('knownActivists', {
  ref: 'Activist',
  localField: 'knownActivistIds.activistId',  // Field in the current model (activistRequestSchema)
  foreignField: 'activistId',  // The field in the 'Activist' model that matches
  justOne: false
});

activistSchema.set('toObject', { virtuals: true });

const Activist = mongoose.model('Activist', activistSchema);

module.exports = Activist;
