import React, { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";
import { FaEye, FaTrashAlt } from "react-icons/fa";

const AdvertiseWithUsManagementPage = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const profilesPerPage = 10;

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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/v1/admin/getAllAdvertisement-Request`, {
          method: "GET",
          headers,
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
          if (data.error === "Token expired") {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "/login";
            return;
          } else {
            throw new Error(data.message || "Failed to fetch advertise requests.");
          }
        }

        setRequests(data.data);
        setFilteredRequests(data.data);
      } catch (error) {
        console.error("Error fetching advertise requests:", error);
      }
    };

    fetchRequests();
  }, []);

  const filterRequests = (query, start, end) => {
    let filtered = requests.filter((r) => {
      const fullName = `${r.fullName}`.toLowerCase();
      return fullName.includes(query.toLowerCase());
    });

    if (start) {
      const s = new Date(start);
      s.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => new Date(r.createdAt) >= s);
    }

    if (end) {
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => new Date(r.createdAt) <= e);
    }

    setFilteredRequests(filtered);
  };

  const handleView = (request) => {
  setSelectedRequest(request);
};

const handleDelete = async (advertiseId) => {
  if (!window.confirm("Are you sure you want to delete this request?")) return;

  try {
    const res = await fetch(
      `${BASE_URL}/api/v1/admin/delete-advertise-request/${advertiseId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    const result = await res.json();

    if (!res.ok || !result.status) {
      throw new Error(result.message || "Failed to delete request.");
    }

    toast.success("Request deleted successfully.");

    // ✅ Remove from UI
    setRequests((prev) => prev.filter((r) => r._id !== advertiseId));
    setFilteredRequests((prev) => prev.filter((r) => r._id !== advertiseId));

  } catch (err) {
    console.error(err);
    toast.error("Failed to delete request.");
  }
};


  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    filterRequests(e.target.value, startDate, endDate);
  };

  const handleDateChange = (type, value) => {
    if (type === "start") {
      setStartDate(value);
      filterRequests(searchQuery, value, endDate);
    } else {
      setEndDate(value);
      filterRequests(searchQuery, startDate, value);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setFilteredRequests(requests);
  };

    //pagination 
  const totalPages = Math.ceil(filteredRequests.length / profilesPerPage);
  const indexOfLastRecord = currentPage * profilesPerPage;
  const indexOfFirstRecord = indexOfLastRecord - profilesPerPage;
  const currentRequests = filteredRequests.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

    const handlePageChange = (page) => {
    setCurrentPage(page);
  };


  return (
    <div className="min-h-screen p-8 pt-0">
      <PageHeader title="Advertise With Us Requests" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        <div className="flex justify-between mb-4">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={handleSearch}
            />
            <input
              type="date"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={startDate}
              onChange={(e) => handleDateChange("start", e.target.value)}
            />
            <input
              type="date"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={endDate}
              onChange={(e) => handleDateChange("end", e.target.value)}
            />
                      {(searchQuery || startDate || endDate) && (
            <button
              onClick={resetFilters}
              className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Reset Filters
            </button>
          )}
          </div>

        </div>

        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="py-3 px-4 text-left">UserId</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Phone</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Message</th>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Actions</th>

            </tr>
          </thead>
          <tbody>
            {currentRequests.length > 0 ? (
              currentRequests.map((entry) => (
                <tr key={entry._id} className="hover:bg-slate-100">
                  <td className="py-3 px-4">{entry?.userId?.userId || "N/A"}</td>
                  <td className="py-3 px-4">{entry.fullName || "N/A"}</td>
                  <td className="py-3 px-4">{entry.phoneNumber || "N/A"}</td>
                  <td className="py-3 px-4">{entry.email|| "N/A"}</td>
                  <td className="py-3 px-4">
  {entry.message ? `${entry.message.slice(0, 50)}${entry.message.length > 100 ? "..." : ""}` : "N/A"}
</td>

                  <td className="py-3 px-4">
                    {new Date(entry.createdAt).toLocaleDateString("en-GB") || "N/A"}
                  </td>
                  <td className="py-3 px-4 flex gap-4 text-slate-800">
  <button
    onClick={() => handleView(entry)}
    className="text-blue-600  hover:text-blue-800"
    title="View"
  >
    <FaEye />
  </button>
  <button
    onClick={() => handleDelete(entry._id)}
    className="text-red-600 hover:text-red-800"
    title="Delete"
  >
    <FaTrashAlt />
  </button>
</td>
                </tr>
              ))
            ) : (
<tr>
  <td colSpan="8" className="py-6 text-center text-red-500">
    No advertisement requests found.
  </td>
</tr>

            )}
          </tbody>
        </table>
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
        {selectedRequest && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-lg relative">
      <h2 className="text-xl font-bold mb-4">Advertise Request Details</h2>
      <button
        className="absolute top-2 right-3 text-xl font-bold text-gray-500 hover:text-red-600"
        onClick={() => setSelectedRequest(null)}
      >
        ×
      </button>

      <div className="space-y-2 text-gray-700">
        <p><strong>User ID:</strong> {selectedRequest?.userId?.userId || "N/A"}</p>
        <p><strong>Name:</strong> {selectedRequest.fullName}</p>
        <p><strong>Email:</strong> {selectedRequest.email}</p>
        <p><strong>Phone:</strong> {selectedRequest.phoneNumber}</p>
        <p><strong>Message:</strong> {selectedRequest.message}</p>
        <p><strong>Date:</strong> {new Date(selectedRequest.createdAt).toLocaleString("en-GB")}</p>
      </div>
    </div>
  </div>
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

export default AdvertiseWithUsManagementPage;
