const mongoose = require("mongoose");

const activistRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

// Virtual reference to populate the activist details by activistId
activistRequestSchema.virtual('knownActivists', {
  ref: 'Activist',
  localField: 'knownActivistIds.activistId',  // Field in the current model (activistRequestSchema)
  foreignField: 'activistId',  // The field in the 'Activist' model that matches
  justOne: false
});

activistRequestSchema.set('toObject', { virtuals: true });

const ActivistRequest = mongoose.model('ActivistRequest', activistRequestSchema);

module.exports = ActivistRequest;
