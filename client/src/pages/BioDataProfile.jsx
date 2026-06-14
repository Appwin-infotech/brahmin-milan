import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AiFillEdit, AiOutlineRollback } from "react-icons/ai";
import axios from "axios";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL, IMAGE_URL, subCasteOptions } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import NotFoundPage from "./NotFound";

const BioDataProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editableDetails, setEditableDetails] = useState({});
  const [verifying, setVerifying] = useState(false); // ✅ Point 11 — verify loading state

  const dateFields = ["dob"];
  const isDateField = (key) => dateFields.includes(key);

  const formatToDDMMYYYY = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : {};
  };
  const headers = getAuthHeaders();

  const fetchUser = async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v1/admin/getBiodataAdmin/user/${id}`,
        { headers }
      );
      if (response.status === 200 && response.data.status) {
        setUser(response.data.data);
        setEditableDetails(response.data.data.personalDetails);
      } else if (response.data.error === "Token expired") {
        alert("Session expired. Please login again.");
        localStorage.clear();
        window.location.href = "/login";
      } else {
        setError("User data not found.");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <NotFoundPage />;

  // ✅ Point 8 — save the page number before navigating back
  const handleBack = () => {
    navigate(-1);
  };

  const handleSave = async () => {
    try {
      const resp = await axios.patch(
        `${BASE_URL}/api/v1/admin/updateBiodata/${user.bioDataId}`,
        { personalDetails: editableDetails },
        { headers }
      );
      if (resp.data.status) {
        setUser((prev) => ({ ...prev, personalDetails: editableDetails }));
        toast.success(resp.data.message || "Biodata Updated Successfully");
        setEditMode(false);
      } else {
        alert("Failed to update profile");
      }
    } catch {
      alert("Failed to update profile");
    }
  };

  // ✅ Point 11 — Toggle verify status from admin panel
  // router.post("/verify-metrimonialProfile/:bioDataId", verifyToken, controller.verifyMetrimonialProfile);
  const handleVerifyToggle = async () => {
    setVerifying(true);
    try {
      const newVerifiedStatus = !user.verified;
      const resp = await axios.post(
        `${BASE_URL}/api/v1/activist/verify-metrimonialProfile/${user.bioDataId}`,
        { verified: newVerifiedStatus },
        { headers }
      );
      if (resp.data.status) {
        setUser((prev) => ({ ...prev, verified: newVerifiedStatus }));
        toast.success(
          newVerifiedStatus
            ? "Profile verified successfully."
            : "Profile verification removed."
        );
      } else {
        toast.error(resp.data.message || "Failed to update verification.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update verification.");
    } finally {
      setVerifying(false);
    }
  };

  const { personalDetails } = user;

  const sections = [
    {
      title: "Basic Information",
      fields: {
        fullname: "Full Name",
        subCaste: "Sub Caste",
        currentCity: "City",
        dob: "Date of Birth",
        timeOfBirth: "Time of Birth",
        placeofbirth: "Place of Birth",
        maritalStatus: "Marital Status",
        disabilities: "Disabilities",
        heightFeet: "Height",
        weight: "Weight",
        complexion: "Complexion",
        state: "State",
        cityOrVillage: "City/Village",
      },
    },
    {
      title: "Astrological Details",
      fields: {
        manglikStatus: "Manglik Status",
      },
    },
    {
      title: "Education & Occupation",
      fields: {
        qualification: "Qualification",
        occupation: "Occupation",
        annualIncome: "Annual Income",
      },
    },
    {
      title: "About Me",
      fields: {
        aboutMe: "About Me",
        profileCreatedBy: "Profile Created By",
      },
    },
    {
      title: "Family Details",
      fields: {
        fatherName: "Father's Name",
        motherName: "Mother's Name",
        fatherOccupation: "Father's Occupation",
        fatherIncomeAnnually: "Father's Income",
        motherOccupation: "Mother's Occupation",
        familyType: "Family Type",
        siblings: "Siblings",
        otherFamilyMemberInfo: "Family Member Info",
      },
    },
    {
      title: "Additional Contacts",
      fields: {
        contactNumber1: "Contact 1",
        contactNumber2: "Contact 2",
        state: "State",
        cityOrVillage: "City/Village",
      },
    },
    {
      title: "Lifestyle & Habits",
      fields: {
        knowCooking: "Cooking Skills",
        dietaryHabit: "Dietary Habit",
        smokingHabit: "Smoking Habit",
        drinkingHabit: "Drinking Habit",
        tobaccoHabits: "Tobacco Habits",
      },
    },
    {
      title: "Hobbies",
      fields: {
        hobbies: "Hobbies",
      },
    },
    {
      title: "Profile Images",
      fields: {
        closeUpPhoto: { label: "Close Up Photo", type: "image" },
        fullPhoto: { label: "Full Body Photo", type: "image" },
        bestPhoto: { label: "Best Photo", type: "image" },
      },
    },
  ];

  const isMultilineField = (key) =>
    ["aboutMe", "otherFamilyMemberInfo", "hobbies"].includes(key);

  return (
    <div className="min-h-screen text-white px-6 sm:px-8 md:px-12">
      <PageHeader title="Matrimony Profile Details" />
      <div className="max-w-7xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleBack}
            className="bg-white text-gray-900 px-6 py-2 rounded-md flex items-center gap-2"
          >
            <AiOutlineRollback /> Back
          </button>

          {/* ✅ Point 11 — Verify toggle + Edit button in top bar */}
          <div className="flex items-center gap-3">
            {/* Verify Profile Toggle */}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-md">
              <span className="text-gray-900 font-medium text-sm">
                {user.verified ? "Verified ✓" : "Unverified"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={user.verified}
                  disabled={verifying}
                  onChange={handleVerifyToggle}
                />
                <span className="w-11 h-6 bg-slate-200 rounded-full inline-flex items-center">
                  <span
                    className={`w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
                      user.verified
                        ? "translate-x-6 bg-green-500"
                        : "translate-x-1 bg-red-500"
                    } ${verifying ? "opacity-50" : ""}`}
                  />
                </span>
              </label>
            </div>

            {/* Edit / Save button */}
            <button
              onClick={() => {
                if (editMode) handleSave();
                else setEditMode(true);
              }}
              className="bg-white text-gray-900 px-6 py-2 rounded-md flex items-center gap-2"
            >
              {editMode ? (
                "Save"
              ) : (
                <>
                  <AiFillEdit /> Edit
                </>
              )}
            </button>

            {editMode && (
              <button
                onClick={() => {
                  setEditableDetails(user.personalDetails);
                  setEditMode(false);
                }}
                className="bg-gray-200 text-gray-900 px-6 py-2 rounded-md"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-gray-100 rounded-lg p-8 shadow-lg">
              <h2 className="text-3xl font-semibold text-gray-900 mb-6">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {Object.entries(section.fields).map(([key, labelOrObj]) => {
                  const label =
                    typeof labelOrObj === "string"
                      ? labelOrObj
                      : labelOrObj.label;

                  // ✅ Replace the image field rendering block with this:

                  if (
                    typeof labelOrObj === "object" &&
                    labelOrObj.type === "image"
                  ) {
                    const photoValue = personalDetails[key];
                    const photoArray = Array.isArray(photoValue)
                      ? photoValue
                      : photoValue
                      ? [photoValue]
                      : [];

                    // ✅ Each photo gets its own grid cell — return array of JSX elements
                    if (photoArray.length > 0) {
                      return photoArray.map((photo, i) => (
                        <div
                          key={`${key}-${i}`}
                          className="flex flex-col items-center gap-2"
                        >
                          <img
                            src={IMAGE_URL + photo}
                            alt={`${label} ${i + 1}`}
                            className="h-64 w-full object-cover rounded-lg shadow-lg"
                          />
                          <span className="text-black text-sm">
                            {label} {photoArray.length > 1 ? i + 1 : ""}
                          </span>
                        </div>
                      ));
                    }

                    // No photos
                    return (
                      <div
                        key={key}
                        className="flex flex-col items-center gap-2"
                      >
                        <span className="text-black">N/A</span>
                      </div>
                    );
                  }

                  // Text or date field
                  return (
                    <div
                      key={key}
                      className="flex flex-col md:flex-row md:items-start gap-2"
                    >
                      <strong className="text-gray-600 w-40 capitalize shrink-0">
                        {label}:
                      </strong>

                      {editMode ? (
                        key === "subCaste" ? (
                          <select
                            value={editableDetails[key] || ""}
                            onChange={(e) =>
                              setEditableDetails((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="border p-2 rounded-md w-full mb-2 bg-white text-black"
                          >
                            <option value="">Select Sub Caste</option>
                            {subCasteOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : isMultilineField(key) ? (
                          <textarea
                            className="text-black border rounded p-2 w-full min-h-[120px]"
                            value={editableDetails[key] || ""}
                            onChange={(e) =>
                              setEditableDetails((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <input
                            type={isDateField(key) ? "date" : "text"}
                            className="text-black border rounded px-2 py-1 w-full"
                            value={
                              editableDetails[key]
                                ? isDateField(key)
                                  ? new Date(editableDetails[key])
                                      .toISOString()
                                      .split("T")[0]
                                  : editableDetails[key]
                                : ""
                            }
                            onChange={(e) =>
                              setEditableDetails((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        )
                      ) : isMultilineField(key) ? (
                        <div className="text-black whitespace-pre-wrap text-justify w-full mt-1">
                          {personalDetails[key] || "N/A"}
                        </div>
                      ) : (
                        <span className="text-black">
                          {isDateField(key)
                            ? formatToDDMMYYYY(personalDetails[key]) || "N/A"
                            : personalDetails[key] || "N/A"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default BioDataProfile;
