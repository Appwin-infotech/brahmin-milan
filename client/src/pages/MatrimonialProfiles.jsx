// import React, { useState, useEffect } from "react";
// import PageHeader from "../components/common/PageHeader";
// import { Link, useNavigate } from "react-router-dom";
// import {
//   FaMale,
//   FaFemale,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaSpinner,
//   FaTrashAlt,
// } from "react-icons/fa";
// import StatsCard from "../components/common/StatsCard";
// import axios from "axios";
// import { BASE_URL } from "../utils/constants";
// import { toast, ToastContainer } from "react-toastify";
// import Pagination from "../components/common/Pagination";

// const genderData = [
//   { label: "Male", value: "male" },
//   { label: "Female", value: "female" },
// ];

// const statusData = [
//   { label: "Enabled", value: true },
//   { label: "Disabled", value: false },
// ];

// const subscriptionData = [
//   { label: "Active", value: "Active" },
//   { label: "Pending", value: "Pending" },
//   { label: "Expired", value: "Expired" },
// ];

// const MatrimonialProfiles = () => {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filteredUsers, setFilteredUsers] = useState([]);
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [selectedGender, setSelectedGender] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState("");
//   const [selectedSubscription, setSelectedSubscription] = useState("");
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [currentPage, setCurrentPage] = useState(1);
//   const profilesPerPage = 10;
//    const navigate = useNavigate(); // Hook for redirection
//   const getAuthHeaders = () => {
//     const token = localStorage.getItem("authToken");
//     return token
//       ? {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         }
//       : {};
//   };

//   const headers = getAuthHeaders();

