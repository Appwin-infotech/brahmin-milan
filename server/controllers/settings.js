const Biodata = require("../models/biodata");
const User = require("../models/user");
const { sentConnectionRequests } = require("./connectionRequest");

//hideContact from the biodata personalDetails
const hideContact = async (req,res) => {
    try{
        const {_id:userId} = req.user;

         //check for metrimonial profile exists
         const metrimonialProfile = await Biodata.findOne({userId:userId});

         if(!metrimonialProfile){
             return res.status(400).json({status:false, message: "Metrimonial Profile Not Found!"})
           }

          // Update the profile field
          if(metrimonialProfile.hideContact === false){
              metrimonialProfile["hideContact"] = true; 
              // Save the updated user
              await metrimonialProfile.save();
             return res.status(200).json({status: true, message: `Metrimonial Profile Contact details are ${metrimonialProfile.hideContact ? "Hide" : "UnHide" }.`});    
            }
          if(metrimonialProfile.hideContact === true){
               metrimonialProfile["hideContact"] = false;
               // Save the updated user
                 await metrimonialProfile.save();
                 return res.status(200).json({status:true, message: `Metrimonial Profile Contact details are ${metrimonialProfile.hideContact ? "Hide" : "UnHide" }.`});    
            }
         //res error if something went wronh  
         return res.status(200).json({
            status: true ,message: 'Something went wrong While doing hideContact.'});

    }catch(err){
        res.status(500).json({status:false,message: "Error While Hiding Contact: " + err.message})
    }
};

//setIsBlur from the biodata personalDetails
const setBlur = async (req,res) => {
    try{
        const {_id:userId} = req.user;

         //check for metrimonial profile exists
         const metrimonialProfile = await Biodata.findOne({userId:userId});

         if(!metrimonialProfile){
             return res.status(400).json({status:false, message: "Metrimonial Profile Not Found!"})
           }

          // Update the profile field
          if(metrimonialProfile.isBlur === false){
              metrimonialProfile["isBlur"] = true; 
              // Save the updated user
              await metrimonialProfile.save();
             return res.status(200).json({status: true, message: `Metrimonial Profile Images are now set to be ${metrimonialProfile.isBlur ? "Blur" : "Un-blur" }.`});    
            }
          if(metrimonialProfile.isBlur === true){
               metrimonialProfile["isBlur"] = false;
               // Save the updated user
                 await metrimonialProfile.save();
                 return res.status(200).json({status:true, message: `Metrimonial Profile Images are now set to be ${metrimonialProfile.isBlur ? "Blur" : "Un-blur" }.`});    
            }
         //res error if something went wronh  
         return res.status(200).json({
            status: true ,message: 'Something went wrong While setting isBlur.'});

    }catch(err){
        res.status(500).json({status:false,message: "Error While Bluring Images " + err.message})
    }
};


//hideOptionalDetails
const hideOptinalDetails = async (req,res) => {
    try{
        const {_id:userId} = req.user;

         //check for metrimonial profile exists
         const metrimonialProfile = await Biodata.findOne({userId:userId});

         if(!metrimonialProfile){
             return res.status(400).json({status:false, message: "Metrimonial Profile Not Found!"})
           }

          // Update the profile field
          if(metrimonialProfile.hideOptionalDetails === false){
              metrimonialProfile["hideOptionalDetails"] = true; 
              // Save the updated user
              await metrimonialProfile.save();
             return res.status(200).json({status:true, message: `Metrimonial Profile optional details are ${metrimonialProfile.hideOptionalDetails ? "Hide" : "UnHide" }.`});    
            }
          if(metrimonialProfile.hideOptionalDetails === true){
               metrimonialProfile["hideOptionalDetails"] = false;
               // Save the updated user
                 await metrimonialProfile.save();
                 return res.status(200).json({status:true, message: `Metrimonial Profile Optional details are ${metrimonialProfile.hideOptionalDetails ? "Hide" : "UnHide" }.`});    
            }
              
        //res error if something went wronh  
        return res.status(200).json({
            status: true ,message: 'Something went wrong While doing hideOptional Details.'});
            
    }catch(err){
        res.status(500).json({status:false, message: "Error While Hiding Optional details: " + err.message})
    }
};

