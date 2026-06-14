const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); // Make sure to import jwt

const personalDetailsSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  subCaste: { type: String, required: true },
  dob: { type: Date, required: true },
  placeofbirth: { type: String, required: true },
  maritalStatus: { type: String, required: true },
  disabilities: { type: String, required: false },
  heightFeet: { type: String, required: true },
  weight: { type: String, required: false },
  timeOfBirth: { type: String, required: true },
  complexion: { type: String, required: false },
  manglikStatus: { type: String, required: false },
  qualification: { type: String, required: true },
  occupation: { type: String, required: true },
  annualIncome: { type: String, required: true },
  currentCity: { type: String, required: true },
  aboutMe: { type: String, required: false },
  profileCreatedBy: { type: String, required: false },
  fatherName: { type: String, required: true },
  motherName: { type: String, required: false },
  fatherOccupation: { type: String, required: true },
  fatherIncomeAnnually: { type: String, required: true },
  motherOccupation: { type: String, required: false },
  familyType: { type: String, required: true },
  siblings: { type: String, required: true },
  otherFamilyMemberInfo: { type: String, required: false },
  contactNumber1: { type: String, required: true },
  contactNumber2: { type: String, required: false },
  state: { type: String, required: true },
  cityOrVillage: { type: String, required: true },
  knowCooking: { type: String, required: false },
  dietaryHabit: { type: String, required: false },
  smokingHabit: { type: String, required: false },
  tobaccoHabits: { type: String, required: false },
  drinkingHabit: { type: String, required: false },
  hobbies: { type: String, required: false },
  gotraSelf: { type: String, required: false },
  livingStatus: { type: String, required: true },
  partnerExpectations: { type: String, required: false },
  closeUpPhoto: { 
    type: [String], 
    required: true,
    validate: {
      validator: (arr) => arr.length >= 1 && arr.length <= 3,
      message: "closeUpPhoto must have between 1 and 3 photos."
    }
  },
});

const partnerPreferencesSchema = new mongoose.Schema({
  partnerSubCaste: { type: String, required: false },
  partnerMinAge: { type: String, required: false },
  partnerMaxAge: { type: String, required: false },
  partnerMinHeightFeet: { type: String, required: false },
  partnerMaxHeightFeet: { type: String, required: false },
  partnerMaritalStatus: { type: String, required: false },
  partnerIncome: { type: String, required: false },
  partnerOccupation: { type: String, required: false },
  partnerQualification: { type: String, required: false },
  partnerDisabilities: { type: String, required: false },
  partnerManglikStatus: { type: String, required: false },
  partnersLivingStatus: { type: String, required: false },
  partnerState: { type: String, required: false },
  partnerCity: { type: String, required: false },
  partnerBodyStructure: { type: String, required: false },
  partnerComplexion: { type: String, required: false },
  partnerDietaryHabits: { type: String, required: false },
  partnerSmokingHabits: { type: String, required: false },
  partnerDrinkingHabits: { type: String, required: false },
  partnerExpectations: { type: String, required: false },
  partnerFamilyType: { type: String, required: false },
  partnerFamilyFinancialStatus: { type: String, required: false },
  partnerFamilyIncome: { type: String, required: false },
});


const biodataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bioDataId: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        // Validate that userId matches the pattern of two letters followed by four digits
        return /^[A-Z]{2}[0-9]{4}$/.test(v);
      },
      message: props => `${props.value} is not a valid bioDataId! It should be in the format 'XX0001' to 'ZZ9999'.`
    }
  },
  gender: { type: String, enum: ["male", "female"], required: true },
  personalDetails: personalDetailsSchema,
  partnerPreferences: partnerPreferencesSchema,
  //verified by activist
  verified: { type: Boolean, default: false },
  // ref of activist by whom the profile is verified
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the activist's User ID or Activist model
    ref: 'Activist',
    required: false
  },
  //profileType
  profileType: {
    type: String,
    default: "Biodata"
  },
  hideContact: { type: Boolean, default: false },
  isBlur: { type: Boolean, default: false },
  hideOptionalDetails: { type: Boolean, default: false },
  activityStatus: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  // NEW — date range set by admin when manually activating an expired profile
  activeStartDate: { type: Date, default: null },
  activeEndDate: { type: Date, default: null },
  repostStatus: { type: String, enum: ["Yes", "No"], default: "No" },
  lastRepostedAt: { type: Date, default: null },
  //for latest profile sorting algorithm
  latestActivityAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Add JWT Token Method to Biodata Schema
biodataSchema.methods.jwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

const Biodata = mongoose.model('Biodata', biodataSchema);

module.exports = Biodata;
