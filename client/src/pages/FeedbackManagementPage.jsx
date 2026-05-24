import React, { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL } from "../utils/constants";
import Pagination from "../components/common/Pagination";
import { FaEye, FaTrashAlt } from "react-icons/fa";
import moment from "moment";
import { ToastContainer } from "react-toastify";
const FeedbackManagementPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFeedBack, setselectedFeedBack] = useState(null);

    // ✅ Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const feedbacksPerPage = 10;

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
    const fetchFeedbacks = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/api/v1/admin/getAllFeedBacks`,
          {
            method: "GET",
            headers,
          }
        );
        const data = await response.json();

        if (!response.ok || !data.status) {
          if (data.error === "Token expired") {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "/login";
            return;
          } else {
            throw new Error(data.message || "Failed to fetch feedbacks.");
          }
        }

        setFeedbacks(data.data);
        setFilteredFeedbacks(data.data);
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
      }
    };

    fetchFeedbacks();
  }, []);

  const filterFeedbacks = (query, start, end) => {
    let filtered = feedbacks.filter((f) =>
      f.userId?.username?.toLowerCase().includes(query.toLowerCase())
      || f?.userId?.userId.toLowerCase().includes(query.toLowerCase())
    );

    if (start) {
      const s = new Date(start);
      s.setHours(0, 0, 0, 0);
      filtered = filtered.filter((f) => new Date(f.createdAt) >= s);
    }

    if (end) {
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      filtered = filtered.filter((f) => new Date(f.createdAt) <= e);
    }

    setFilteredFeedbacks(filtered);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    filterFeedbacks(e.target.value, startDate, endDate);
  };

  const handleDateChange = (type, value) => {
    if (type === "start") {
      setStartDate(value);
      filterFeedbacks(searchQuery, value, endDate);
    } else {
      setEndDate(value);
      filterFeedbacks(searchQuery, startDate, value);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setFilteredFeedbacks(feedbacks);
  };

    const handleView = (id) => {
    const feedback = filteredFeedbacks.find((feedback) => feedback._id === id);
    setselectedFeedBack(feedback);
  };
  
    const closeModal = () => {
      setselectedFeedBack(null);
    };
  
  const handleAdminReply = async (feedbackId) => {
  const replyMessage = prompt("Enter your reply:");
  if (!replyMessage) return;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/feedBackReceivedByAdmin/${feedbackId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ message: replyMessage }),
    });

    const result = await res.json();

    if (!res.ok || !result.status) {
      throw new Error(result.message || "Failed to send reply.");
    }

    // Update feedback in local state to reflect replied status
    setFeedbacks((prev) =>
      prev.map((f) =>
        f._id === feedbackId
          ? { ...f, isReplied: true, adminReply: { message: replyMessage } }
          : f
      )
    );

    setFilteredFeedbacks((prev) =>
      prev.map((f) =>
        f._id === feedbackId
          ? { ...f, isReplied: true, adminReply: { message: replyMessage } }
          : f
      )
    );

    alert("Reply sent successfully.");
  } catch (error) {
    console.error("Error sending reply:", error);
    alert("Failed to send reply.");
  }
};

//handleDeleteFeedback
const handleDeleteFeedback = async (feedbackId) => {
  if (!window.confirm("Are you sure you want to delete this feedback?")) return;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/admin/delete-feedbackByAdmin/${feedbackId}`, {
      method: "DELETE",
      headers,
    });

    const result = await res.json();

    if (!res.ok || !result.status) {
      throw new Error(result.message || "Failed to delete feedback.");
    }

    // Remove from both state arrays
    setFeedbacks((prev) => prev.filter((fb) => fb._id !== feedbackId));
    setFilteredFeedbacks((prev) => prev.filter((fb) => fb._id !== feedbackId));

    alert("Feedback deleted successfully.");
  } catch (error) {
    console.error("Error deleting feedback:", error);
    alert("Failed to delete feedback.");
  }
};


    //pagination lo
  const totalPages = Math.ceil(filteredFeedbacks.length / feedbacksPerPage);
  const indexOfLastRecord = currentPage * feedbacksPerPage;
  const indexOfFirstRecord = indexOfLastRecord - feedbacksPerPage;
  const currentFeedbacks = filteredFeedbacks.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  return (
    <div className="min-h-screen p-8 pt-0">
      <PageHeader title="Feedback Management" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        <div className="flex justify-between mb-4">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              placeholder="Search by UserId and Name."
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
          </div>
          {(searchQuery || startDate || endDate) && (
            <button
              onClick={resetFilters}
              className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Reset Filters
            </button>
          )}
        </div>
        {/* Filter Result Count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredFeedbacks.length} result
          {filteredFeedbacks.length !== 1 && "s"}
        </div>

        {/* Feedback Table */}
        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="py-3 px-4 text-left">User ID</th>
              <th className="py-3 px-4 text-left">User</th>
              <th className="py-3 px-4 text-left">Rating</th>
              <th className="py-3 px-4 text-left">Comment</th>
              <th className="py-3 px-4 text-left">Reply</th>
              <th className="py-3 px-4 text-left">Submitted On</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentFeedbacks.length > 0 ? (
              currentFeedbacks.map((fb) => (
                <tr key={fb._id} className="hover:bg-slate-100 ">
                  <td className="py-3 px-4">{fb.userId?.userId || "N/A"}</td>
                  <td className="py-3 px-4">{fb.userId?.username || "N/A"}</td>
                  <td className="py-3 px-4 text-center">{fb.rating || "N/A"}</td>
          <td className="py-3 px-4">
  {fb.comment ? (fb.comment.length > 50 ? fb.comment.slice(0, 50) + "..." : fb.comment) : "N/A"}
</td>
                  <td className="py-3 px-4">
                    {fb.isReplied ? (
                      <span className="text-green-600 font-semibold">
                        Replied
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdminReply(fb._id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Reply
                      </button>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {new Date(fb.createdAt).toLocaleDateString("en-GB")}
                  </td>
                                    <td className="px-4 py-4 text-center flex gap-2">
                                      <button
                                        onClick={() => handleView(fb._id)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        <FaEye />
                                      </button>
                                       <button
    onClick={() => handleDeleteFeedback(fb._id)}
    className="text-red-600 hover:text-red-800"
    title="Delete Feedback"
  >
    <FaTrashAlt />
  </button>
                                    </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" className="px-4 py-2 text-center bg-white">
                  No Feedback Found
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
      
  
{selectedFeedBack && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
      <button
        onClick={closeModal}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
      >
        &times;
      </button>
      <h2 className="text-xl font-semibold mb-4">Feedback Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Photo */}
        {selectedFeedBack?.userId?.photoUrl?.[0] && (
          <div>
            <img
              src={selectedFeedBack.userId.photoUrl[0]}
              alt="User"
              className="rounded-lg shadow-md max-h-64 object-cover"
            />
          </div>
        )}

        {/* User & Feedback Info */}
        <div>
          <p><strong>User ID:</strong> {selectedFeedBack?.userId?.userId}</p>
          <p><strong>Username:</strong> {selectedFeedBack?.userId?.username}</p>
          <p><strong>City:</strong> {selectedFeedBack?.userId?.city}</p>
          <p><strong>Mobile No:</strong> {selectedFeedBack?.userId?.mobileNo}</p>
          <p><strong>Gender:</strong> {selectedFeedBack?.userId?.gender}</p>
          <p><strong>Rating:</strong> {selectedFeedBack?.rating}/5</p>
          <p><strong>Comment:</strong> {selectedFeedBack?.comment}</p>
          <p><strong>Created At:</strong> {moment(selectedFeedBack?.createdAt).format("DD MMM YYYY, h:mm A")}</p>

          {/* Admin Reply Section */}
          {selectedFeedBack?.isReplied && selectedFeedBack?.adminReply ? (
            <div className="mt-4 p-4 border border-green-400 rounded bg-green-50">
              <p><strong>Admin Reply:</strong> {selectedFeedBack.adminReply.message}</p>
              <p><strong>Replied At:</strong> {moment(selectedFeedBack.adminReply.repliedAt).format("DD MMM YYYY, h:mm A")}</p>
            </div>
          ) : (
            <button
              onClick={() => handleAdminReply(selectedFeedBack._id)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reply to Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}
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

export default FeedbackManagementPage;