//inactivate or activate bioData Profiles
const setActivityStatus = async (req,res) => {
    try{
        const {_id:userId} = req.user;

         //check for metrimonial profile exists
         const metrimonialProfile = await Biodata.findOne({userId:userId});

         if(!metrimonialProfile){
             return res.status(400).json({status:false, message: "Metrimonial Profile Not Found!"})
           }
           
          // Update the profile field
          if(metrimonialProfile?.activityStatus === "Inactive"){
              metrimonialProfile["activityStatus"] = "Active"; 
              // Save the updated user
              await metrimonialProfile.save();
             return res.status(200).json({status:true, message: `Metrimonial Profile is ${metrimonialProfile.activityStatus === "Active" ? "Activated" : "InActivated" }.`});    
            }
          if(metrimonialProfile?.activityStatus === "Active"){
             metrimonialProfile["activityStatus"] = "Inactive"; 
            // Save the updated user
            await metrimonialProfile.save();
           return res.status(200).json({status:true, message: `Metrimonial Profile is ${metrimonialProfile.activityStatus === "Inactive" ? "InActivated" : "Activated" }.`});    
          }

            //res error if something went wronh  
            return res.status(200).json({
                status: true ,message: 'Something went wrong While setting activityStatus.'});
    }catch(err){
        res.status(500).json({status:false,message: "Error While Setting ActivityStatus: " + err.message})
    }
};  


//setConnReqNotification if user want to turnOff notification they can do by setting connReqNotification : false or if they want to get they can turnOn by setting connReqNotification: true
const setConnReqNotification = async (req,res) => {
    try{
        const {_id:userId} = req.user;

         //check for user profile exists
         const userProfile = await User.findById(userId);

         if(!userProfile){
             return res.status(400).json({status:false,message: "User Profile Not Found!"})
           }

          // Update the profile field
          if(userProfile.connReqNotification === false){
              userProfile["connReqNotification"] = true; 
              // Save the updated user
              await userProfile.save();
             return res.status(200).json({status: true, message: `User Profile Connction Request Notifications are ${userProfile.connReqNotification ? "Turn-On" : "Turn-Off" }.`});    
            }
          if(userProfile.connReqNotification === true){
               userProfile["connReqNotification"] = false;
               // Save the updated user
                 await userProfile.save();
                 return res.status(200).json({status:true, message: `User Profile Connction Request Notifications are ${userProfile.connReqNotification ? "Turn-On" : "Turn-Off" }.`});    
            }
         //res error if something went wrong
         return res.status(200).json({
            status: true ,message: 'Something went wrong While Setting Connection Request Notifications.'});

    }catch(err){
        res.status(500).json({status:false,message: "Error While Setting Connection Request Notifications: " + err.message})
    }
};

//setEventPostNotification if user want to turnOff notification they can do by setting eventPostNotification : false or if they want to get they can turnOn by setting eventPostNotification: true
const setEventPostNotification = async (req,res) => {
    try{
        const {_id:userId} = req.user;

         //check for user profile exists
         const userProfile = await User.findById(userId);

         if(!userProfile){
             return res.status(400).json({status:false, message: "User Profile Not Found!"})
           }

          // Update the profile field
          if(userProfile.eventPostNotification === false){
              userProfile["eventPostNotification"] = true; 
              // Save the updated user
              await userProfile.save();
             return res.status(200).json({status: true, message: `User Profile EventPost Notifications are ${userProfile.eventPostNotification ? "Turn-On" : "Turn-Off" }.`});    
            }
          if(userProfile.eventPostNotification === true){
               userProfile["eventPostNotification"] = false;
               // Save the updated user
                 await userProfile.save();
                 return res.status(200).json({status: true, message: `User Profile EventPost Notifications are ${userProfile.eventPostNotification ? "Turn-On" : "Turn-Off" }.`});    
            }
         //res error if something went wrong
         return res.status(200).json({
            status: true ,message: 'Something went wrong While Setting EventPost Notifications.'});

    }catch(err){
        res.status(500).json({status:false,message: "Error While Setting EventPost Notifications: " + err.message})
    }
};

module.exports = {hideContact,hideOptinalDetails,setBlur,setActivityStatus,setConnReqNotification,setEventPostNotification};