import React from "react";
import { useNavigate } from "react-router-dom";
import { IMAGE_URL } from "../../utils/constants";

const RequestsSection = ({ requests }) => {
  const navigate = useNavigate();

  const displayRequests = requests?.slice(0, 2) || [];

  const handleViewAll = () => {
    navigate("/profile-approvals");
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">Requests</h2>
        <p className="text-gray-500">No requests found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-bold mb-4">Requests</h2>
      <div className="space-y-4">
        {displayRequests.map((req, idx) => (
          <div
            key={req._id || idx}
            className="border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:shadow-md transition"
          >
            {req.profilePhoto && (
              <img
                src={IMAGE_URL+req.profilePhoto}
                alt={req.fullName}
                className="w-20 h-20 rounded-full object-cover border"
              />
            )}

            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <h3 className="text-base sm:text-lg font-semibold">{req.fullName}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    req.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : req.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {req.status}
                </span>
              </div>

              <p className="text-sm text-gray-600">
                ID:{" "}
                <span className="font-medium">
                  {req.kathavachakId || req.jyotishId || req.activistId || req.panditId}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Mobile: <span className="font-medium">{req.mobileNo}</span>
              </p>
              <p className="text-sm text-gray-600">
                Location:{" "}
                <span className="font-medium">
                  {req.city}, {req.state}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Experience: <span className="font-medium">{req.experience} years</span>
              </p>
              <p className="text-sm text-gray-600">
                Sub-Caste: <span className="font-medium">{req.subCaste || "—"}</span>
              </p>

              {/* Services */}
              <div className="mt-2 flex flex-wrap gap-2">
                {(req.kathavachakServices || req.jyotishServices || req.panditServices)?.slice(0, 4)
                  .map((service, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                    >
                      {service}
                    </span>
                  ))}
              </div>

              {/* Date */}
              <p className="text-xs text-gray-400 mt-2">
                Requested on: {new Date(req.createdAt).toLocaleDateString()}
              </p>

              {/* Social Links */}
              <div className="mt-3 flex flex-wrap gap-3 text-lg">
                {req.facebookUrl && (
                  <a
                    href={req.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <i className="fab fa-facebook-f"></i>
                  </a>
                )}
                {req.instagramUrl && (
                  <a
                    href={req.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-800"
                  >
                    <i className="fab fa-instagram"></i>
                  </a>
                )}
                {req.youtubeUrl && (
                  <a
                    href={req.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-800"
                  >
                    <i className="fab fa-youtube"></i>
                  </a>
                )}
                {req.whatsapp && (
                  <a
                    href={`https://wa.me/${req.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800"
                  >
                    <i className="fab fa-whatsapp"></i>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {requests.length > 2 && (
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

export default RequestsSection;
