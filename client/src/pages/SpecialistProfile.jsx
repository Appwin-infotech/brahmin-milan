// import React, { useEffect, useState } from "react";
// import PageHeader from "../components/common/PageHeader";
// import { Link, useParams } from "react-router-dom";
// import { FaUsers, FaCheckCircle, FaTimesCircle, FaTrashAlt } from "react-icons/fa";
// import StatsCard from "../components/common/StatsCard";
// import { BASE_URL } from "../utils/constants";
// import { toast, ToastContainer } from "react-toastify";
// import Pagination from "../components/common/Pagination"; // ✅ imported pagination

// const statusData = [
//   { label: "All", value: "" },
//   { label: "Enabled", value: true },
//   { label: "Disabled", value: false },
// ];

// const SpecialistProfile = () => {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [stateFilter, setStateFilter] = useState("");
//   const [selectedStatus, setSelectedStatus] = useState();
//   const [cityFilter, setCityFilter] = useState("");
//   const [profileData, setProfileData] = useState([]);
//   const [stats, setStats] = useState({
//     totalUsers: 0,
//     activeUsers: 0,
//     inactiveUsers: 0,
//   });
//   const [states, setStates] = useState([]);
//   const [cities, setCities] = useState([]);
//   const { userType } = useParams();

//   const [currentPage, setCurrentPage] = useState(1); // ✅ pagination state
//   const profilesPerPage = 10;

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

//   const fetchFilters = async () => {
//     try {
//       const response = await fetch(
//         `${BASE_URL}/api/v1/admin/specialists/${userType}?action=getFilters`,
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

//       setStates(data.states);
//       setCities(data.cities);
//     } catch (error) {
//       console.error("Error fetching filters:", error);
//     }
//   };



//   const loadProfileData = async () => {
//     try {
//       const queryParams = new URLSearchParams({
//         search: searchQuery,
//         state: stateFilter,
//         city: cityFilter,
//         isEnabled: selectedStatus,
//       });
//       const response = await fetch(
//         `${BASE_URL}/api/v1/admin/specialists/${userType}?${queryParams}`,
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

//       setProfileData(data.users);
//       setStats(data.stats);
//     } catch (error) {
//       console.error("Error loading profiles:", error);
//     }
//   };

