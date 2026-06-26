import {
  AiFillEdit,
  AiOutlineRollback,
  AiOutlineSave,
  AiOutlineClose,
} from "react-icons/ai";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import PageHeader from "../components/common/PageHeader";
import NotFoundPage from "./NotFound";
import { BASE_URL } from "../utils/constants";
import { getPhotoUrl } from "../utils/imageHelpers";

const SingleUserPKA = () => {
  const { userType, id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Image states
  const [profilePhoto, setProfilePhoto] = useState("");
  const [additionalPhotos, setAdditionalPhotos] = useState([]);

  // Helper: get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : {};
  };

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/api/v1/admin/specialists/${userType}/${id}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );
        const data = await response.json();
        if (!response.ok) {
          if (data.error === "Token expired") {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "/login";
            return;
          } else {
            throw new Error(data.message || "Failed to fetch users.");
          }
        }
        if (data.status) {
          setProfile(data.user);
          setFormData(data.user);
          setProfilePhoto(data.user.profilePhoto || "");
          setAdditionalPhotos(data.user.additionalPhotos || []);
        } else {
          setError("Profile not found.");
        }
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch profile data");
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, userType]);

  if (loading) return <div className="text-white">Loading...</div>;
  if (!profile) return <NotFoundPage />;
  if (error) return <div className="text-white">Error: {error}</div>;

  // Helper: get correct services field
  const getServiceFieldName = () => {
    switch (userType) {
      case "pandit":
        return "panditServices";
      case "jyotish":
        return "jyotishServices";
      case "kathavachak":
        return "kathavachakServices";
      default:
        return "services";
    }
  };

  // Helper: display value or N/A
  const displayValue = (value) =>
    value === undefined || value === null || value === "" ? "N/A" : value;

  // Handlers for editing
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleServiceChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      [getServiceFieldName()]: value.split(",").map((s) => s.trim()),
    }));
  };

  const handleCancel = () => {
    setFormData(profile);
    setProfilePhoto(profile.profilePhoto || "");
    setAdditionalPhotos(profile.additionalPhotos || []);
    setEditMode(false);
  };

  // Image handlers
  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfilePhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePhoto = () => {
    setFormData((prev) => ({ ...prev, profilePhoto: "" }));
  };

  const handleAdditionalPhotosChange = (e) => {
    const files = Array.from(e.target.files);
    if (additionalPhotos.length + files.length > 5) {
      alert("You can upload up to 5 additional photos only.");
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setAdditionalPhotos((prev) => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAdditionalPhoto = (idx) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      const url = `${BASE_URL}/api/v1/admin/updateSpecialist/${userType}/${id}`;
      await axios.patch(
        url,
        { ...formData, profilePhoto, additionalPhotos },
        { headers: getAuthHeaders() }
      );
      setProfile({ ...formData, profilePhoto, additionalPhotos });
      setEditMode(false);
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Failed to update profile. Please try again.");
      console.error(error);
    }
  };

  const backToList = () => {
    const page = new URLSearchParams(location.search).get("page");
    navigate(-1);
  };

  // Render
  return (
    <div className="min-h-screen bg-gray-950 pb-8 px-6 sm:px-8 md:px-12">
      <PageHeader
        title={`${
          userType.charAt(0).toUpperCase() + userType.slice(1)
        } Details`}
      />
      <div className="max-w-7xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => backToList()}
            className="bg-white text-gray-900 px-6 py-2 rounded-md flex items-center gap-2"
          >
            <AiOutlineRollback /> Back
          </button>
          {editMode ? (
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-6 py-2 rounded-md flex items-center gap-2"
              >
                <AiOutlineSave /> Save
              </button>
              <button
                onClick={handleCancel}
                className="bg-red-600 text-white px-6 py-2 rounded-md flex items-center gap-2"
              >
                <AiOutlineClose /> Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="bg-white text-gray-900 px-6 py-2 rounded-md flex items-center gap-2"
            >
              <AiFillEdit /> Edit
            </button>
          )}
        </div>

        <div className="space-y-6 ">
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-y-6">
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">Name:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.fullName || ""}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <span>{displayValue(profile.fullName)}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">Mobile:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.mobileNo || ""}
                    onChange={(e) => handleChange("mobileNo", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <span>{displayValue(profile.mobileNo)}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">State:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.state || ""}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <span>{displayValue(profile.state)}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 ml-2">
                <span className="text-gray-600">City:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.city || ""}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <span>{displayValue(profile.city)}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">Address:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.residentialAddress || ""}
                    onChange={(e) =>
                      handleChange("residentialAddress", e.target.value)
                    }
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <span>{displayValue(profile.residentialAddress)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Photo Section */}

          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h2 className="text-xl font-bold mb-2">Profile Photo</h2>
            <div className="flex items-center gap-4">
              {profilePhoto ? (
                <div className="relative">
                  <img
                    src={getPhotoUrl(profilePhoto)}
                    alt="Profile"
                    className="h-24 w-24 object-cover rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder-image.png";
                    }}
                  />
                  {editMode && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePhoto}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                      title="Remove"
                    >
                      <AiOutlineClose />
                    </button>
                  )}
                </div>
              ) : (
                editMode && (
                  <label className="h-24 w-24 flex items-center justify-center border-2 border-dashed rounded cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoChange}
                      className="hidden"
                    />
                    <span className="text-gray-400">+</span>
                  </label>
                )
              )}
            </div>
          </div>

          {/* Additional Photos Section */}
          <div className="bg-white rounded-lg p-8 shadow-lg mt-4">
            <h2 className="text-xl font-bold mb-2">Additional Photos</h2>
            <div className="flex flex-wrap gap-4">
              {additionalPhotos.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={getPhotoUrl(img)}
                    alt={`additional-${idx}`}
                    className="h-24 w-24 object-cover rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder-image.png";
                    }}
                  />
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAdditionalPhoto(idx)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                      title="Remove"
                    >
                      <AiOutlineClose />
                    </button>
                  )}
                </div>
              ))}
              {/* {editMode && additionalPhotos.length < 5 && (
      <label className="h-24 w-24 flex items-center justify-center border-2 border-dashed rounded cursor-pointer">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleAdditionalPhotosChange}
          className="hidden"
        />
        <span className="text-gray-400">+</span>
      </label>
    )} */}
            </div>
            {!editMode && additionalPhotos.length === 0 && (
              <span className="text-gray-500">
                No additional photos uploaded.
              </span>
            )}
          </div>

          {/* Services & Experience Section */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Services & Experience
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">Services:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={
                      (formData[getServiceFieldName()] &&
                        formData[getServiceFieldName()].join(", ")) ||
                      ""
                    }
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile[getServiceFieldName()]?.length > 0 ? (
                      profile[getServiceFieldName()].map((service, index) => (
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
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-gray-600">Experience:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.experience || ""}
                    onChange={(e) => handleChange("experience", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <span>
                    {profile.experience ? `${profile.experience} years` : "N/A"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Details Section */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Subscription Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-y-6">
              <div className="grid grid-cols-3 gap-x-4">
                <span className="text-gray-600">Website:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.websiteUrl || ""}
                    onChange={(e) => handleChange("websiteUrl", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <a
                    href={profile.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {displayValue(profile.websiteUrl)}
                  </a>
                )}
              </div>
              <div className="grid grid-cols-3 gap-x-4">
                <span className="text-gray-600">WhatsApp:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.whatsapp || ""}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <a
                    href={profile.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {displayValue(profile.whatsapp)}
                  </a>
                )}
              </div>
              <div className="grid grid-cols-3 gap-x-4">
                <span className="text-gray-600">YouTube:</span>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.youtubeUrl || ""}
                    onChange={(e) => handleChange("youtubeUrl", e.target.value)}
                    className="border px-2 py-1 rounded w-full"
                  />
                ) : (
                  <a
                    href={profile.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {displayValue(profile.youtubeUrl)}
                  </a>
                )}
              </div>
              <div className="grid grid-cols-3 gap-x-4">
                <span className="text-gray-600">Social Links:</span>
                {editMode ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Facebook"
                      value={formData.facebookUrl || ""}
                      onChange={(e) =>
                        handleChange("facebookUrl", e.target.value)
                      }
                      className="border px-2 py-1 rounded w-full"
                    />
                    <input
                      type="text"
                      placeholder="Instagram"
                      value={formData.instagramUrl || ""}
                      onChange={(e) =>
                        handleChange("instagramUrl", e.target.value)
                      }
                      className="border px-2 py-1 rounded w-full"
                    />
                  </div>
                ) : (
                  <div className="flex gap-4">
                    {profile.facebookUrl && (
                      <a
                        href={profile.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Facebook
                      </a>
                    )}
                    {profile.instagramUrl && (
                      <a
                        href={profile.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Instagram
                      </a>
                    )}
                    {!profile.facebookUrl && !profile.instagramUrl && "N/A"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleUserPKA;
