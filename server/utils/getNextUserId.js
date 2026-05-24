const User = require("../models/user");

// Generator function to produce user IDs in the desired sequence
async function* generateUserIds() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
      const letterPair = letters[i] + letters[j];
      for (let num = 1; num <= 9999; num++) {
        const numberPart = num.toString().padStart(4, '0');
        const userId = letterPair + numberPart;
        // Check if the userId already exists in the database
        const existingUser = await User.findOne({ userId: userId });
        if (!existingUser) {
          yield userId;
        }
      }
    }
  }
}

// Function to get the next unique user ID
const getNextUserId = async () => {
  const userIdGenerator = generateUserIds();
  const { value: uniqueUserId } = await userIdGenerator.next();
  return uniqueUserId;
};

module.exports = { getNextUserId };
