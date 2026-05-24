const cron = require('node-cron');
const User = require('../models/user');
const Subscription = require('../models/subscription');  // Assuming this is the correct path

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();

    // Step 1: Update expired service subscriptions in User model
    const userUpdateResult = await User.updateMany(
      { "serviceSubscriptions.endDate": { $lt: now }, "serviceSubscriptions.status": "Active" },
      { 
        $set: { 
          "serviceSubscriptions.$[elem].status": "Expired" 
        } 
      },
      { 
        arrayFilters: [{ "elem.endDate": { $lt: now }, "elem.status": "Active" }] 
      }
    );
    console.log("Expired service subscriptions in User model updated:", userUpdateResult.modifiedCount);

    // Step 2: Update expired subscriptions in Subscription model
    const subscriptionUpdateResult = await Subscription.updateMany(
      { 
        "service.endDate": { $lt: now }, 
        "service.status": "Active" 
      },
      { 
        $set: { 
          "service.status": "Expired" 
        } 
      }
    );
    console.log("Expired subscriptions in Subscription model updated:", subscriptionUpdateResult.modifiedCount);

  } catch (error) {
    console.error("Error updating expired subscriptions:", error);
  }
});
