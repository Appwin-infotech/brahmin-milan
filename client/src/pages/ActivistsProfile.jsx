import React, { useState, useEffect } from "react";
import PageHeader from "../components/common/PageHeader";
import Modal from "react-modal";
import { FaSpinner, FaEye, FaEdit, FaTrashAlt } from "react-icons/fa";
import { BASE_URL, IMAGE_URL, subCasteOptions } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";
import { getPhotoUrl } from "../utils/imageHelpers";

const genderData = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const statusData = [
  { label: "Enabled", value: "enable" },
  { label: "Disabled", value: "disable" },
];

const ActivistProfiles = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedSubcaste, setSelectedSubcaste] = useState("");
  const [selectedLocality, setSelectedLocality] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  // const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const activistPerPage = 10;

  //image open modal
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
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

  //get headers
  const headers = getAuthHeaders();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchQuery,
    startDate,
    endDate,
    selectedGender,
    selectedLocality,
    selectedSubcaste,
  ]); // selectedStatus

  const fetchUsers = async () => {
    setLoading(true);

    try {
      // Build query string from params
      const queryParams = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(selectedGender && { gender: selectedGender }),
        ...(selectedSubcaste && { subCaste: selectedSubcaste }),
        ...(selectedLocality && { locality: selectedLocality }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      }).toString();

      const response = await fetch(
        `${BASE_URL}/api/v1/admin/fetchActivistForAdmin?${queryParams}`,
        {
          method: "GET",
          headers: headers,
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
          throw new Error(data.message || "Failed to fetch activists");
        }
      }

      setFilteredUsers(data.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Error fetching activists:", error);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedGender("");
    setSelectedSubcaste("");
    setSelectedLocality("");
    // setSelectedStatus("");
    fetchUsers();
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleView = async (id) => {
    setViewLoading(true);
    setSelectedUser(null); // Clear previous data
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/getActivistById/${id}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch details");
      setSelectedUser(data.data); // Use the API's data
    } catch (err) {
      alert(err.message || "Could not load activist details.");
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = async (id) => {
    setIsUpdating(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/getActivistById/${id}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to fetch activist data");
      setEditForm({
        ...data.data,
        dob: data.data.dob
          ? new Date(data.data.dob).toISOString().slice(0, 10)
          : "",
      });
      setShowEditModal(true);
    } catch (err) {
      toast.error(err.message);
      alert(err.message || "Could not load activist details for editing.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const id = editForm._id;
      const formData = new FormData();

      // Append form fields
      Object.keys(editForm).forEach((key) => {
        if (key !== "profilePhoto") {
          formData.append(key, editForm[key]);
        }
      });

      // Append image file if selected
      if (editImage) {
        formData.append("profilePhoto", editImage);
      }

      // Convert dob to DD/MM/YYYY if needed
      if (editForm.dob) {
        const [yyyy, mm, dd] = editForm.dob.split("-");
        formData.set("dob", `${dd}/${mm}/${yyyy}`);
      }

      const res = await fetch(
        `${BASE_URL}/api/v1/admin/updateActivistByAdmin/${id}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Update failed");

      toast.success(data.message);
      alert("Activist profile updated successfully.");
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
      alert(err.message || "Update failed");
    } finally {
      setIsUpdating(false);
      setEditImage(null);
      setEditImagePreview("");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Activist profile.?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/delete-Activist/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to delete Success Story.");

      // Show success message or toast if you're using a library
      toast.success(data.message);
      alert("Activist Profile deleted successfully.");

      // Refresh data after deletion
      fetchUsers();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message || "Something went wrong while deleting");
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
  };

  const handleToggle = async (userMongoID, currentStatus) => {
    try {
      const updatedStatus = currentStatus === "enable" ? "disable" : "enable";

      const response = await fetch(
        `${BASE_URL}/api/v1/admin/updateActivist/${userMongoID}`,
        {
          method: "POST",
          headers: {
            ...headers, // keep Authorization
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access: updatedStatus,
          }),
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
          throw new Error(data.message || "Failed to update user.");
        }
      }

      if (data.status) {
        toast.success(data.message || "Status updated successfully!");
      } else {
        toast.error(data.message || "Failed to update status!");
      }

      setFilteredUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userMongoID ? { ...user, access: updatedStatus } : user
        )
      );
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  //pagination lo
  const totalPages = Math.ceil(filteredUsers.length / activistPerPage);
  const indexOfLastRecord = currentPage * activistPerPage;
  const indexOfFirstRecord = indexOfLastRecord - activistPerPage;
  const currentActivists = filteredUsers.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">
      <PageHeader title="Activist Profiles" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatsCard icon={FaUsers} title="Total Users" number={filteredUsers.length} />
          <StatsCard icon={FaCheckCircle} title="Active Users" number={filteredUsers.filter(user => user.userId?.access === "enable").length} />
          <StatsCard icon={FaTimesCircle} title="Inactive Users" number={filteredUsers.filter(user => user.userId?.access === "disable").length} />
        </div> */}
        <div className="flex justify-between mb-4">
          <div className="flex items-center gap-4 flex-wrap overflow-x-auto">
            <input
              type="text"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              placeholder="Search By ActivistId and FullName ...."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
            >
              <option value="">Filter by gender</option>
              {genderData.map((gender) => (
                <option key={gender.value} value={gender.value}>
                  {gender.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Locality"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
            />
            <input
              type="text"
              placeholder="Sub Caste"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={selectedSubcaste}
              onChange={(e) => setSelectedSubcaste(e.target.value)}
            />
            {/* <select
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Filter by status</option>
              {statusData.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select> */}

            <input
              type="date"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button
              className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          </div>
        </div>
        {/* Filter Result Count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredUsers.length} result
          {filteredUsers.length !== 1 && "s"}
        </div>

        {/* Buffering Spinner */}
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <FaSpinner className="animate-spin text-3xl text-slate-900" />
          </div>
        ) : (
          <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
            <thead className="bg-slate-900 text-slate-100">
              <tr>
                <th className="py-3 px-4 text-left">Photo</th>
                <th className="py-3 px-4 text-left">Activist ID</th>
                <th className="py-3 px-4 text-left">Full Name</th>
                <th className="py-3 px-4 text-left">Sub Caste</th>
                <th className="py-3 px-4 text-left">State</th>
                <th className="py-3 px-4 text-left">City</th>
                <th className="py-3 px-4 text-left">Gender</th>
                <th className="py-3 px-4 text-left">Mobile</th>
                <th className="py-3 px-4 text-left">Created At</th>
                <th className="py-3 px-4 text-left">Access</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentActivists.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-4 py-2 text-center bg-white">
                    No records available
                  </td>
                </tr>
              ) : (
                currentActivists.map((user, index) => (
                  <tr key={index} className="hover:bg-slate-100">
                    <td className="py-3 px-4">
                      {user.profilePhoto ? (
                        <img
                          src={getPhotoUrl(user.profilePhoto)}
                          alt="User"
                          className="w-10 h-10 rounded-full object-cover border cursor-pointer"
                          onClick={() => openImageModal(user.profilePhoto)}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder-image.png";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm text-white">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{user.activistId}</td>
                    <td className="py-3 px-4">{user.fullname}</td>
                    <td className="py-3 px-4">{user.subCaste}</td>
                    <td className="py-3 px-4">{user.state}</td>
                    <td className="py-3 px-4">{user.city}</td>
                    <td className="py-3 px-4">
                      {user.userId ? user.userId.gender : "N/A"}
                    </td>
                    <td className="py-3 px-4">{user.mobileNo}</td>
                    <td className="py-3 px-4">
                      {new Date(user.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-3 px-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={user.access === "enable"}
                          onChange={() => handleToggle(user._id, user.access)}
                        />
                        <span className="w-11 h-6 bg-slate-200 rounded-full inline-flex items-center">
                          <span
                            className={`w-4 h-4 rounded-full transform ${
                              user.access === "enable"
                                ? "translate-x-6 bg-green-500"
                                : "translate-x-1 bg-red-500"
                            }`}
                          ></span>
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-2  space-x-1">
                      <button
                        onClick={() => handleView(user._id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEdit(user._id)}
                        className="text-yellow-500 hover:text-yellow-700"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(user?.userId?._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ✅ Pagination Component */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        <Modal
          isOpen={showImageModal}
          onRequestClose={closeImageModal}
          title="Profile Image"
          className="bg-white rounded-2xl ml-20 p-2 my-8 shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div className="flex justify-center">
            <img
              src={BASE_URL + "/" + selectedImage}
              alt="Full View"
              className="h-auto max-h-[35vh] sm:max-h-[35vh] rounded-md shadow object-contain cursor-pointer"
              onClick={closeImageModal}
            />
          </div>
        </Modal>
      </div>
      {(selectedUser || viewLoading) && (
        <Modal
          isOpen={!!selectedUser || viewLoading}
          onRequestClose={closeModal}
          contentLabel="User Details"
          className="bg-white rounded-2xl p-6 sm:p-8 w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-4 sm:mx-auto my-8 shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2 ml-16"
        >
          {viewLoading ? (
            <div className="flex justify-center items-center h-48">
              <FaSpinner className="animate-spin text-4xl text-indigo-700" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              {/* Photo */}
              <div className="flex justify-center">
                {selectedUser.profilePhoto ? (
                  <img
                    src={selectedUser.profilePhoto}
                    alt="User Photo"
                    className="w-36 h-36 sm:w-48 sm:h-48 object-cover rounded-full shadow-md border-4 border-indigo-200"
                  />
                ) : (
                  <div className="w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center bg-gray-100 text-gray-400 rounded-full shadow-md">
                    No Photo
                  </div>
                )}
              </div>
              {/* Basic Info */}
              <section className="bg-gray-50 p-4 rounded-xl shadow-inner">
                <h3 className="text-lg font-bold text-indigo-700 mb-3">
                  Activist Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                  <div>
                    <strong>Activist ID:</strong> {selectedUser.activistId}
                  </div>
                  <div>
                    <strong>Username:</strong> {selectedUser.fullname}
                  </div>
                  <div>
                    <strong>Sub Caste:</strong> {selectedUser.subCaste}
                  </div>
                  <div>
                    <strong>Mobile No:</strong> {selectedUser.mobileNo}
                  </div>
                  <div>
                    <strong>Date of Birth:</strong>{" "}
                    {selectedUser.dob
                      ? new Date(selectedUser.dob).toLocaleDateString("en-GB")
                      : "N/A"}
                  </div>
                  <div>
                    <strong>Gender:</strong>{" "}
                    {selectedUser.user?.gender || selectedUser.gender || "N/A"}
                  </div>
                  <div>
                    <strong>State:</strong> {selectedUser.state}
                  </div>
                  <div>
                    <strong>City:</strong> {selectedUser.city}
                  </div>
                  <div>
                    <strong>Profile Creation:</strong>{" "}
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString(
                          "en-GB"
                        )
                      : "N/A"}
                  </div>
                  <div>
                    <strong>Engaged With Committee:</strong>{" "}
                    {selectedUser.engagedWithCommittee}
                  </div>
                  {selectedUser.knownActivistId && (
                    <div>
                      <strong>Known Activist:</strong>{" "}
                      {selectedUser.knownActivistId}
                    </div>
                  )}
                </div>
              </section>
              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-full shadow-md transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}

      <Modal
        isOpen={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
        contentLabel="Edit Activist"
        className="bg-white rounded-2xl p-6 sm:p-8 w-[95%] sm:max-w-2xl mx-auto my-8 shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2 ml-16"
      >
        <h2 className="text-lg sm:text-xl font-bold mb-4">
          Edit Activist Profile
        </h2>
        <form
          onSubmit={handleUpdate}
          className="space-y-4 text-sm sm:text-base"
          encType="multipart/form-data"
        >
          <input
            type="text"
            value={editForm.fullname || ""}
            onChange={(e) =>
              setEditForm({ ...editForm, fullname: e.target.value })
            }
            placeholder="Full Name"
            className="w-full p-2 border rounded"
            required
          />

          <select
            name="subCaste"
            required
            className="border p-2 rounded-md w-full"
            onChange={(e) =>
              setEditForm({ ...editForm, subCaste: e.target.value })
            }
            value={editForm.subCaste || ""}
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
            value={editForm.mobileNo || ""}
            onChange={(e) =>
              setEditForm({ ...editForm, mobileNo: e.target.value })
            }
            placeholder="Mobile No"
            className="w-full p-2 border rounded"
            required
          />

          <input
            type="date"
            value={editForm.dob || ""}
            onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
            className="w-full p-2 border rounded"
          />

          <input
            type="text"
            value={editForm.city || ""}
            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            placeholder="City"
            className="w-full p-2 border rounded"
          />

          <input
            type="text"
            value={editForm.state || ""}
            onChange={(e) =>
              setEditForm({ ...editForm, state: e.target.value })
            }
            placeholder="State"
            className="w-full p-2 border rounded"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setEditImage(file);
                setEditImagePreview(URL.createObjectURL(file));
              }
            }}
            className="w-full p-2 border rounded"
          />

          {(editImagePreview || editForm.profilePhoto) && (
            <img
              src={editImagePreview || `${IMAGE_URL}${editForm.profilePhoto}`}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-full mt-2"
            />
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-gray-200 rounded w-full sm:w-auto"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded w-full sm:w-auto"
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

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

export default ActivistProfiles;
