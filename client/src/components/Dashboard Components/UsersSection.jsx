import React from "react";
import { useNavigate } from "react-router-dom";
import { IMAGE_URL } from "../../utils/constants";
import { UserIcon } from "lucide-react";

const UsersSection = ({ users }) => {
  const navigate = useNavigate();
  const displayUsers = users?.slice(0, 3) || [];

  const handleViewAll = () => {
    navigate("/all-users");
  };

  if (!users || users.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">Users</h2>
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  // helper: map subscription type to profile flag
  const getProfileFlag = (user, type) => {
    console.log(user)
    switch (type) {
      case "Jyotish":
        return user.isJyotish;
      case "Kathavachak":
        return user.isKathavachak;
      case "Pandit":
        return user.isPandit;
      case "Biodata":
        return user.isMatrimonial;
      default:
        return false;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-bold mb-4">Users</h2>

      <div className="space-y-4">
        {displayUsers.map((user, idx) => (
          <div
            key={user._id || idx}
            className="border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-md transition"
          >
            {/* Profile Image */}
             {user.photoUrl && user.photoUrl.length > 0 ? (
               <img
                 src={IMAGE_URL + user.photoUrl[0]}
                 alt={user.username}
                 className="w-24 h-24 rounded-full object-cover border"
               />
             ) : (
               <div className="w-24 h-24 rounded-full border flex items-center justify-center bg-gray-100 text-gray-400">
                 <UserIcon size={40} />
               </div>
             )}

            {/* Profile Info */}
            <div className="flex-1 w-full">
              {/* User Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <h3 className="text-lg font-semibold">{user.username}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    user.access === "enable"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {user.access === "enable" ? "Active" : "Inactive"}
                </span>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">ID:</span> {user.userId}
                </p>
                <p>
                  <span className="font-medium">Mobile:</span> {user.mobileNo}
                </p>
                <p>
                  <span className="font-medium">Location:</span> {user.city}, {user.state}
                </p>
                <p>
                  <span className="font-medium">Date of Birth:</span>{" "}
                  {new Date(user.dob).toLocaleDateString()}
                </p>
              </div>

              {/* Subscription Section */}
              {user.serviceSubscriptions && user.serviceSubscriptions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2">Subscriptions & Profiles</h4>
                  <div className="space-y-2">
                    {user.serviceSubscriptions.map((subscription) => {
                      const profileCreated = getProfileFlag(user, subscription.serviceType);

                      return (
                        <div
                          key={subscription._id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-3 rounded border text-sm gap-2"
                        >
                          {/* Subscription info */}
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{subscription.serviceType}</span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                subscription.status === "Active"
                                  ? "bg-green-100 text-green-700"
                                  : subscription.status === "Expired"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {subscription.status}
                            </span>
                          </div>

                          {/* Profile created or not */}
                          <div
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              profileCreated
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {profileCreated ? "Profile Created" : "Profile Not Created"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3">
                Registered on: {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {users.length > 2 && (
        <div className="mt-4 text-right">
          <button
            onClick={handleViewAll}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            View More
          </button>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
