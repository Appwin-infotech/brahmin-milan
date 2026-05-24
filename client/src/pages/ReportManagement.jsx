import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // For navigation
import PageHeader from "../components/common/PageHeader";
import { BASE_URL } from "../utils/constants";
import Pagination from "../components/common/Pagination";
import { toast, ToastContainer } from "react-toastify";
import { FaTrashAlt } from "react-icons/fa";

const ReportManagementPage = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const reportsPerPage = 10; // Adjust this value as needed


  const navigate = useNavigate(); // Hook for redirection

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
    const fetchReports = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/v1/admin/getAllReports`, {
          method: "GET",
          headers: headers,
        });
        const data = await response.json();

        if (!response.ok) {
          if (data.error === "Token expired") {
            alert("Session expired. Please login again.");
            // Redirect to login or clear user session
            localStorage.removeItem("adminId");
            localStorage.removeItem("authToken");
            localStorage.removeItem("message");
            localStorage.removeItem("loggedIn");
            localStorage.removeItem("adminInfo");      
            window.location.href = "/login"; // update with your login route
            return;
          } else {
            throw new Error(data.message || "Failed to fetch users.");
          }
        }
  
        if (data.status) {
          setReports(data.data);
          setFilteredReports(data.data);
        } else {
          console.error("Error fetching reports:", data.message);
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };

    fetchReports();
  }, []);

  const filterReports = (query, start, end) => {
    let filtered = reports.filter((report) =>
      report.userId.username.toLowerCase().includes(query.toLowerCase())
    );

    if (start) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(
        (report) => new Date(report.reportDate) >= startDate
      );
    }

    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (report) => new Date(report.reportDate) <= endDate
      );
    }

    setFilteredReports(filtered);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    filterReports(e.target.value, startDate, endDate);
  };

  const handleDateChange = (type, value) => {
    if (type === "start") {
      setStartDate(value);
      filterReports(searchQuery, value, endDate);
    } else {
      setEndDate(value);
      filterReports(searchQuery, startDate, value);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setFilteredReports(reports);
  };

// Redirect to User Profile or Reported Profile
const handleProfileClick = (profileId, profileType, currentPage) => {
  // Store the current page in localStorage
  localStorage.setItem("reportCurrentPage", currentPage);

  // Determine the URL based on profileType
  let url = "/profile"; // Default fallback URL

  switch (profileType) {
    case "Pandit":
      url = `/pandit/${profileId}`;
      break;
    case "Kathavachak":
      url = `/kathavachak/${profileId}`;
      break;
    case "Jyotish":
      url = `/jyotish/${profileId}`;
      break;
    case "Biodata":
      url = `/profile/${profileId}`;
      break;
    case "Business":
      url = `/business/${profileId}`;
      break;
    default:
      // Handle unknown profileType if necessary
      break;
  }
    // window.location.href = url; // Navigate to the correct profile page
    navigate(url)
  };

const handleDeleteReport = async (reportId) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this report?");
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${BASE_URL}/api/v1/report/delete-reportByAdmin/${reportId}`, {
      method: "DELETE",
      headers: headers,
    });

    const data = await response.json();

    if (response.ok && data.status) {
      toast.success(data.message);
      // Remove the deleted report from state
      const updatedReports = filteredReports.filter((r) => r._id !== reportId);
      setFilteredReports(updatedReports);
      setReports(updatedReports);
    } else {
      toast.error(data.message || "Failed to delete report.");
    }
  } catch (error) {
    console.error("Error deleting report:", error);
    toast.error("An error occurred while deleting the report.");
  }
};


useEffect(() => {
  const savedPage = localStorage.getItem("reportCurrentPage");
  if (savedPage) {
    setCurrentPage(Number(savedPage)); // set to page 45, for example
    localStorage.removeItem("reportCurrentPage"); // optional
  }
}, []);

  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
const indexOfLastReport = currentPage * reportsPerPage;
const indexOfFirstReport = indexOfLastReport - reportsPerPage;
const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);

  //pagination lo
  return (
    <div className="min-h-screen p-8 pt-0">
      <PageHeader title="Report Management" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        <div className="flex justify-between mb-4">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              placeholder="Search by reporter's name..."
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
                {/* Filter Result Count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredReports.length} result
          {filteredReports.length !== 1 && "s"}
        </div>

        {/* Report Table */}
        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="py-3 px-4 text-left">Reported By</th>
              <th className="py-3 px-4 text-left">Reported Profile</th>
              <th className="py-3 px-4 text-left">Profile Type</th>
              <th className="py-3 px-4 text-left">Reason for Report</th>
              <th className="py-3 px-4 text-left">Additional Description</th>
              <th className="py-3 px-4 text-left">Date Reported</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentReports.length > 0 ? (
              currentReports.map((report) => (
                <tr key={report?._id} className="hover:bg-slate-100">
                  {/* Reported By (Clickable) */}
                  <td
                    className="py-3 px-4">
                    {report?.userId?.username} - (
                    <span className="text-black">{report?.userId?.userId}</span>)
                  </td>

                  {/* Reported Profile (Clickable) */}
                  <td
                    className="py-3 px-4 text-blue-600 cursor-pointer hover:underline"
                    onClick={() =>
                      handleProfileClick(
                        report?.profileId?.panditId || report?.profileId?.kathavachakId || report?.profileId?.jyotishId || report?.profileId?.bioDataId,
                        report?.profileId?.profileType,currentPage
                      )
                    }
                  >
                    {report?.profileId?.fullName || report?.profileId?.personalDetails?.fullname} - (
                    <span className="text-black">
                    {report?.profileId?.panditId || report?.profileId?.kathavachakId || report?.profileId?.jyotishId || report?.profileId?.bioDataId}
                    </span>)
                  </td>

                  {/* Profile Type */}
                  <td className="py-3 px-4">{report?.profileId?.profileType}</td>

                  {/* Report Details */}
                  <td className="py-3 px-4">{report?.reportReason}</td>
                  <td className="py-3 px-4">
                    {report?.additionalDetails || "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    {new Date(report?.reportDate).toLocaleDateString("en-GB")}
                  </td>
                  <td className="py-3 px-4 text-center">
  <button
    onClick={() => handleDeleteReport(report._id)}
      className="text-red-500 hover:text-red-700 "
  >
    <FaTrashAlt />
  </button>
</td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-3 px-4 text-center text-red-500">
                  No reports found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

export default ReportManagementPage;
