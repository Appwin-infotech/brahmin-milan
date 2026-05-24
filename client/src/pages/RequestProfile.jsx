import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AiOutlineRollback } from "react-icons/ai";
import PageHeader from "../components/common/PageHeader";
import { IMAGE_URL } from "../utils/constants";

const RequestProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { request } = location.state || {};

  if (!request) {
    return <p>User not found.</p>;
  }
  const isValidDate = (value) => {
    return typeof value === "string" && !isNaN(Date.parse(value));
  };

  // Define section conditionally based on profileType
  let sections = [];

  if (request.profileType?.toLowerCase() === "activist") {
    sections = [
      {
        title: "Basic Information",
        fields: [
          "fullname",
          "activistId",
          "city",
          "state",
          "mobileNo",
          "subCaste",
          "dob",
        ],
      },
      {
        title: "Activist Information",
        fields: ["knownActivistId", "engagedWithCommittee"],
      },
      {
        title: "Profile Photo",
        fields: ["profilePhoto"],
      },
    ];
  } else{
    sections = [
      {
        title: "Basic Information",
        fields: [
          "fullName",
          "city",
          "mobileNo",
          "aadharNo",
          "residentialAddress",
          "state",
          "subCaste",
          "experience",
        ],
      },
      {
        title: "Profile Photo",
        fields: ["profilePhoto", "additionalPhotos"],
      },
      {
        title: `${request.profileType} Services`,
        fields: [
          `${request.profileType.toLowerCase()}Services`,
          `${request.profileType.toLowerCase()}Id`,
        ],
      },
            {
        title: `Website Url`,
        fields: ["websiteUrl"],
      },
                  {
        title: `Youtube Url`,
        fields: ["youtubeUrl"],
      },
                  {
        title: `Instagram Url`,
        fields: ["instagramUrl"],
      },
                  {
        title: `Whatsapp`,
        fields: ["whatsapp"],
      },
    ];
  }

  return (
    <div className="min-h-screen text-white px-6 sm:px-8 md:px-12">
      <PageHeader title="Request Profile User Details" />
      <div className="max-w-7xl mx-auto mt-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="bg-white text-gray-900 px-6 py-2 rounded-md mb-6 flex items-center gap-2"
          >
            <AiOutlineRollback /> Back
          </button>
        </div>

        <div className="space-y-8">
          {sections.map((section, index) => (
            <div
              key={index}
              className="bg-gray-100 rounded-lg p-6 md:p-8 shadow-lg"
            >
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {section.fields.map((field) => (
                  <div key={field} className="flex items-start sm:items-center">
                    <strong className="text-gray-600 w-48 sm:w-40 capitalize">
                      {field.replace(/([A-Z])/g, " $1").trim()}:
                    </strong>
<span className="text-black break-all">
  {field === "profilePhoto" && request[field] ? (
    <img
      src={IMAGE_URL+request[field]}
      alt="Profile"
      className="w-32 sm:w-40 h-32 sm:h-40 object-cover rounded-lg shadow-md"
    />
  ) : field === "additionalPhotos" && Array.isArray(request[field]) ? (
    request[field].length > 0 ? (
      <div className="flex flex-wrap gap-4">
        {request[field].map((photo, idx) => (
          <img
            key={idx}
            src={photo}
            alt={`Additional photo ${idx + 1}`}
            className="w-24 sm:w-32 h-24 sm:h-32 object-cover rounded-lg shadow-md"
          />
        ))}
      </div>
    ) : (
      "No additional photos"
    )
  ) : field === `${request.profileType.toLowerCase()}Services` ? (
    <div className="flex flex-wrap gap-2">
      {Array.isArray(request[field]) && request[field].length > 0 ? (
        request[field].map((service, index) => (
          <span
            key={index}
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm border"
          >
            {service.charAt(0).toUpperCase() + service.slice(1)}
          </span>
        ))
      ) : (
        <span className="text-gray-500">N/A</span>
      )}
    </div>
  ) : ["websiteUrl", "youtubeUrl", "instagramUrl", "whatsapp"].includes(field) &&
    request[field] ? (
    <a
      href={request[field].startsWith("http") ? request[field] : `https://${request[field]}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline"
    >
      {request[field]}
    </a>
  ) : field === "dob" && request.profileType?.toLowerCase() === "activist" && isValidDate(request[field]) ? (
  new Date(request[field]).toLocaleDateString("en-GB")
) : (
  request[field] || "N/A"
)}
</span>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RequestProfile;