//   const handleToggle = async (userId) => {
//     try {
//       const response = await fetch(
//         `${BASE_URL}/api/v1/admin/specialists/${userType}?action=toggleAccess&userId=${userId}`
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         if (data.error === "Token expired") {
//           alert("Session expired. Please login again.");
//           localStorage.clear();
//           window.location.href = "/login";
//           return;
//         } else {
//           throw new Error(data.message || "Failed to update status.");
//         }
//       }

//       if (data.status) {
//         toast.success(data.message || "Status updated successfully!");
//       } else {
//         toast.error(data.message || "Failed to update status!");
//       }

//       loadProfileData();
//     } catch (error) {
//       console.error("Error toggling access:", error);
//     }
//   };

//   useEffect(() => {
//   const handleNewProfile = (e) => {
//     const newData = e.detail;
//     if (!newData || !newData._id) return; // fallback will handle

//     setProfileData((prev) => [newData, ...prev]);
//   };

//   window.addEventListener("new-Created", handleNewProfile);
//   return () => {
//     window.removeEventListener("new-Created", handleNewProfile);
//   };
// }, []);

//   const getUserId = (userType, user) => {
//     switch (userType) {
//       case "pandit":
//         return user.panditId;
//       case "jyotish":
//         return user.jyotishId;
//       case "kathavachak":
//         return user.kathavachakId;
//       default:
//         return "";
//     }
//   };

//   const handleDelete = async (user) => {
    
//     const userId = getUserId(userType, user);
//     if (!window.confirm(`Are you sure you want to delete this ${userType} profile?`)) return;
//     try {
//       const response = await fetch(
//         `${BASE_URL}/api/v1/admin/deleteSpecialist/${userType}/${userId}`,
//         {
//           method: "DELETE",
//           headers,
//         }
//       );
//       const data = await response.json();
//       if (data.status) {
//         toast.success("User deleted successfully!");
//         loadProfileData();
//       } else {
//         toast.error(data.message || "Delete failed!");
//       }
//     } catch (error) {
//       toast.error("Error deleting user.");
//     }
//   };

//   const handleResetFilters = () => {
//     setSearchQuery("");
//     setStateFilter("");
//     setSelectedStatus("");
//     setCityFilter("");
//     setCurrentPage(1);
//   };

//   const handleStatusFilter = (value) => {
//     setSelectedStatus(value === "" ? "" : value === "true");
//   };

//   const handlePageChange = (page) => setCurrentPage(page);

//   useEffect(() => {
//     loadProfileData();
//     fetchFilters();
//   }, [userType]);

//   useEffect(() => {
//     loadProfileData();
//   }, [
//     searchQuery,
//     stateFilter,
//     cityFilter,
//     userType,
//     searchQuery,
//     selectedStatus,
//   ]);

//   useEffect(() => {
//     // setCurrentPage(1);
//   }, [searchQuery, stateFilter, cityFilter, selectedStatus]);

//   const indexOfLastProfile = currentPage * profilesPerPage;
//   const indexOfFirstProfile = indexOfLastProfile - profilesPerPage;
//   const paginatedProfiles = profileData.slice(
//     indexOfFirstProfile,
//     indexOfLastProfile
//   );
//   const totalPages = Math.ceil(profileData.length / profilesPerPage);


//       // Redirect to User Profile or Reported Profile
//   const handleProfileClick = (currentPage) => {
//     // Store the current page in localStorage
//     localStorage.setItem("specialistCurrentPage", currentPage);
//   };

//       useEffect(() => {
//         const savedPage = localStorage.getItem("specialistCurrentPage");
//         if (savedPage) {
//           setCurrentPage(Number(savedPage)); // set to page 45, for example
//           localStorage.removeItem("specialistCurrentPage"); // optional
//         }
//       }, []);
  


//   return (
//     <div className="min-h-screen sm:p-2 md:p-8 pt-0">
//       <PageHeader title={`${userType} Profiles`} />
//       <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
//           <StatsCard
//             icon={FaUsers}
//             title="Total Users"
//             number={stats.totalUsers}
//           />
//           <StatsCard
//             icon={FaCheckCircle}
//             title="Active Users"
//             number={stats.activeUsers}
//           />
//           <StatsCard
//             icon={FaTimesCircle}
//             title="Inactive Users"
//             number={stats.inactiveUsers}
//           />
//         </div>

//         <div className="flex justify-start mb-4 space-x-4 overflow-x-auto">
//           <input
//             type="text"
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             placeholder="Search by Name...UserId"
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//           />
//           <select
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={stateFilter}
//             onChange={(e) => setStateFilter(e.target.value)}
//           >
//             <option value="">Filter by state</option>
//             {states.map((state) => (
//               <option key={state} value={state}>
//                 {state}
//               </option>
//             ))}
//           </select>
//           <select
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={cityFilter}
//             onChange={(e) => setCityFilter(e.target.value)}
//           >
//             <option value="">Filter by village/city</option>
//             {cities.map((city) => (
//               <option key={city} value={city}>
//                 {city}
//               </option>
//             ))}
//           </select>
//           <select
//             className="p-2 border rounded-md bg-slate-100 text-slate-900"
//             value={selectedStatus}
//             onChange={(e) => handleStatusFilter(e.target.value)}
//           >
//             <option value="">Filter by status</option>
//             {statusData.map((status) => (
//               <option key={status.value} value={status.value}>
//                 {status.label}
//               </option>
//             ))}
//           </select>
//           <button
//             onClick={handleResetFilters}
//             className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
//           >
//             Reset Filters
//           </button>
//         </div>

//         {/* Filter Result Count */}
//         <div className="mb-4 text-gray-700 font-medium">
//           Showing {profileData.length} result{profileData.length !== 1 && "s"}
//         </div>

//         <div className="w-full overflow-x-auto custom-scroll">
//           <table className="min-w-full text-nowrap table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
//             <thead className="bg-slate-900 text-slate-100">
//               <tr>
//                 <th className="py-3 px-4 text-left">User ID</th>
//                 <th className="py-3 px-4 text-left">Name</th>
//                 <th className="py-3 px-4 text-left">Mobile</th>
//                 <th className="py-3 px-4 text-left">State</th>
//                 <th className="py-3 px-4 text-left">Village/City</th>
//                 <th className="py-3 px-4 text-left">Created At</th>
//                 <th className="py-3 px-4 text-left">Subscription-Type</th>
//                 <th className="py-3 px-4 text-left">Subscription-Dates</th>
//                 <th className="py-3 px-4 text-left">Status</th>
//                 <th className="py-3 px-4 text-left">Access</th>
//                 <th className="py-3 px-4 text-left">Operations</th>
//               </tr>
//             </thead>
//             <tbody>
//               {paginatedProfiles.length === 0 ? (
//                 <tr>
//                   <td colSpan="8" className="text-center py-4">
//                     No profiles found.
//                   </td>
//                 </tr>
//               ) : (
//                 paginatedProfiles.map((user) => (
//                   <tr key={user._id} className="hover:bg-slate-100">
//                     <td className="py-3 px-4">{getUserId(userType, user)}</td>
//                     <td className="py-3 px-4 text-blue-600">
//                       <Link to={`/${userType}/${getUserId(userType, user)}`} onClick={() => {
//                       handleProfileClick(currentPage);
//                       setShowModal(false);
//                     }}>
//                         {user.fullName}
//                       </Link>
//                     </td>
//                     <td className="py-3 px-4">{user.mobileNo}</td>
//                     <td className="py-3 px-4">{user.state}</td>
//                     <td className="py-3 px-4">{user.city}</td>
//                     <td className="py-3 px-4">
//                       {new Date(user.createdAt).toLocaleDateString("en-GB")}
//                     </td>
//                     <td className="py-3 px-12 text-center">
//                       {(() => {
//                         const serviceSub =
//                           user.userId?.serviceSubscriptions?.find(
//                             (sub) =>
//                               sub.serviceType.toLowerCase() ===
//                               userType.toLowerCase()
//                           );
//                         const subscriptionType =
//                           serviceSub?.subscriptionType || "N/A";
//                         const status = serviceSub?.status || "N/A";

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
//                         const serviceSub =
//                           user.userId?.serviceSubscriptions?.find(
//                             (sub) =>
//                               sub.serviceType.toLowerCase() ===
//                               userType.toLowerCase()
//                           );
//                         const startDate = serviceSub?.startDate;
//                         const endDate = serviceSub?.endDate;

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
//                           user.isEnabled === true
//                             ? "bg-green-500 text-white"
//                             : "bg-red-500 text-white"
//                         }`}
//                       >
//                         {user.isEnabled ? "Enabled" : "Disable"}
//                       </span>
//                     </td>

//                     <td className="py-3 px-4">
//                       <label className="relative inline-flex items-center cursor-pointer">
//                         <input
//                           type="checkbox"
//                           className="sr-only"
//                           checked={user.isEnabled}
//                           onChange={() => handleToggle(user._id)}
//                         />
//                         <span className="w-11 h-6 bg-slate-200 rounded-full inline-flex items-center">
//                           <span
//                             className={`w-4 h-4 rounded-full transform ${
//                               user.isEnabled
//                                 ? "translate-x-6 bg-green-500"
//                                 : "translate-x-1 bg-red-500"
//                             }`}
//                           ></span>
//                         </span>
//                       </label>
//                     </td>
//                     <td className="py-3 px-10">
//                       <button
//                         onClick={() => handleDelete(user)}
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
//           {totalPages > 1 && (
//             <div className="mt-4 flex justify-center">
//               <Pagination
//                 currentPage={currentPage}
//                 totalPages={totalPages}
//                 onPageChange={handlePageChange}
//               />
//             </div>
//           )}
//         </div>
//       </div>
//       <ToastContainer
//         position="top-right"
//         autoClose={5000}
//         hideProgressBar={false}
//         closeOnClick
//         pauseOnHover
//       />
//     </div>
//   );
// };

// export default SpecialistProfile;

import React, { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import { Link, useParams } from "react-router-dom";
import { FaUsers, FaCheckCircle, FaTimesCircle, FaTrashAlt } from "react-icons/fa";
import StatsCard from "../components/common/StatsCard";
import { BASE_URL } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";

const statusData = [
  { label: "All", value: "" },
  { label: "Enabled", value: true },
  { label: "Disabled", value: false },
];

const subscriptionData = [
  { label: "Active", value: "Active" },
  { label: "Pending", value: "Pending" },
  { label: "Expired", value: "Expired" },
];

// ── service type map: url param → schema enum value ──────────────────────────
const userTypeToServiceType = {
  pandit: "Pandit",
  kathavachak: "Kathavachak",
  jyotish: "Jyotish",
};

// ─── Date Range Modal ─────────────────────────────────────────────────────────
const DateRangeModal = ({ onConfirm, onCancel }) => {
  const today = new Date().toISOString().split("T")[0];
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!start || !end) { setError("Please select both start and end date."); return; }
    if (new Date(start) >= new Date(end)) { setError("End date must be after start date."); return; }
    if (new Date(end) <= new Date()) { setError("End date must be in the future."); return; }
    onConfirm(start, end);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Activate Profile</h2>
        <p className="text-sm text-slate-500 mb-4">
          Select the activation date range for this profile.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Start Date</label>
            <input
              type="date" value={start} min={today}
              onChange={(e) => { setStart(e.target.value); setError(""); }}
              className="w-full p-2 border rounded-md bg-slate-100 text-slate-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">End Date</label>
            <input
              type="date" value={end} min={start || today}
              onChange={(e) => { setEnd(e.target.value); setError(""); }}
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
const SpecialistProfile = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [profileData, setProfileData] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, inactiveUsers: 0 });
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const { userType } = useParams();

  const [currentPage, setCurrentPage] = useState(1);
  const profilesPerPage = 10;

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [showDateModal, setShowDateModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : {};
  };

  const fetchFilters = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/specialists/${userType}?action=getFilters`,
        { method: "PATCH", headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "Token expired") {
          localStorage.clear(); window.location.href = "/login"; return;
        }
        throw new Error(data.message || "Failed to fetch filters.");
      }
      setStates(data.states);
      setCities(data.cities);
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const loadProfileData = async () => {
    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        state: stateFilter,
        city: cityFilter,
        isEnabled: selectedStatus,
      });
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/specialists/${userType}?${queryParams}`,
        { method: "PATCH", headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "Token expired") {
          localStorage.clear(); window.location.href = "/login"; return;
        }
        throw new Error(data.message || "Failed to fetch users.");
      }
      setProfileData(data.users);
      setStats(data.stats);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  // ── Toggle: open modal for inactive, deactivate directly for active ─────────
  const handleToggle = (user) => {
    if (user.isEnabled) {
      // Active → deactivate immediately, no modal
      doToggle(user, null, null);
    } else {
      // Inactive → open date picker modal
      setPendingUser(user);
      setShowDateModal(true);
    }
  };

  // ── Actual API call after date selection ────────────────────────────────────
  const doToggle = async (user, activateStart, activateEnd) => {
    const serviceType = userTypeToServiceType[userType];

    // Optimistic UI update
    setProfileData((prev) =>
      prev.map((u) =>
        u._id === user._id ? { ...u, isEnabled: !u.isEnabled } : u
      )
    );

    try {
      const body = { serviceType };
      if (activateStart && activateEnd) {
        body.startDate = activateStart;
        body.endDate = activateEnd;
      }

      const response = await fetch(
        `${BASE_URL}/api/v1/admin/specialists/${userType}?action=toggleAccessWithSubscription&userId=${user._id}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Token expired") {
          localStorage.clear(); window.location.href = "/login"; return;
        }
        throw new Error(data.message || "Failed to update status.");
      }

      if (data.status) {
        toast.success(data.message || "Status updated successfully!");
        await loadProfileData(); // ✅ refresh to get updated subscription dates
      } else {
        // Rollback optimistic update
        setProfileData((prev) =>
          prev.map((u) =>
            u._id === user._id ? { ...u, isEnabled: user.isEnabled } : u
          )
        );
        toast.error(data.message || "Failed to update status!");
      }
    } catch (error) {
      // Rollback
      setProfileData((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, isEnabled: user.isEnabled } : u
        )
      );
      toast.error("Failed to update status, please try again!");
    }
  };

  // Modal confirm
  const handleModalConfirm = (start, end) => {
    setShowDateModal(false);
    doToggle(pendingUser, start, end);
    setPendingUser(null);
  };

  // Modal cancel
  const handleModalCancel = () => {
    setShowDateModal(false);
    setPendingUser(null);
  };

  useEffect(() => {
    const handleNewProfile = (e) => {
      const newData = e.detail;
      if (!newData || !newData._id) return;
      setProfileData((prev) => [newData, ...prev]);
    };
    window.addEventListener("new-Created", handleNewProfile);
    return () => window.removeEventListener("new-Created", handleNewProfile);
  }, []);

  const getUserId = (userType, user) => {
    switch (userType) {
      case "pandit": return user.panditId;
      case "jyotish": return user.jyotishId;
      case "kathavachak": return user.kathavachakId;
      default: return "";
    }
  };

  const handleDelete = async (user) => {
    const userId = getUserId(userType, user);
    if (!window.confirm(`Are you sure you want to delete this ${userType} profile?`)) return;
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/deleteSpecialist/${userType}/${userId}`,
        { method: "DELETE", headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.status) {
        toast.success("User deleted successfully!");
        loadProfileData();
      } else {
        toast.error(data.message || "Delete failed!");
      }
    } catch (error) {
      toast.error("Error deleting user.");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStateFilter("");
    setSelectedStatus("");
    setSelectedSubscription("");
    setCityFilter("");
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setSelectedStatus(value === "" ? "" : value === "true");
  };

  useEffect(() => {
    loadProfileData();
    fetchFilters();
  }, [userType]);

  useEffect(() => {
    loadProfileData();
  }, [searchQuery, stateFilter, cityFilter, selectedStatus, userType]);

  useEffect(() => {
    const savedPage = localStorage.getItem("specialistCurrentPage");
    if (savedPage) {
      setCurrentPage(Number(savedPage));
      localStorage.removeItem("specialistCurrentPage");
    }
  }, []);

  const handleProfileClick = (currentPage) => {
    localStorage.setItem("specialistCurrentPage", currentPage);
  };

  // ── Subscription filter (client-side) ──────────────────────────────────────
  const serviceType = userTypeToServiceType[userType];
  const displayedProfiles = selectedSubscription
    ? profileData.filter((u) =>
        u.userId?.serviceSubscriptions?.some(
          (s) => s.serviceType === serviceType && s.status === selectedSubscription
        )
      )
    : profileData;

  const indexOfLastProfile = currentPage * profilesPerPage;
  const indexOfFirstProfile = indexOfLastProfile - profilesPerPage;
  const paginatedProfiles = displayedProfiles.slice(indexOfFirstProfile, indexOfLastProfile);
  const totalPages = Math.ceil(displayedProfiles.length / profilesPerPage);

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">

      {/* Date range modal */}
      {showDateModal && (
        <DateRangeModal
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}

      <PageHeader title={`${userType} Profiles`} />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatsCard icon={FaUsers} title="Total Users" number={stats.totalUsers} />
          <StatsCard icon={FaCheckCircle} title="Active Users" number={stats.activeUsers} />
          <StatsCard icon={FaTimesCircle} title="Inactive Users" number={stats.inactiveUsers} />
        </div>

        {/* Filters */}
        <div className="flex justify-start mb-4 space-x-4 overflow-x-auto">
          <input
            type="text"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            placeholder="Search by Name...UserId"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">Filter by state</option>
            {states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <select
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">Filter by village/city</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={selectedStatus}
            onChange={(e) => handleStatusFilter(e.target.value)}
          >
            <option value="">Filter by status</option>
            {statusData.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          {/* ✅ Subscription filter */}
          <select
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={selectedSubscription}
            onChange={(e) => { setSelectedSubscription(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Filter by subscription</option>
            {subscriptionData.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            onClick={handleResetFilters}
            className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Reset Filters
          </button>
        </div>

        {/* Result count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {displayedProfiles.length} result{displayedProfiles.length !== 1 && "s"}
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto custom-scroll">
          <table className="min-w-full text-nowrap table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
            <thead className="bg-slate-900 text-slate-100">
              <tr>
                <th className="py-3 px-4 text-left">User ID</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Mobile</th>
                <th className="py-3 px-4 text-left">State</th>
                <th className="py-3 px-4 text-left">Village/City</th>
                <th className="py-3 px-4 text-left">Created At</th>
                <th className="py-3 px-4 text-left">Subscription-Type</th>
                <th className="py-3 px-4 text-left">Subscription-Dates</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Access</th>
                <th className="py-3 px-4 text-left">Operations</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProfiles.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-4">No profiles found.</td>
                </tr>
              ) : (
                paginatedProfiles.map((user) => {
                  const serviceSub = user.userId?.serviceSubscriptions?.find(
                    (sub) => sub.serviceType.toLowerCase() === userType.toLowerCase()
                  );
                  const getStatusClass = (s) =>
                    s === "Active" ? "text-green-800" :
                    s === "Pending" ? "text-yellow-800" :
                    s === "Expired" ? "text-red-800" : "text-gray-800";
                  const fmt = (d) => d
                    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "N/A";

                  return (
                    <tr key={user._id} className="hover:bg-slate-100">
                      <td className="py-3 px-4">{getUserId(userType, user)}</td>
                      <td className="py-3 px-4 text-blue-600">
                        <Link
                          to={`/${userType}/${getUserId(userType, user)}`}
                          onClick={() => handleProfileClick(currentPage)}
                        >
                          {user.fullName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{user.mobileNo}</td>
                      <td className="py-3 px-4">{user.state}</td>
                      <td className="py-3 px-4">{user.city}</td>
                      <td className="py-3 px-4">
                        {new Date(user.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-3 px-12 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold">
                            {serviceSub?.subscriptionType || "N/A"}
                          </span>
                          <span className={`text-sm font-medium ${getStatusClass(serviceSub?.status)}`}>
                            {serviceSub?.status || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-center text-sm text-gray-700">
                        <span className="text-green-600 font-medium">{fmt(serviceSub?.startDate)}</span>
                        {" - "}
                        <span className="text-red-600 font-medium">{fmt(serviceSub?.endDate)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-white ${user.isEnabled ? "bg-green-500" : "bg-red-500"}`}>
                          {user.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={user.isEnabled}
                            onChange={() => handleToggle(user)} // ✅ pass full user object
                          />
                          <span className="w-11 h-6 bg-slate-200 rounded-full inline-flex items-center">
                            <span className={`w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
                              user.isEnabled ? "translate-x-6 bg-green-500" : "translate-x-1 bg-red-500"
                            }`} />
                          </span>
                        </label>
                      </td>
                      <td className="py-3 px-10">
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTrashAlt />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} closeOnClick pauseOnHover />
    </div>
  );
};

export default SpecialistProfile;