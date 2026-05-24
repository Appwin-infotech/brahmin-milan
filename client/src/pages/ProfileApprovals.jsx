import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";

const ProfileApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [filters, setFilters] = useState({
    searchQuery: "",
    selectedState: "",
    status: "",
    profileType: ""
  });

  
    // ✅ Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const requestPerPage = 10;
  

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    } : {};
  };

  const headers = getAuthHeaders();

  const fetchRequests = async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const response = await fetch(`${BASE_URL}/api/v1/admin/getAllRequests`, {
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
      if (data.status && data.data) {
        setRequests(data.data);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setError("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);


useEffect(() => {
  const handleNewRequest = (e) => {
    const newRequest = e.detail;
    if (!newRequest || !newRequest._id) return; // fallback will handle

    setRequests((prev) => [newRequest, ...prev]);
  };

  window.addEventListener("new-Request", handleNewRequest);
  return () => {
    window.removeEventListener("new-Request", handleNewRequest);
  };
}, []);


  const handleApproval = async (requestId, profileType, action) => {
    setLoading(true);
    try {
      // Build URL: e.g. /api/v1/admin/panditRequest/123?action=approve
      const url = `${BASE_URL}/api/v1/admin/${profileType.toLowerCase()}Request/${requestId}?action=${action}`;
  
      const res = await fetch(url, {
        method: "PUT",               // use PUT for idempotent update
        headers: headers,
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          return window.location.href = "/login";
        }
        throw new Error(data.message || "Operation failed.");
      }
  
      // Success
      toast.success(data.message);
      await fetchRequests();
    } catch (err) {
      // In case data.message is unavailable, we fallback to err.message
      toast.error(err.message || "Something went wrong");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  


  const handleActionChange = async (action, requestId, request) => {
    // Use the profileType field from the request object
    const profileType = request.profileType;

    if (!profileType) {
      setError('Profile type not found in request');
      return;
    }

    if (action === "approve") {
      await handleApproval(requestId, profileType, action);
    } else if (action === "reject") {
      await handleApproval(requestId, profileType, action);
    }
  };

  const getServices = (request) => {
    switch (request.profileType) {
      case "Pandit":
        return request.panditServices || [];
      case "Kathavachak":
        return request.kathavachakServices || [];
      case "Jyotish":
        return request.jyotishServices || [];
      case "Activist":
        return []; // Activists don't have services
      default:
        return [];
    }
  };

  const getRequestIdForTable = (request) => {
    switch (request.profileType) {
      case "Pandit":
        return request.panditId;
      case "Kathavachak":
        return request.kathavachakId;
      case "Jyotish":
        return request.jyotishId;
      case "Activist":
        return request.activistId;
      default:
        return request._id;
    }
  }

  const getRequestId = (request) => {
    switch (request.profileType) {
      case "Pandit":
        return request._id;
      case "Kathavachak":
        return request._id;
      case "Jyotish":
        return request._id;
      case "Activist":
        return request._id;
      default:
        return request._id;
    }
  };

  const filterRequests = () => {
    return requests.filter(request => {
      // Safely access name - handle both fullName and fullname properties
      const name = (request?.fullName || request?.fullname || "").toLowerCase();
      const searchQuery = (filters.searchQuery || "").toLowerCase();
      const nameMatch = name.includes(searchQuery);

      // Safely access state
      const state = (request?.state || "").toLowerCase();
      const selectedState = (filters.selectedState || "").toLowerCase();
      const stateMatch = !filters.selectedState || state === selectedState;

      // Safely access status and profileType
      const status = request?.status || "";
      const profileType = request?.profileType || "";
      const statusMatch = !filters.status || status === filters.status;
      const profileTypeMatch = !filters.profileType || profileType === filters.profileType;

      return nameMatch && stateMatch && statusMatch && profileTypeMatch;
    });
  };
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal"
  ].sort();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      selectedState: "",
      fromDate: "",
      toDate: "",
      status: "",
      profileType: ""
    });
  };
  
  const filteredRequests = filterRequests();


  const toggleSelection = (requestId, profileType) => {
    setSelectedProfiles(prev => {
      const exists = prev.find(p => p.requestId === requestId);
      if (exists) {
        return prev.filter(p => p.requestId !== requestId);
      } else {
        return [...prev, { requestId, profileType }];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedProfiles.length === filteredRequests.length) {
      setSelectedProfiles([]);
    } else {
      const all = filteredRequests.map(req => ({
        requestId: getRequestId(req),
        profileType: req.profileType
      }));
      setSelectedProfiles(all);
    }
  };
  
  const isAllSelected = selectedProfiles.length === filteredRequests.length;

  const handleBulkApprove = async () => {
    setLoading(true);
    try {
      const payload = {

        requests: selectedProfiles.map(({ requestId, profileType }) => ({
          requestId,
          profileType,
          action: "approve",
        })),
      };
  
      const response = await fetch(`${BASE_URL}/api/v1/admin/approveOrRejectMultipleRequests`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        } else {
          throw new Error(data.message || "Bulk approval failed.");
        }
      }
  
      // On success
      if(data.status){
      toast.success(data.message || "Selected Profiles Approved Successfully.")
      await fetchRequests();
      setSelectedProfiles([]);
      }
    } catch (error) {
      toast(error.message || "Something went wrong while Approving selected profiles.")
      setError("Bulk approval failed.");
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleBulkReject = async () => {
    setLoading(true);
    try {
      const payload = {
        requests: selectedProfiles.map(({ requestId, profileType }) => ({
          requestId,
          profileType,
          action: "reject",
        })),
      };
  
      const response = await fetch(`${BASE_URL}/api/v1/admin/approveOrRejectMultipleRequests`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        } else {
          throw new Error(data.message || "Bulk rejection failed.");
        }
      }
  
      // On success
      if(data.status){
        toast.success(data.message || "Selected Profiles Rejected Successfully.")
      await fetchRequests();
      setSelectedProfiles([]);
      }
    } catch (error) {
      toast(error.message || "Something went wrong while Rejecting selected profiles.")
      setError("Bulk rejection failed.");
    } finally {
      setLoading(false);
    }
  };
  
  //pagination  
    const indexOfLastUser = currentPage * requestPerPage;
  const indexOfFirstUser = indexOfLastUser - requestPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredRequests.length / requestPerPage);


        // Redirect to User Profile or Reported Profile
  const handleProfileClick = (currentPage) => {
    // Store the current page in localStorage
    localStorage.setItem("profileApprovalCurrentPage", currentPage);
  };

  
          useEffect(() => {
            const savedPage = localStorage.getItem("profileApprovalCurrentPage");
            if (savedPage) {
              setCurrentPage(Number(savedPage)); // set to page 45, for example
              localStorage.removeItem("profileApprovalCurrentPage"); // optional
            }
          }, []);

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">
      <PageHeader title="Profile Approvals" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
        {/* Filters Section */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-4 overflow-x-auto">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                className="w-full p-2 border rounded-md bg-slate-100 text-slate-900"
                placeholder="Search by name..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <select
                className="w-full p-2 border rounded-md bg-slate-100 text-slate-900"
                value={filters.selectedState}
                onChange={(e) => handleFilterChange('selectedState', e.target.value)}
              >
                <option value="">All States</option>
                {indianStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>


                    <div className="flex-none">
              <button
                className="w-full p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {selectedProfiles.length > 0 && (
  <div className="mb-4 space-x-2">
    <button
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      onClick={handleBulkApprove}
    >
      Approve Selected ({selectedProfiles.length})
    </button>
<button  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-green-700" onClick={handleBulkReject} disabled={selectedProfiles.length === 0}>
  Bulk Reject ({selectedProfiles.length})
</button>
  </div>
)}


        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

             {/* Filter Result Count */}
             <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredRequests.length} result
          {filteredRequests.length !== 1 && "s"}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : (
            /* Requests Table */
            <div className="overflow-x-auto w-full rounded-lg">
              <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md">
                <thead className="bg-slate-900 text-slate-100">
                  <tr>
                  <th className="py-3 px-4 text-left">
  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
</th>

                    <th className="py-3 px-4 text-left text-nowrap">Request ID</th>
                    <th className="py-3 px-4 text-left">Full Name</th>
                    <th className="py-3 px-4 text-left">Mobile</th>
                    <th className="py-3 px-4 text-left">Location</th>
                    <th className="py-3 px-4 text-left text-nowrap">Request For</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
              {currentRequests.length === 0 ? (
              <tr>
                <td colSpan="13" className="px-4 py-2 text-center bg-white">
                  No records available
                </td>
              </tr>
            ) : ( currentRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-slate-100 transition-colors">
                     <td className="py-3 px-4">
  <input
    type="checkbox"
    checked={!!selectedProfiles.find(p => p.requestId === getRequestId(request))}
    onChange={() => toggleSelection(getRequestId(request), request.profileType)}
  />
</td>

                      <td className="py-3 px-4">{getRequestIdForTable(request)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <Link
                            to={`/request/${request._id}`}
                            state={{ request }} // Passing the full user data via state
                            className="text-blue-600 hover:text-blue-800 transition-colors text-nowrap"
                                                  onClick={() =>
                      handleProfileClick(
                        currentPage
                      )
                    }
                          >
                            {request.fullName || request.fullname}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 px-4">{request.mobileNo}</td>
                      <td className="py-3 px-4 text-nowrap">{`${request.city}, ${request.state}`}</td>
                      <td className="py-3 px-4">{request.profileType}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          className="p-2 border rounded-md bg-white text-gray-900"
                          onChange={(e) => handleActionChange(e.target.value, request._id, request)}
                          disabled={request.status === 'approved'}
                        >
                          <option value="">Select Action</option>
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                        </select>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}

                  {/* ✅ Pagination Component */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
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

export default ProfileApprovals;