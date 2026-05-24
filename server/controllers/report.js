const Biodata = require("../models/biodata");
const Jyotish = require("../models/jyotish");
const Kathavachak = require("../models/kathavachak");
const Pandit = require("../models/pandit");
const Report = require("../models/report");

const createReport = async (req, res) => {

    try{

        const {_id: userId} = req?.user;
        const {profileId} = req?.params;
        const {reportReason, additionalDetails} = req?.body;

        if(!reportReason){
            return res.status(400).json({status:false, message: "Report Reason is required!"});
        }
        
    // Helper function to check which model the profile ID belongs to
    const checkProfileById = async (profileId) => {
    let profile = null;
    let profileType = null;

    // Check PanditProfile first
    profile = await Pandit.findById(profileId);
     if(profile) {
       profileType = profile.profileType;
       return { profile, profileType };
    }
    // Check Biodata
    profile = await Biodata.findById(profileId);
      if (profile) {
      profileType = profile.profileType;
      return { profile, profileType };
     }

    // If not found in PanditProfile, check JyotishProfile
    if (!profile) {
      profile = await Jyotish.findById(profileId);
       if (profile) {
       profileType = profile.profileType;
       return { profile, profileType };
      }
     }

    // If not found in JyotishProfile, check KathvachakProfile
    if (!profile) {
       profile = await Kathavachak.findById(profileId);
       if (profile) {
         profileType = profile.profileType;
         return { profile, profileType };
       }
      }
    };

       // Check which model the profile belongs to by the profileId
       const { profile, profileType } = await checkProfileById(profileId);

       // If no profile was found, return an error
       if (!profile) {
         return res.status(400).json({status:false, message: "Profile not found." });
       }
                 
       //check if the report of profile already exists
       const existingReport = await Report.findOne({userId, profileId, profileType });
       if (existingReport) {
         return res.status(400).json({status:false, message1: "Report already submitted for this profile.",message2: "Rest assured we will take action on your report soon. thanks" });
       }

       //if report for profile not exists then create a new report
       const newReport = new Report({ userId, profileId, reportReason, additionalDetails, profileType });
       await newReport.save(); 

       return res.status(200).json({
        status: true , message1: `Report against ${profileType} profile is Registered successfully.`, message2: "Rest assured we will take action on your report soon. thanks", data: newReport })
    }catch(err){
        res.status(500).json({status:false, message: err.message})
    }
};

const deleteReportByAdmin = async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      return res.status(400).json({ status: false, message: "Report ID is required." });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ status: false, message: "Report not found." });
    }

    await Report.findByIdAndDelete(reportId);

    return res.status(200).json({
      status: true,
      message: `Report against ${report.profileType} profile deleted successfully by admin.`,
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = {createReport,deleteReportByAdmin}