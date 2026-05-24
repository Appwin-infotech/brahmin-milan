import React, { useState, useEffect } from "react";
import PageHeader from "../components/common/PageHeader";
import { FaEdit, FaSpinner, FaTrashAlt } from "react-icons/fa";
import StatsCard from "../components/common/StatsCard";
import {
  FaUsers,
  FaHeart,
  FaPray,
  FaBookOpen,
  FaStar,
  FaEye,
} from "react-icons/fa";
import UserProfileCell from "../components/userProfileCell/UserProfileCell";
import { BASE_URL, IMAGE_URL } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination"; // ✅ Reusable Pagination component
import Modal from "react-modal";
import { User, UserIcon } from "lucide-react";

const UserManagementPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  //image open modal
  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : {};
  };

  const headers = getAuthHeaders();

  const genderData = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
  ];

  const statusData = [
    { label: "Enabled", value: "enable" },
    { label: "Disabled", value: "disable" },
  ];

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/admin/getAllUsers`, {
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
      setUsers(data.data);
      setFilteredUsers(data.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (userMongoID, currentStatus) => {
    try {
      const updatedStatus = currentStatus === "enable" ? "disable" : "enable";

      const response = await fetch(
        `${BASE_URL}/api/v1/admin/updateUser/${userMongoID}/access`,
        {
          method: "POST",
          headers: headers,
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

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userMongoID ? { ...user, access: updatedStatus } : user
        )
      );
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.mobileNo.includes(searchQuery)
      );
    }

    if (selectedGender) {
      filtered = filtered.filter((user) => user.gender === selectedGender);
    }

    if (selectedStatus) {
      filtered = filtered.filter((user) => user.access === selectedStatus);
    }

    if (startDate && endDate) {
      filtered = filtered.filter((user) => {
        const userDate = new Date(user.createdAt);
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);
        return userDate >= startDateObj && userDate <= endDateObj;
      });
    }

    setFilteredUsers(filtered);
    // setCurrentPage(1); // Reset to first page when filters change
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedGender("");
    setSelectedStatus("");
    setCurrentPage(1);
  };

  const getCategoryCount = (category) => {
    return users.filter((user) => user[category] === true).length;
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedGender, selectedStatus, startDate, endDate, users]);

  //pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  useEffect(() => {
    const savedPage = localStorage.getItem("userCurrentPage");
    if (savedPage) {
      setCurrentPage(Number(savedPage)); // set to page 45, for example
      localStorage.removeItem("userCurrentPage"); // optional
    }
  }, []);

  const handleView = (id) => {
    const filteredUser = filteredUsers.find((user) => user._id === id);
    setSelectedUser(filteredUser);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/updateUser/${editingUser.userId}`,
        {
          method: "PUT",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editingUser),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update user");

      toast.success("User updated successfully");
      setIsEditModalOpen(false);
      fetchUsers(); // Refresh the user list
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this User Profile?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/delete-User/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to delete user profile.");

      // Show success message or toast if you're using a library
      alert("User profile deleted successfully.");

      // Refresh data after deletion
      fetchUsers();
      filterUsers();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message || "Something went wrong while deleting");
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
  };

  if (loading)
    return (
      <div>
        {loading ? (
          <div className="flex justify-center items-center mt-60 py-10">
            <FaSpinner className="animate-spin  text-3xl text-white" />
            <span
              className="text-white font-extrabold text-2xl pl-5
        "
            >
              Loading
            </span>
          </div>
        ) : (
          // Data display part, e.g., table or any other component
          <div className="data-display">
            {/* Example Data Rendering */}
            {filteredUsers.length > 0 ? (
              <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
                {/* Table header and body */}
              </table>
            ) : (
              <div className="text-center py-10 text-slate-700">
                No data found.
              </div>
            )}
          </div>
        )}
      </div>
    );

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">
      <PageHeader title="User Management" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatsCard icon={FaUsers} title="Total Users" number={users.length} />
          <StatsCard
            icon={FaHeart}
            title="Matrimony Users"
            number={getCategoryCount("isMatrimonial")}
          />
          <StatsCard
            icon={FaPray}
            title="Pandits"
            number={getCategoryCount("isPandit")}
          />
          <StatsCard
            icon={FaBookOpen}
            title="Kathavachaks"
            number={getCategoryCount("isKathavachak")}
          />
          <StatsCard
            icon={FaStar}
            title="Jyotish"
            number={getCategoryCount("isJyotish")}
          />
          <StatsCard
            icon={FaEye}
            title="Activists"
            number={getCategoryCount("isActivist")}
          />
        </div>

        {/* Filters Section */}
        <div className="flex flex-wrap gap-4 mb-4 overflow-x-auto">
          <input
            type="text"
            placeholder="Search by Name, City, or Mobile"
            className="p-2 border rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="p-2 border rounded-md"
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
          >
            <option value="">All Genders</option>
            {genderData.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <select
            className="p-2 border rounded-md"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statusData.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              className="p-2 border rounded-md w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="p-2 border rounded-md w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={resetFilters}
            className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Reset Filters
          </button>
        </div>
        {/* Filter Result Count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredUsers.length} result
          {filteredUsers.length !== 1 && "s"}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
            <thead className="bg-slate-900 text-slate-100">
              <tr>
                <th className="py-3 px-4 text-left">Photo</th>
                <th className="py-3 px-4 text-left">User ID</th>
                <th className="py-3 px-4 text-left">Full Name</th>
                <th className="py-3 px-4 text-left">City</th>
                <th className="py-3 px-4 text-left">Gender</th>
                <th className="py-3 px-4 text-left">Mobile</th>
                <th className="py-3 px-4 text-left">Created At</th>
                <th className="py-3 px-4 text-left">Access</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : currentUsers.length > 0 ? (
                currentUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-slate-100">
                    <td className="py-3 px-4">
                      {user.photoUrl?.[0] ? (
                        <img
                          src={IMAGE_URL + user.photoUrl[0]}
                          alt="User"
                          className="w-10 h-10 rounded-full object-cover border cursor-pointer"
                          onClick={() => openImageModal(user.photoUrl)}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer"
                          onClick={() => openImageModal(null)}
                        >
                          <UserIcon size={16} className="text-gray-600" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{user.userId}</td>
                    <UserProfileCell user={user} currentPage={currentPage} />
                    <td className="py-3 px-4">{user.city}</td>
                    <td className="py-3 px-4">{user.gender}</td>
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
                    <td className="px-4 py-2  space-x-2">
                      <button
                        onClick={() => handleView(user._id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-yellow-500 hover:text-yellow-700"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="13" className="px-4 py-2 text-center bg-white">
                    No Users Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Modal
          isOpen={showImageModal}
          onRequestClose={closeImageModal}
          title="Profile Image"
          className="bg-white rounded-xl md:p-4 ml-20 p-2 sm:p-8 mx-2 sm:mx-auto my-8 shadow-xl outline-none md:max-w-[95vw] md:max-h-[90vh] overflow-y-auto"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2"
        >
          <div className="flex justify-center items-center">
            {selectedImage ? (
              <img
                src={IMAGE_URL + selectedImage}
                alt="Full View"
                className="h-auto max-h-[35vh] sm:max-h-[80vh] rounded-md shadow object-contain cursor-pointer"
                onClick={closeImageModal}
              />
            ) : (
              <div className="w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center bg-gray-100 rounded-md shadow">
                <UserIcon size={48} className="text-gray-400" />
              </div>
            )}
          </div>
        </Modal>

        {/* ✅ Pagination Component */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onRequestClose={closeModal}
          contentLabel="User Details"
          className="w-full max-w-screen-md mx-auto my-6 p-4 sm:p-6 md:p-8 bg-white rounded-2xl shadow-2xl outline-none max-h-[85vh] overflow-y-auto"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 ml-16"
        >
          <div className="space-y-6">
            {/* Photo */}
            <div className="flex justify-center">
              {selectedUser.photoUrl?.[0] ? (
                <img
                  src={IMAGE_URL + selectedUser.photoUrl[0]}
                  alt="User Photo"
                  className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 object-cover rounded-full shadow-md border-4 border-indigo-200"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 flex items-center justify-center bg-gray-100 text-gray-400 rounded-full shadow-md">
                  No Photo
                </div>
              )}
            </div>

            {/* Basic Info */}
            <section className="bg-gray-50 p-4 rounded-xl shadow-inner">
              <h3 className="text-lg font-bold text-indigo-700 mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                <div>
                  <strong>User ID:</strong> {selectedUser.userId}
                </div>
                <div>
                  <strong>Username:</strong> {selectedUser.username}
                </div>
                <div>
                  <strong>Mobile No:</strong> {selectedUser.mobileNo}
                </div>
                <div>
                  <strong>Gender:</strong> {selectedUser.gender}
                </div>
                <div>
                  <strong>City:</strong> {selectedUser.city}
                </div>
                <div>
                  <strong>Date of Birth:</strong>{" "}
                  {new Date(selectedUser.dob).toLocaleDateString()}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span className="capitalize">{selectedUser.access}</span>
                </div>
              </div>
            </section>

            {/* Roles */}
            <section className="bg-indigo-50 p-4 rounded-xl shadow-inner">
              <h3 className="text-lg font-bold text-indigo-700 mb-3">
                Profile Roles
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-gray-800">
                <div>
                  <strong>Pandit:</strong>{" "}
                  {selectedUser.isPandit ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Jyotish:</strong>{" "}
                  {selectedUser.isJyotish ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Kathavachak:</strong>{" "}
                  {selectedUser.isKathavachak ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Activist:</strong>{" "}
                  {selectedUser.isActivist ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Matrimonial:</strong>{" "}
                  {selectedUser.isMatrimonial ? "Yes" : "No"}
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-gray-50 p-4 rounded-xl shadow-inner">
              <h3 className="text-lg font-bold text-indigo-700 mb-3">
                Notification Preferences
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
                <div>
                  <strong>Event Post Notification:</strong>{" "}
                  {selectedUser.eventPostNotification ? "Enabled" : "Disabled"}
                </div>
                <div>
                  <strong>Connection Request Notification:</strong>{" "}
                  {selectedUser.connReqNotification ? "Enabled" : "Disabled"}
                </div>
              </div>
            </section>

            {/* Subscriptions */}
            <section className="bg-indigo-50 p-4 rounded-xl shadow-inner">
              <h3 className="text-lg font-bold text-indigo-700 mb-3">
                Service Subscriptions
              </h3>
              {selectedUser.serviceSubscriptions?.length > 0 ? (
                <ul className="list-disc ml-5 text-gray-800 space-y-1">
                  {selectedUser.serviceSubscriptions.map((sub, index) => (
                    <li key={index}>
                      <span className="font-semibold">{sub.serviceType}</span> –{" "}
                      {sub.subscriptionType} ({sub.status}), Trial:{" "}
                      {sub.trialPeriod} days, Duration: {sub.duration} days
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No subscriptions found.</p>
              )}
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
        </Modal>
      )}

      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        className="w-[90vw] sm:w-[80vw] md:w-[60vw] lg:w-[50vw] xl:w-[40vw] max-w-2xl mx-auto mt-20 bg-white p-4 sm:p-6 rounded-2xl shadow-lg overflow-y-auto max-h-[90vh]"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2 ml-20"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center">
          Edit User Profile
        </h2>

        {editingUser && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* User ID */}
            <div>
              <label className="block text-sm font-medium">User ID</label>
              <input
                type="text"
                value={editingUser.userId}
                disabled
                className="w-full p-2 border rounded bg-gray-100"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium">Username</label>
              <input
                type="text"
                value={editingUser.username}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, username: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-medium">Mobile Number</label>
              <input
                type="text"
                value={editingUser.mobileNo}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, mobileNo: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium">City</label>
              <input
                type="text"
                value={editingUser.city}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, city: e.target.value })
                }
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium">Gender</label>
              <select
                value={editingUser.gender}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, gender: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
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

export default UserManagementPage;
