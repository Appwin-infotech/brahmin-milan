import { AiFillPlusCircle } from "react-icons/ai";
import React, { useState, useEffect } from "react";
import { FaTrash, FaEdit, FaEye, FaSpinner, FaTimes } from "react-icons/fa";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL, IMAGE_URL, subCasteOptions } from "../utils/constants";
import Modal from "react-modal";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";

const Committees = () => {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("committeeTitle");
  const [viewingMember, setViewingMember] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addCommitteloading, setAddCommitteLoading] = useState(false);
  const [error, setError] = useState(null);

  // Image states
  const [imageFile, setImageFile] = useState(null);
  const [imageFilePreview, setImageFilePreview] = useState(null);

  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);


  const [editingMember, setEditingMember] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;

  //image open modal
  const openImageModal = (imageUrl) => {
    setSelectedImage(IMAGE_URL + imageUrl);
    setShowImageModal(true);
  };
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const headers = getAuthHeaders();

  // fetch committee
  const fetchCommitteeData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/admin/getAllCommittee`, {
        method: "GET",
        headers: headers,
      });
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
        setMembers(data.data);
      } else {
        setError("Failed to fetch data");
      }
    } catch (error) {
      setError("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitteeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (query) => setSearchQuery(query);

  const filteredMembers = members.filter((member) =>
    member[filterBy]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // delete
  const handleDelete = async (committeeId) => {
    if (
      window.confirm("Are you sure you want to delete this Commitee profile?")
    ) {
      try {
        const response = await fetch(
          `${BASE_URL}/api/v1/admin/deleteCommiteeByAdmin/${committeeId}`,
          {
            method: "DELETE",
            headers: headers,
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        if (data.status) {
          toast.success(data.message || "Committee Deleted Successfully.");
          setMembers((prev) =>
            prev.filter((member) => member._id !== committeeId)
          );
        } else {
          toast.error(data.message || "Delete failed");
        }
      } catch (error) {
        toast.error(error.message || "Error deleting member");
      }
    }
  };

  // update
  const handleUpdate = async (e, committeeId) => {
    e.preventDefault();
    setAddCommitteLoading(true);

    const formData = new FormData();
    formData.append("committeeTitle", e.target.committeeTitle.value);
    formData.append("presidentName", e.target.presidentName.value);
    formData.append("subCaste", e.target.subCaste.value);
    formData.append("city", e.target.city.value);
    formData.append("area", e.target.area.value);
    formData.append("mobileNo", e.target.mobileNo.value);
    if (editImageFile) {
      formData.append("photoUrl", editImageFile);
    }

    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/updateCommiteeByAdmin/${committeeId}`,
        {
          method: "PATCH",
          headers: headers,
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      if (data.status) {
        toast.success(
          data.message || "Committee Details Updated Successfully."
        );
        setEditingMember(null);
        setEditImageFile(null);
        fetchCommitteeData();
      } else {
        toast.error(data.message || "Failed to update committee");
      }
    } catch (error) {
      toast.error(error.message || "Error updating committee");
    } finally {
      setAddCommitteLoading(false);
    }
  };

  // image select
