import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaEdit, FaSave } from "react-icons/fa";
import { BASE_URL, IMAGE_URL, subCasteOptions } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";

const DharmshalaProfile = () => {
  const { id } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    dharmshalaName: "",
    city: "",
    mobileNo: "",
    description: "",
    images: [],       // Existing image URLs
  });
  const [newFiles, setNewFiles] = useState([]); // Newly selected image files
  const [removedImages, setRemovedImages] = useState([]); // URLs of images marked for removal
  const [subCaste, setSubCaste] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

   const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/api/v1/admin/getDharmshalaById/${id}`,
          { headers: getAuthHeaders() }
        );
        const data = await response.json();
        if (data.status) {
          setProfileData(data.data);
          setFormData({
            dharmshalaName: data.data.dharmshalaName,
            city: data.data.city,
            mobileNo: data.data.mobileNo,
            description: data.data.description,
            images: data.data.images || [],
          });
          setSubCaste(data.data.subCaste || "");
        } else {
          toast.error("Failed to load profile");
        }
      } catch (err) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  // Handle text inputs and select choice for subCaste
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "subCaste") {
      setSubCaste(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle newly selected files
  const handleImageUpload = (e) => {
    const filesArray = Array.from(e.target.files);
    if (filesArray.length + formData.images.length - removedImages.length > 5) {
      toast.error("You can upload a maximum of 5 images.");
      return;
    }
    setNewFiles(prev => [...prev, ...filesArray]);
  };

  // Remove image from existing images (mark for removal)
  const removeExistingImage = (url) => {
    setRemovedImages(prev => [...prev, url]);
  };

  // Remove newly added file before upload
  const removeNewFile = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit form data as multipart/form-data
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const data = new FormData();

    data.append("dharmshalaName", formData.dharmshalaName);
    data.append("city", formData.city);
    data.append("mobileNo", formData.mobileNo);
    data.append("description", formData.description);
    data.append("subCaste", subCaste);
    // Append URLs of images to remove as JSON string
    data.append("removeImages", JSON.stringify(removedImages));

    // Append newly added files
    newFiles.forEach(file => {
      data.append("images", file);
    });

    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/updateDharmshala/${id}`,
        {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(),
            // Do NOT set Content-Type manually for multipart/form-data
          },
          body: data,
        }
      );
      const resData = await response.json();
      if (resData.status) {
        toast.success("Profile updated successfully");
        setProfileData(resData.data);
        // Reset form and editing mode
        setFormData({
          dharmshalaName: resData.data.dharmshalaName,
          city: resData.data.city,
          mobileNo: resData.data.mobileNo,
          description: resData.data.description,
          images: resData.data.images || [],
        });
        setRemovedImages([]);
        setNewFiles([]);
        setSubCaste(resData.data.subCaste || "");
        setIsEditing(false);
      } else {
        toast.error(resData.message || "Update failed");
      }
    } catch (error) {
      toast.error("Error updating profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return <div className="text-center text-gray-500 py-10">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-8 transition-all duration-300">
        {/* Header with name and edit/save */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? (
              <input
                name="dharmshalaName"
                value={formData.dharmshalaName}
                onChange={handleInputChange}
                className="border p-2 rounded w-full"
              />
            ) : (
              profileData?.dharmshalaName
            )}
          </h1>
          <button
            onClick={() => (isEditing ? handleSubmit() : setIsEditing(true))}
            className={`flex items-center gap-2 text-white px-4 py-2 rounded shadow ${
              isEditing ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={isSubmitting}
          >
            {isEditing ? <FaSave /> : <FaEdit />}
            {isEditing ? "Save" : "Edit"}
          </button>
        </div>

        {/* Sub Caste */}
        <div>
          <label className="text-sm text-gray-900 font-bold mb-1 block">
            Sub Caste
          </label>
          {isEditing ? (
            <select
              name="subCaste"
              value={subCaste}
              onChange={handleInputChange}
              className="border rounded p-2 w-60 mb-2"
            >
              <option value="">Select Sub Caste</option>
              {subCasteOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-gray-800 pb-2 ">{profileData?.subCaste || "-"}</p>
          )}
        </div>

        {/* City and Mobile No */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm font-bold text-gray-900 mb-1 block">
              City
            </label>
            {isEditing ? (
              <input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            ) : (
              <p className="text-gray-800">{profileData?.city}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-gray-900 mb-1 block">
              Mobile No
            </label>
            {isEditing ? (
              <input
                name="mobileNo"
                value={formData.mobileNo}
                onChange={handleInputChange}
                className="border rounded p-2 w-full"
              />
            ) : (
              <p className="text-gray-800">{profileData?.mobileNo}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="text-sm font-bold text-gray-900 mb-1 block">
            Description
          </label>
          {isEditing ? (
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="border p-3 rounded w-full h-32 resize-none"
            />
          ) : (
            <p className="text-gray-800 whitespace-pre-line">
              {profileData?.description}
            </p>
          )}
        </div>

        {/* Gallery */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Gallery</h2>
          {isEditing && (
            <input
              type="file"
              multiple
              accept="image/*"
              name="images"     
              onChange={handleImageUpload}
              className="mb-4 block border border-dashed rounded p-2 w-full"
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Existing images except those marked for removal */}
            {formData.images
              .filter((img) => !removedImages.includes(img))
              .map((img, i) => (
                <div key={img} className="relative group">
                  <img
                    src={IMAGE_URL+img}
                    alt={`img-${i}`}
                    className="rounded-lg shadow-sm object-cover h-48 w-full"
                  />
                  {isEditing && (
                    <button
                      onClick={() => removeExistingImage(img)}
                      className="absolute top-2 right-2 bg-white p-1 rounded-full shadow hover:bg-red-100 text-red-600"
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

            {/* Newly added files preview */}
            {newFiles.map((file, i) => {
              const objectUrl = URL.createObjectURL(file);
              return (
                <div key={objectUrl} className="relative group">
                  <img
                    src={objectUrl}
                    alt={`new-file-${i}`}
                    className="rounded-lg shadow-sm object-cover h-48 w-full"
                  />
                  {isEditing && (
                    <button
                      onClick={() => removeNewFile(i)}
                      className="absolute top-2 right-2 bg-white p-1 rounded-full shadow hover:bg-red-100 text-red-600"
                      type="button"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        {isEditing && (
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => {
                setFormData({
                  dharmshalaName: profileData.dharmshalaName,
                  city: profileData.city,
                  mobileNo: profileData.mobileNo,
                  description: profileData.description,
                  images: profileData.images || [],
                });
                setSubCaste(profileData.subCaste || "");
                setRemovedImages([]);
                setNewFiles([]);
                setIsEditing(false);
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded text-white ${
                isSubmitting ? "bg-green-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default DharmshalaProfile;
