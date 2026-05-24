const validator = require("validator");
const {  isEmail } = require("validator");

const validationSignUp = (req) =>{
     const {username,mobileNo,password,dob} = req?.body;
     if(!username || username === ""){
        throw new Error('Name is not Valid');
     }else if(!isEmail(mobileNo)){
        throw new Error('Please enter a valid mobileNo address')
     }else if(!validator.isStrongPassword(password)){
        throw new Error("Please Enter a Strong Password");
     }else if(skills?.length > 10){
        throw new Error("You cannot fill skills more than 10 ");
     }
}

const validatePassword = (req)=>{
   try{
   const password = req.body.password;
   if(!validator.isStrongPassword(password)){
      throw new Error("Please Enter strong password");
   }
   else{
      return true;
   }
}catch(err){
   throw new Error(err);
}
}

module.exports = {validationSignUp,validatePassword};