const handleImageUpload = (e, type) => {
  const file = e.target.files[0];

  if (file) {
    if (type === "edit") {
      setEditImageFile(file); // Save file for upload
      const previewUrl = URL.createObjectURL(file);
      setEditImagePreview(previewUrl); // Set preview image URL
    } else if (type === "add") {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImageFilePreview(previewUrl);
    }
  }
};


  // add
  const handleAddCommittee = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("activistId", e.target.activistId.value);
    formData.append("committeeTitle", e.target.committeeTitle.value);
    formData.append("presidentName", e.target.presidentName.value);
    formData.append("subCaste", e.target.subCaste.value);
    formData.append("city", e.target.city.value);
    formData.append("area", e.target.area.value);
    formData.append("mobileNo", e.target.mobileNo.value);

    if (imageFile) {
      formData.append("photoUrl", imageFile);
    }

    try {
      const response = await fetch(`${BASE_URL}/api/v1/admin/create-CommitteeByAdmin`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add Committee");
      }

      if (data.status) {
        toast.success(data.message || "Committee Added Successfully");
        fetchCommitteeData();
        setImageFile(null);
        setAddingMember(false);
      }
    } catch (error) {
      toast.error(error.message || "Error while Adding Committee");
      setImageFile(null);
      setAddingMember(false);
    }
  };



  //pagination
  const totalPages = Math.ceil(filteredMembers.length / profilesPerPage);
  const indexOfLastRecord = currentPage * profilesPerPage;
  const indexOfFirstRecord = indexOfLastRecord - profilesPerPage;
  const currentMembers = filteredMembers.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const handlePageChange = (page) => setCurrentPage(page);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FaSpinner className="animate-spin text-3xl text-gray-700" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-6">{error}</div>;
  }

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">
      <PageHeader title="Committees" />

      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        <div className="flex justify-between items-center">
          {/* Search and Filter */}
          <div className="flex items-center gap-4 my-6 flex-wrap overflow-x-auto">
            <input
              type="text"
              placeholder={`Search by ${filterBy}`}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="border p-2 rounded-md"
            />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="border p-2 rounded-md"
            >
              <option value="committeeTitle">Committee Title</option>
              <option value="presidentName">President Name</option>
              <option value="subCaste">Sub Caste</option>
              <option value="city">City</option>
              <option value="area">Area</option>
            </select>

            <button
              className="bg-white border border-black text-gray-900 p-2 text-bold rounded-full hover:bg-gray-900 hover:text-white flex items-center"
              onClick={() => setAddingMember(true)}
            >
              <AiFillPlusCircle size={25} />{" "}
              <span className="ml-2">Add Committee</span>
            </button>
          </div>

          {/* Add Modal */}
{addingMember && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 px-4">
    <div className="bg-white p-6 rounded-lg shadow-lg sm:w-2/3 md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-y-auto max-w-screen-md">
      <h2 className="text-xl font-bold mb-4 underline">Add Committee</h2>
      <form onSubmit={handleAddCommittee}>
        <input
          type="text"
          name="activistId"
          placeholder="Activist ID (e.g., AB0001)"
          required
          pattern="[A-Z]{2}[0-9]{4}"
          title="Format must be 2 capital letters followed by 4 digits (e.g., AB0001)"
          className="border p-2 rounded-md w-full mb-2"
        />

        <input
          type="text"
          name="committeeTitle"
          placeholder="Committee Title"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <input
          type="text"
          name="presidentName"
          placeholder="President Name"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <select
          name="subCaste"
          required
          className="border p-2 rounded-md w-full mb-2"
        >
          <option value="">Select Sub Caste</option>
          {subCasteOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="city"
          placeholder="City"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <input
          type="text"
          name="area"
          placeholder="Area"
          className="border p-2 rounded-md w-full mb-2"
        />

        <input
          type="text"
          name="mobileNo"
          placeholder="Mobile No"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <label className="block font-semibold">Upload Photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, "add")}
          className="border p-2 rounded-md w-full mb-2"
        />

        {/* Preview uploaded image */}
        {imageFilePreview && (
          <img
            src={imageFilePreview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-md mb-4"
          />
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="bg-gray-900 text-white px-4 py-1 rounded-md hover:bg-gray-600"
            onClick={() => {
              setAddingMember(false);
              setImageFile(null);
              setImageFilePreview(null);
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-1 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            {addCommitteloading ? (
              <>
                <FaSpinner className="animate-spin" />
                Loading...
              </>
            ) : (
              "Add Committee"
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

        </div>

        {/* Filter Result Count */}
        <div className="my-4 text-gray-700 font-medium">
          Showing {filteredMembers.length} result
          {filteredMembers.length !== 1 && "s"}
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-900 text-white uppercase">
            <tr>
              <th className="py-3 px-4 text-left">Photo</th>
              <th className="py-2 px-4 text-left">Activist Id</th>
              <th className="py-2 px-4 text-left">Committee Title</th>
              <th className="py-2 px-4 text-left">President Name</th>
              <th className="py-2 px-4 text-left">Sub Caste</th>
              <th className="py-2 px-4 text-left">City</th>
              <th className="py-2 px-4 text-left">Area</th>
              <th className="py-2 px-4 text-left">Mobile No</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentMembers.length === 0 ? (
              <tr>
                <td colSpan="13" className="px-4 py-2 text-center">
                  No records available
                </td>
              </tr>
            ) : (
              currentMembers.map((member) => (
                <tr key={member._id} className="border-b hover:bg-gray-100">
                  <td className="py-3 px-4">
                    {member.photoUrl ? (
                      <img
                        src={IMAGE_URL + member.photoUrl}
                        alt="User"
                        className="w-10 h-10 rounded-full object-cover border cursor-pointer"
                        onClick={() => openImageModal(member.photoUrl)}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4">{member.activistId.activistId}</td>
                  <td className="py-2 px-4">{member.committeeTitle}</td>
                  <td className="py-2 px-4">{member.presidentName}</td>
                  <td className="py-2 px-4">{member.subCaste}</td>
                  <td className="py-2 px-4">{member.city}</td>
                  <td className="py-2 px-4">{member.area}</td>
                  <td className="py-2 px-4">{member.mobileNo}</td>
                  <td className="py-2 px-4 flex gap-2 mt-4">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setViewingMember(member)}
                    >
                      <FaEye size={15} />
                    </button>
                    <button
                      className="text-yellow-500 hover:text-yellow-700"
                      onClick={() => setEditingMember(member)}
                    >
                      <FaEdit size={15} />
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(member._id)}
                    >
                      <FaTrash size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Image Modal */}
        <Modal
          isOpen={showImageModal}
          onRequestClose={closeImageModal}
          title="Profile Image"
          className="bg-white rounded-2xl ml-20 p-2 my-8 shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div className="flex justify-center">
            <img
              src={selectedImage}
              alt="Full View"
              className="h-auto max-h-[35vh] sm:max-h-[35vh] rounded-md shadow object-contain cursor-pointer"
              onClick={closeImageModal}
            />
          </div>
        </Modal>

        {/* View Modal */}
        {viewingMember && (
          <div
            onClick={(e) => {
              if (e.target.classList.contains("fixed")) setViewingMember(null);
            }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 px-4"
          >
            <div className="bg-white p-6 rounded-lg shadow-lg w-full sm:w-2/3 md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setViewingMember(null)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                <FaTimes size={20} />
              </button>
              <h2 className="text-2xl font-bold mb-4 underline">
                Committee Member Details
              </h2>
              <div className="space-y-2">
                <p>
                  <strong>Activist Id:</strong>{" "}
                  {viewingMember.activistId?.activistId || "N/A"}
                </p>
                <p>
                  <strong>Committee Title:</strong> {viewingMember.committeeTitle}
                </p>
                <p>
                  <strong>President Name:</strong> {viewingMember.presidentName}
                </p>
                <p>
                  <strong>Sub Caste:</strong> {viewingMember.subCaste}
                </p>
                <p>
                  <strong>City:</strong> {viewingMember.city}
                </p>
                <p>
                  <strong>Area:</strong> {viewingMember.area}
                </p>
                <p>
                  <strong>Mobile No:</strong> {viewingMember.mobileNo}
                </p>
                {viewingMember.photoUrl && (
                  <img
                    src={IMAGE_URL + viewingMember.photoUrl}
                    alt="Committee Member"
                    className="w-32 h-32 rounded-full object-cover border mt-3"
                  />
                )}
              </div>
            </div>
          </div>
        )}


        {/* Edit Modal */}
 {editingMember && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 px-4">
    <div className="bg-white p-6 rounded-lg shadow-lg sm:w-2/3 md:w-1/2 lg:w-1/3 max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 underline">Edit Committee</h2>
      
      <form onSubmit={(e) => handleUpdate(e, editingMember._id)}>
        <input
          type="text"
          name="committeeTitle"
          defaultValue={editingMember.committeeTitle}
          placeholder="Committee Title"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <input
          type="text"
          name="presidentName"
          defaultValue={editingMember.presidentName}
          placeholder="President Name"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <select
          name="subCaste"
          defaultValue={editingMember.subCaste}
          required
          className="border p-2 rounded-md w-full mb-2"
        >
          <option value="">Select Sub Caste</option>
          {subCasteOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="city"
          defaultValue={editingMember.city}
          placeholder="City"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <input
          type="text"
          name="area"
          defaultValue={editingMember.area}
          placeholder="Area"
          className="border p-2 rounded-md w-full mb-2"
        />

        <input
          type="text"
          name="mobileNo"
          defaultValue={editingMember.mobileNo}
          placeholder="Mobile No"
          required
          className="border p-2 rounded-md w-full mb-2"
        />

        <label className="block font-semibold">Upload New Photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e, "edit")}
          className="border p-2 rounded-md w-full mb-2"
        />

        {/* Image preview */}
        {editImagePreview ? (
          <img
            src={editImagePreview}
            alt="New Preview"
            className="w-20 h-20 rounded-md object-cover border mb-2"
          />
        ) : editingMember.photoUrl ? (
          <img
            src={IMAGE_URL + editingMember.photoUrl}
            alt="Current"
            className="w-20 h-20 rounded-md object-cover border mb-2"
          />
        ) : null}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="bg-gray-900 text-white px-4 py-1 rounded-md hover:bg-gray-600"
            onClick={() => {
              setEditingMember(null);
              setEditImageFile(null);
              setEditImagePreview(null);
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={addCommitteloading}
            className="bg-yellow-600 text-white px-4 py-1 rounded-md hover:bg-yellow-700 flex items-center gap-2"
          >
            {addCommitteloading ? (
              <>
                <FaSpinner className="animate-spin" />
                Updating...
              </>
            ) : (
              "Update Committee"
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default Committees;