//   const fetchUsers = async () => {
//     try {
//       const response = await fetch(
//         `${BASE_URL}/api/v1/admin/getAllMetrionial`,
//         {
//           method: "GET",
//           headers: headers,
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         if (data.error === "Token expired") {
//           alert("Session expired. Please login again.");
//           localStorage.clear();
//           window.location.href = "/login";
//           return;
//         } else {
//           throw new Error(data.message || "Failed to fetch users.");
//         }
//       }

//       if (data.status) {
//         setUsers(data.data);
//         setFilteredUsers(data.data);
//       }
//     } catch (error) {
//       console.error("Error fetching data", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchUsers();
//   }, []);

//   const filterUsers = (query, start, end, gender, status, subscription) => {
//     let filtered = users.filter(
//       (user) =>
//         user.personalDetails.fullname
//           .toLowerCase()
//           .includes(query.toLowerCase()) ||
//         user.bioDataId.toLowerCase().includes(query.toLowerCase()) ||
//         user.personalDetails.currentCity
//           .toLowerCase()
//           .includes(query.toLowerCase()) ||
//         user.personalDetails.contactNumber1
//           .toLowerCase()
//           .includes(query.toLowerCase()) ||
//         user.personalDetails.subCaste
//           .toLowerCase()
//           .includes(query.toLowerCase())
//     );

//     if (start && end) {
//       filtered = filtered.filter((user) => {
//         const createdAt = new Date(user.createdAt);
//         const startDateObj = new Date(start);
//         const endDateObj = new Date(end);
//         startDateObj.setHours(0, 0, 0, 0);
//         endDateObj.setHours(23, 59, 59, 999);
//         return createdAt >= startDateObj && createdAt <= endDateObj;
//       });
//     }

//     if (gender) {
//       filtered = filtered.filter((user) => user.gender === gender);
//     }

//     if (status !== "") {
//       filtered = filtered.filter(
//         (user) =>
//           user.activityStatus === (status === "true" ? "Active" : "Inactive")
//       );
//     }

//     if (subscription) {
//       filtered = filtered.filter((user) => {
//         return user.userId?.serviceSubscriptions?.some(
//           (subscriptionItem) => subscriptionItem.status === subscription
//         );
//       });
//     }

//     setFilteredUsers(filtered);
//     setCurrentPage(1); // Reset to first page on filter
//   };

//   useEffect(() => {
//     const handleNewBioData = (e) => {
//       const newRequest = e.detail;

//       if (!newRequest || !newRequest._id) return; // fallback will handle

//       setUsers((prev) => [newRequest, ...prev]);
//       setFilteredUsers((prev) => [newRequest, ...prev]);
//     };

//     window.addEventListener("new-biodata", handleNewBioData);
//     return () => {
//       window.removeEventListener("new-biodata", handleNewBioData);
//     };
//   }, []);

//   const handleDelete = async (bioDataId) => {
//     if (
//       window.confirm(
//         "Are you sure you want to delete this matrimonial profile?"
//       )
//     ) {
//       try {
//         const response = await axios.delete(
//           `${BASE_URL}/api/v1/admin/deleteBiodata/${bioDataId}`,
//           { headers: getAuthHeaders() }
//         );
//         if (response.data.status) {
//           toast.success("Matrimonial profile deleted successfully.");
//           // Remove from state
//           setUsers(users.filter((user) => user.bioDataId !== bioDataId));
//           setFilteredUsers(
//             filteredUsers.filter((user) => user.bioDataId !== bioDataId)
//           );
//         } else {
//           toast.error(
//             response.data.message || "Failed to delete matrimonial profile."
//           );
//         }
//       } catch (error) {
//         console.error(
//           "Error deleting matrimonial profile:",
//           error.response?.data?.message || error.message
//         );
//         toast.error(
//           error.response?.data?.message ||
//             "Failed to delete matrimonial profile."
//         );
//       }
//     }
//   };

//   const handleSearch = (e) => {
//     setSearchQuery(e.target.value);
//     filterUsers(
//       e.target.value,
//       startDate,
//       endDate,
//       selectedGender,
//       selectedStatus,
//       selectedSubscription
//     );
//   };

//   const handleDateFilter = (start, end) => {
//     setStartDate(start);
//     setEndDate(end);
//     filterUsers(
//       searchQuery,
//       start,
//       end,
//       selectedGender,
//       selectedStatus,
//       selectedSubscription
//     );
//   };

//   const handleGenderFilter = (e) => {
//     setSelectedGender(e.target.value);
//     filterUsers(
//       searchQuery,
//       startDate,
//       endDate,
//       e.target.value,
//       selectedStatus,
//       selectedSubscription
//     );
//   };

//   const handleStatusFilter = (e) => {
//     setSelectedStatus(e.target.value);
//     filterUsers(
//       searchQuery,
//       startDate,
//       endDate,
//       selectedGender,
//       e.target.value,
//       selectedSubscription
//     );
//   };

//   const handleSubscriptionFilter = (e) => {
//     setSelectedSubscription(e.target.value);
//     filterUsers(
//       searchQuery,
//       startDate,
//       endDate,
//       selectedGender,
//       selectedStatus,
//       e.target.value
//     );
//   };

//   const handleResetFilters = () => {
//     setSearchQuery("");
//     setStartDate("");
//     setEndDate("");
//     setSelectedGender("");
//     setSelectedStatus("");
//     setSelectedSubscription("");
//     setFilteredUsers(users);
//     setCurrentPage(1);
//   };

// const handleToggle = async (index) => {
//   const indexOfFirstRecord = (currentPage - 1) * profilesPerPage;
//   const globalIndex = indexOfFirstRecord + index;

//   const updatedUsers = [...filteredUsers];
//   const user = updatedUsers[globalIndex];

//   const newStatus = user.activityStatus === "Active" ? "Inactive" : "Active";
//   user.activityStatus = newStatus;
//   setFilteredUsers(updatedUsers);

//   try {
//     const response = await fetch(
//       `${BASE_URL}/api/v1/admin/setMetrionial_ActivityStatus`,
//       {
//         method: "PATCH",
//         headers: headers,
//         body: JSON.stringify({
//           bioDataId: user?.bioDataId,
//           activityStatus: newStatus,
//         }),
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       if (data.error === "Token expired") {
//         alert("Session expired. Please login again.");
//         localStorage.clear();
//         window.location.href = "/login";
//         return;
//       } else {
//         throw new Error(data.message || "Failed to update user.");
//       }
//     }

//     if (data.status) {
//       toast.success(data.message || "Status updated successfully!");
//     } else {
//       user.activityStatus =
//         user.activityStatus === "Active" ? "Inactive" : "Active";
//       setFilteredUsers(updatedUsers);
//       toast.error(data.message || "Failed to update status!");
//     }
//   } catch (error) {
//     user.activityStatus =
//       user.activityStatus === "Active" ? "Inactive" : "Active";
//     setFilteredUsers(updatedUsers);
//     toast.error("Failed to update status, please try again!");
//   }
// };

//   //pagination
//   const totalPages = Math.ceil(filteredUsers.length / profilesPerPage);
//   const indexOfLastRecord = currentPage * profilesPerPage;
//   const indexOfFirstRecord = indexOfLastRecord - profilesPerPage;
//   const currentProfiles = filteredUsers.slice(
//     indexOfFirstRecord,
//     indexOfLastRecord
//   );

//   const handlePageChange = (page) => {
//     setCurrentPage(page);
//   };

//   // Redirect to User Profile or Reported Profile
// const handleProfileClick = (profileId, currentPage) => {
//   // Store the current page in localStorage
//   localStorage.setItem("metrimonyCurrentPage", currentPage);

//    let url = `/profile/${profileId}`;

//     // window.location.href = url; // Navigate to the correct profile page
//     navigate(url)
//   };

//   useEffect(() => {
//     const savedPage = localStorage.getItem("metrimonyCurrentPage");
//     if (savedPage) {
//       setCurrentPage(Number(savedPage)); // set to page 45, for example
//       localStorage.removeItem("metrimonyCurrentPage"); // optional
//     }
//   }, []);

//   if (loading)
//     return (
//       <div>
//         {loading ? (
//           <div className="flex justify-center items-center mt-60 py-10">
//             <FaSpinner className="animate-spin  text-3xl text-white" />
//             <span
//               className="text-white font-extrabold text-2xl pl-5
//       "
//             >
//               Loading
//             </span>
//           </div>
//         ) : (
//           // Data display part, e.g., table or any other component
//           <div className="data-display">
//             {/* Example Data Rendering */}
//             {filteredUsers.length > 0 ? (
//               <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
//                 {/* Table header and body */}
//               </table>
//             ) : (
//               <div className="text-center py-10 text-slate-700">
//                 No data found.
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     );

//   return (
//     <div className="min-h-screen sm:p-2 md:p-8 pt-0">
//       <PageHeader title="Matrimonial Profiles" />
//       <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
//         {/* Stats */}
//         <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
//           <StatsCard
//             icon={FaMale}
//             title="Male Users"
//             number={users.filter((user) => user.gender === "male").length}
//           />
//           <StatsCard
//             icon={FaFemale}
//             title="Female Users"
//             number={users.filter((user) => user.gender === "female").length}
//           />
//           <StatsCard
//             icon={FaCheckCircle}
//             title="Active Users"
//             number={
//               users.filter((user) => user.activityStatus === "Active").length
//             }
//           />
//           <StatsCard
//             icon={FaTimesCircle}
//             title="Inactive Users"
//             number={
//               users.filter((user) => user.activityStatus === "Inactive").length
//             }
//           />
//         </div>

//         {/* Filters */}
//         <div className="flex justify-between mb-4 flex-wrap gap-2 overflow-x-auto">
//           <input
//             type="text"
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             placeholder="Search by Name.. Mobile.. userId.. city.."
//             value={searchQuery}
//             onChange={handleSearch}
//           />
//           <select
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={selectedGender}
//             onChange={handleGenderFilter}
//           >
//             <option value="">Filter by gender</option>
//             {genderData.map((gender) => (
//               <option key={gender.value} value={gender.value}>
//                 {gender.label}
//               </option>
//             ))}
//           </select>
//           <select
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={selectedStatus}
//             onChange={handleStatusFilter}
//           >
//             <option value="">Filter by status</option>
//             {statusData.map((status) => (
//               <option key={status.value} value={status.value}>
//                 {status.label}
//               </option>
//             ))}
//           </select>
//           <select
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={selectedSubscription}
//             onChange={handleSubscriptionFilter}
//           >
//             <option value="">Filter by subscription</option>
//             {subscriptionData.map((subscription) => (
//               <option key={subscription.value} value={subscription.value}>
//                 {subscription.label}
//               </option>
//             ))}
//           </select>
//           <input
//             type="date"
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={startDate}
//             onChange={(e) => handleDateFilter(e.target.value, endDate)}
//             placeholder=""
//           />
//           <input
//             type="date"
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={endDate}
//             onChange={(e) => handleDateFilter(startDate, e.target.value)}
//           />
//           <button
//             className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
//             onClick={handleResetFilters}
//           >
//             Reset Filters
//           </button>
//         </div>

//         {/* Filter Result Count */}
//         <div className="mb-4 text-gray-700 font-medium">
//           Showing {filteredUsers.length} result
//           {filteredUsers.length !== 1 && "s"}
//         </div>

//         {/* Table */}

//         <div className="w-full overflow-x-auto custom-scroll">
//           <table className="min-w-full table-auto text-nowrap bg-slate-50 rounded-lg shadow-md overflow-hidden">
//             <thead className="bg-slate-900 text-slate-100">
//               <tr>
//                 <th className="py-3 px-4 text-left">User ID</th>
//                 <th className="py-3 px-4 text-left">Full Name</th>
//                 <th className="py-3 px-4 text-left">Sub Caste</th>
//                 <th className="py-3 px-4 text-left">City</th>
//                 <th className="py-3 px-4 text-left">Gender</th>
//                 <th className="py-3 px-4 text-left">Mobile</th>
//                 <th className="py-3 px-4 text-left">Created At</th>
//                 <th className="py-3 px-4 text-left">Subscription-Type</th>
//                 <th className="py-3 px-4 text-left">Subscription-Dates</th>
//                 <th className="py-3 px-4 text-left">Status</th>
//                 <th className="py-3 px-4 text-left">Actions</th>
//                 <th className="py-3 px-4 text-left">Operations</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentProfiles.length === 0 ? (
//                 <tr>
//                   <td colSpan="13" className="px-4 py-2 text-center">
//                     No records available
//                   </td>
//                 </tr>
//               ) : (
//                 currentProfiles.map((user, index) => (
//                   <tr key={user.userId}>
//                     <td className="py-3 px-4">{user.bioDataId}</td>
//                     <td className="py-3 px-4 text-blue-500 hover:underline" onClick={() =>
//                       handleProfileClick(
//                         user?.bioDataId,currentPage
//                       )
//                     }>
//                         {user.personalDetails.fullname}
//                     </td>
//                     <td className="py-3 px-4">
//                       {user.personalDetails.subCaste}
//                     </td>
//                     <td className="py-3 px-4">
//                       {user.personalDetails.currentCity}
//                     </td>
//                     <td className="py-3 px-4">
//                       {user.gender === "male" ? "Male" : "Female"}
//                     </td>
//                     <td className="py-3 px-4">
//                       {user.personalDetails.contactNumber1}
//                     </td>
//                     <td className="py-3 px-4">
//                       {new Date(user.createdAt).toLocaleDateString("en-GB")}
//                     </td>
//                     <td className="py-3 px-12 text-center">
//                       {(() => {
//                         const biodataSub =
//                           user.userId?.serviceSubscriptions?.find(
//                             (sub) => sub.serviceType === "Biodata"
//                           );
//                         const subscriptionType =
//                           biodataSub?.subscriptionType || "N/A";
//                         const status = biodataSub?.status || "N/A";

//                         const getStatusClass = (status) => {
//                           switch (status) {
//                             case "Active":
//                               return "text-green-800";
//                             case "Pending":
//                               return "text-yellow-800";
//                             case "Expired":
//                               return "text-red-800";
//                             default:
//                               return "text-gray-800";
//                           }
//                         };

//                         return (
//                           <div className="flex flex-col items-center gap-1">
//                             <span className="text-sm font-semibold">
//                               {subscriptionType}
//                             </span>
//                             <span
//                               className={`text-sm font-medium ${getStatusClass(
//                                 status
//                               )}`}
//                             >
//                               {status}
//                             </span>
//                           </div>
//                         );
//                       })()}
//                     </td>
//                     <td className="py-3 text-center text-sm text-gray-700">
//                       {(() => {
//                         const biodataSub =
//                           user.userId?.serviceSubscriptions?.find(
//                             (sub) => sub.serviceType === "Biodata"
//                           );
//                         const startDate = biodataSub?.startDate;
//                         const endDate = biodataSub?.endDate;

//                         const formatDate = (date) => {
//                           return date
//                             ? new Date(date).toLocaleDateString("en-GB", {
//                                 day: "2-digit",
//                                 month: "short",
//                                 year: "numeric",
//                               })
//                             : "N/A";
//                         };

//                         return (
//                           <>
//                             <span className="text-green-600 font-medium">
//                               {formatDate(startDate)}
//                             </span>
//                             {" - "}
//                             <span className="text-red-600 font-medium">
//                               {formatDate(endDate)}
//                             </span>
//                           </>
//                         );
//                       })()}
//                     </td>
//                     <td className="py-3 px-4">
//                       <span
//                         className={`px-2 py-1 rounded-full ${
//                           user.activityStatus === "Active"
//                             ? "bg-green-500 text-white"
//                             : "bg-red-500 text-white"
//                         }`}
//                       >
//                         {user.activityStatus}
//                       </span>
//                     </td>
//                     <td className="py-3 px-4">
//                       <label className="relative inline-flex items-center cursor-pointer">
//                         <input
//                           type="checkbox"
//                           className="sr-only"
//                           checked={user.activityStatus === "Active"}
//                           onChange={() => handleToggle(index)}
//                         />
//                         <span className="w-11 h-6 bg-slate-200 rounded-full inline-flex items-center">
//                           <span
//                             className={`w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
//                               user.activityStatus === "Active"
//                                 ? "translate-x-6 bg-green-500"
//                                 : "translate-x-1 bg-red-500"
//                             }`}
//                           ></span>
//                         </span>
//                       </label>
//                     </td>
//                     <td className="py-3 px-10">
//                       <button
//                         onClick={() => handleDelete(user.bioDataId)}
//                         className="text-red-500 hover:text-red-700"
//                       >
//                         <FaTrashAlt />
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//         {/* Pagination */}
//         {totalPages > 1 && (
//           <div className="mt-4 flex justify-center">
//             <Pagination
//               currentPage={currentPage}
//               totalPages={totalPages}
//               onPageChange={handlePageChange}
//             />
//           </div>
//         )}
//       </div>

//       <ToastContainer position="top-right" autoClose={5000} />
//     </div>
//   );
// };

// export default MatrimonialProfiles;

import React, { useState, useEffect } from "react";
import PageHeader from "../components/common/PageHeader";
import { Link, useNavigate } from "react-router-dom";
import {
  FaMale,
  FaFemale,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaTrashAlt,
} from "react-icons/fa";
import StatsCard from "../components/common/StatsCard";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";

const genderData = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const statusData = [
  { label: "Enabled", value: true },
  { label: "Disabled", value: false },
];

const subscriptionData = [
  { label: "Active", value: "Active" },
  { label: "Pending", value: "Pending" },
  { label: "Expired", value: "Expired" },
];

// ─── Date Range Modal ─────────────────────────────────────────────────────────
// Opens only when activating an Inactive profile.
// Does NOT change any existing UI — it's a new overlay only.

const DateRangeModal = ({ onConfirm, onCancel }) => {
  const today = new Date().toISOString().split("T")[0];
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!start || !end) {
      setError("Please select both start and end date.");
      return;
    }
    if (new Date(start) >= new Date(end)) {
      setError("End date must be after start date.");
      return;
    }
    if (new Date(end) <= new Date()) {
      setError("End date must be in the future.");
      return;
    }
    onConfirm(start, end);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Activate Profile
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Select the activation date range for this profile.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Start Date
            </label>
            <input
              type="date"
              value={start}
              min={today}
              onChange={(e) => {
                setStart(e.target.value);
                setError("");
              }}
              className="w-full p-2 border rounded-md bg-slate-100 text-slate-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              End Date
            </label>
            <input
              type="date"
              value={end}
              min={start || today}
              onChange={(e) => {
                setEnd(e.target.value);
                setError("");
              }}
              className="w-full p-2 border rounded-md bg-slate-100 text-slate-900"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            Activate
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MatrimonialProfiles = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;
  const navigate = useNavigate();

  // ── Date range modal state ─────────────────────────────────────────────────
  const [pendingToggleIndex, setPendingToggleIndex] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : {};
  };

  const headers = getAuthHeaders();

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/getAllMetrionial`,
        {
          method: "GET",
          headers,
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
        setUsers(data.data);
        setFilteredUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filterUsers = (query, start, end, gender, status, subscription) => {
    let filtered = users.filter(
      (user) =>
        user.personalDetails.fullname
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        user.bioDataId.toLowerCase().includes(query.toLowerCase()) ||
        user.personalDetails.currentCity
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        user.personalDetails.contactNumber1
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        user.personalDetails.subCaste
          .toLowerCase()
          .includes(query.toLowerCase())
    );

    if (start && end) {
      filtered = filtered.filter((user) => {
        const createdAt = new Date(user.createdAt);
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);
        return createdAt >= startDateObj && createdAt <= endDateObj;
      });
    }

    if (gender) filtered = filtered.filter((user) => user.gender === gender);

    if (status !== "") {
      filtered = filtered.filter(
        (user) =>
          user.activityStatus === (status === "true" ? "Active" : "Inactive")
      );
    }

    if (subscription) {
      filtered = filtered.filter((user) =>
        user.userId?.serviceSubscriptions?.some(
          (s) => s.status === subscription
        )
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    const handleNewBioData = (e) => {
      const newRequest = e.detail;
      if (!newRequest || !newRequest._id) return;
      setUsers((prev) => [newRequest, ...prev]);
      setFilteredUsers((prev) => [newRequest, ...prev]);
    };
    window.addEventListener("new-biodata", handleNewBioData);
    return () => window.removeEventListener("new-biodata", handleNewBioData);
  }, []);

  const handleDelete = async (bioDataId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this matrimonial profile?"
      )
    )
      return;
    try {
      const response = await axios.delete(
        `${BASE_URL}/api/v1/admin/deleteBiodata/${bioDataId}`,
        { headers: getAuthHeaders() }
      );
      if (response.data.status) {
        toast.success("Matrimonial profile deleted successfully.");
        setUsers(users.filter((u) => u.bioDataId !== bioDataId));
        setFilteredUsers(
          filteredUsers.filter((u) => u.bioDataId !== bioDataId)
        );
      } else {
        toast.error(
          response.data.message || "Failed to delete matrimonial profile."
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete matrimonial profile."
      );
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    filterUsers(
      e.target.value,
      startDate,
      endDate,
      selectedGender,
      selectedStatus,
      selectedSubscription
    );
  };

  const handleDateFilter = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    filterUsers(
      searchQuery,
      start,
      end,
      selectedGender,
      selectedStatus,
      selectedSubscription
    );
  };

  const handleGenderFilter = (e) => {
    setSelectedGender(e.target.value);
    filterUsers(
      searchQuery,
      startDate,
      endDate,
      e.target.value,
      selectedStatus,
      selectedSubscription
    );
  };
  const handleStatusFilter = (e) => {
    setSelectedStatus(e.target.value);
    filterUsers(
      searchQuery,
      startDate,
      endDate,
      selectedGender,
      e.target.value,
      selectedSubscription
    );
  };
  const handleSubscriptionFilter = (e) => {
    setSelectedSubscription(e.target.value);
    filterUsers(
      searchQuery,
      startDate,
      endDate,
      selectedGender,
      selectedStatus,
      e.target.value
    );
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setSelectedGender("");
    setSelectedStatus("");
    setSelectedSubscription("");
    setFilteredUsers(users);
    setCurrentPage(1);
  };

  // ── Toggle handler ─────────────────────────────────────────────────────────
  // If profile is Active   → deactivate immediately (no modal needed)
  // If profile is Inactive → open date modal first, then activate

  const handleToggle = (index) => {
    const indexOfFirstRecord = (currentPage - 1) * profilesPerPage;
    const globalIndex = indexOfFirstRecord + index;
    const user = filteredUsers[globalIndex];

    if (user.activityStatus === "Active") {
      // Deactivate immediately — no date needed
      doToggle(globalIndex, null, null);
    } else {
      // Inactive → open calendar modal
      setPendingToggleIndex(globalIndex);
      setShowDateModal(true);
    }
  };

  // Called after modal confirms dates (or directly for deactivation)
  const doToggle = async (globalIndex, activateStart, activateEnd) => {
    const updatedUsers = [...filteredUsers];
    const user = updatedUsers[globalIndex];

    const newStatus = user.activityStatus === "Active" ? "Inactive" : "Active";
    user.activityStatus = newStatus;
    setFilteredUsers(updatedUsers);

    try {
      const body = { bioDataId: user.bioDataId };
      if (newStatus === "Active" && activateStart && activateEnd) {
        body.startDate = activateStart;
        body.endDate = activateEnd;
      }

      const response = await fetch(
        `${BASE_URL}/api/v1/admin/setMetrionial_ActivityStatus`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        throw new Error(data.message || "Failed to update user.");
      }

      if (data.status) {
        toast.success(data.message || "Status updated successfully!");
      } else {
        // Rollback
        user.activityStatus =
          user.activityStatus === "Active" ? "Inactive" : "Active";
        setFilteredUsers([...updatedUsers]);
        toast.error(data.message || "Failed to update status!");
      }
    } catch (error) {
      // Rollback
      user.activityStatus =
        user.activityStatus === "Active" ? "Inactive" : "Active";
      setFilteredUsers([...updatedUsers]);
      toast.error("Failed to update status, please try again!");
    }
  };

  // Modal confirm — user picked dates
  const handleModalConfirm = (start, end) => {
    setShowDateModal(false);
    doToggle(pendingToggleIndex, start, end);
    setPendingToggleIndex(null);
  };

  // Modal cancel — do nothing, leave profile as Inactive
  const handleModalCancel = () => {
    setShowDateModal(false);
    setPendingToggleIndex(null);
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / profilesPerPage);
  const indexOfLastRecord = currentPage * profilesPerPage;
  const indexOfFirstRecord = indexOfLastRecord - profilesPerPage;
  const currentProfiles = filteredUsers.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const handlePageChange = (page) => setCurrentPage(page);

  const handleProfileClick = (profileId, page) => {
    localStorage.setItem("metrimonyCurrentPage", page);
    navigate(`/profile/${profileId}`);
  };

  useEffect(() => {
    const savedPage = localStorage.getItem("metrimonyCurrentPage");
    if (savedPage) {
      setCurrentPage(Number(savedPage));
      localStorage.removeItem("metrimonyCurrentPage");
    }
  }, []);

  if (loading)
    return (
      <div>
        <div className="flex justify-center items-center mt-60 py-10">
          <FaSpinner className="animate-spin text-3xl text-white" />
          <span className="text-white font-extrabold text-2xl pl-5">
            Loading
          </span>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">
      {/* Date range modal — only shown when activating an Inactive profile */}
      {showDateModal && (
        <DateRangeModal
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}

      <PageHeader title="Matrimonial Profiles" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            icon={FaMale}
            title="Male Users"
            number={users.filter((u) => u.gender === "male").length}
          />
          <StatsCard
            icon={FaFemale}
            title="Female Users"
            number={users.filter((u) => u.gender === "female").length}
          />
          <StatsCard
            icon={FaCheckCircle}
            title="Active Users"
            number={users.filter((u) => u.activityStatus === "Active").length}
          />
          <StatsCard
            icon={FaTimesCircle}
            title="Inactive Users"
            number={users.filter((u) => u.activityStatus === "Inactive").length}
          />
        </div>

        {/* Filters */}
        <div className="flex justify-between mb-4 flex-wrap gap-2 overflow-x-auto">
          <input
            type="text"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            placeholder="Search by Name.. Mobile.. userId.. city.."
            value={searchQuery}
            onChange={handleSearch}
          />
          <select
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={selectedGender}
            onChange={handleGenderFilter}
          >
            <option value="">Filter by gender</option>
            {genderData.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <select
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={selectedStatus}
            onChange={handleStatusFilter}
          >
            <option value="">Filter by status</option>
            {statusData.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={selectedSubscription}
            onChange={handleSubscriptionFilter}
          >
            <option value="">Filter by subscription</option>
            {subscriptionData.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={startDate}
            onChange={(e) => handleDateFilter(e.target.value, endDate)}
          />
          <input
            type="date"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={endDate}
            onChange={(e) => handleDateFilter(startDate, e.target.value)}
          />
          <button
            className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            onClick={handleResetFilters}
          >
            Reset Filters
          </button>
        </div>

        {/* Filter Result Count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredUsers.length} result
          {filteredUsers.length !== 1 && "s"}
        </div>

        {/* Table — completely unchanged */}
        <div className="w-full overflow-x-auto custom-scroll">
          <table className="min-w-full table-auto text-nowrap bg-slate-50 rounded-lg shadow-md overflow-hidden">
            <thead className="bg-slate-900 text-slate-100">
              <tr>
                <th className="py-3 px-4 text-left">User ID</th>
                <th className="py-3 px-4 text-left">Full Name</th>
                <th className="py-3 px-4 text-left">Sub Caste</th>
                <th className="py-3 px-4 text-left">City</th>
                <th className="py-3 px-4 text-left">Gender</th>
                <th className="py-3 px-4 text-left">Mobile</th>
                <th className="py-3 px-4 text-left">Created At</th>
                <th className="py-3 px-4 text-left">Subscription-Type</th>
                <th className="py-3 px-4 text-left">Subscription-Dates</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Actions</th>
                <th className="py-3 px-4 text-left">Operations</th>
              </tr>
            </thead>
            <tbody>
              {currentProfiles.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-4 py-2 text-center">
                    No records available
                  </td>
                </tr>
              ) : (
                currentProfiles.map((user, index) => (
                  <tr key={user.userId}>
                    <td className="py-3 px-4">{user.bioDataId}</td>
                    <td
                      className="py-3 px-4 text-blue-500 hover:underline cursor-pointer"
                      onClick={() =>
                        handleProfileClick(user?.bioDataId, currentPage)
                      }
                    >
                      {user.personalDetails.fullname}
                    </td>
                    <td className="py-3 px-4">
                      {user.personalDetails.subCaste}
                    </td>
                    <td className="py-3 px-4">
                      {user.personalDetails.currentCity}
                    </td>
                    <td className="py-3 px-4">
                      {user.gender === "male" ? "Male" : "Female"}
                    </td>
                    <td className="py-3 px-4">
                      {user.personalDetails.contactNumber1}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(user.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-3 px-12 text-center">
                      {(() => {
                        const biodataSub =
                          user.userId?.serviceSubscriptions?.find(
                            (sub) => sub.serviceType === "Biodata"
                          );
                        const subscriptionType =
                          biodataSub?.subscriptionType || "N/A";
                        const status = biodataSub?.status || "N/A";
                        const getStatusClass = (s) =>
                          s === "Active"
                            ? "text-green-800"
                            : s === "Pending"
                            ? "text-yellow-800"
                            : s === "Expired"
                            ? "text-red-800"
                            : "text-gray-800";
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold">
                              {subscriptionType}
                            </span>
                            <span
                              className={`text-sm font-medium ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 text-center text-sm text-gray-700">
                      {(() => {
                        const biodataSub =
                          user.userId?.serviceSubscriptions?.find(
                            (sub) => sub.serviceType === "Biodata"
                          );
                        const fmt = (d) =>
                          d
                            ? new Date(d).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A";
                        return (
                          <>
                            <span className="text-green-600 font-medium">
                              {fmt(biodataSub?.startDate)}
                            </span>
                            {" - "}
                            <span className="text-red-600 font-medium">
                              {fmt(biodataSub?.endDate)}
                            </span>
                          </>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full ${
                          user.activityStatus === "Active"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {user.activityStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={user.activityStatus === "Active"}
                          onChange={() => handleToggle(index)}
                        />
                        <span className="w-11 h-6 bg-slate-200 rounded-full inline-flex items-center">
                          <span
                            className={`w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
                              user.activityStatus === "Active"
                                ? "translate-x-6 bg-green-500"
                                : "translate-x-1 bg-red-500"
                            }`}
                          />
                        </span>
                      </label>
                    </td>
                    <td className="py-3 px-10">
                      <button
                        onClick={() => handleDelete(user.bioDataId)}
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
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default MatrimonialProfiles;
