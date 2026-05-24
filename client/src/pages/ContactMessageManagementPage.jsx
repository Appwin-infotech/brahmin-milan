import React, { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/Pagination";
import { BASE_URL } from "../utils/constants";
import moment from "moment";
import { FaEye } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";

const ContactMessageManagementPage = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const messagesPerPage = 10;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : {};
  };

  const fetchMessages = async () => {
    try {
      const query = new URLSearchParams({
        search: searchQuery,
        page: currentPage,
        limit: messagesPerPage,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const res = await fetch(
        `${BASE_URL}/api/v1/contact/getAllContact?${query}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();

      if (!res.ok || !data.status) {
        throw new Error(data.message || "Failed to fetch messages");
      }
      if (data.data.length === 0) {
  toast.info(data.message || "No contact messages found.");
}
setMessages(data.data);
setFilteredMessages(data.data);
setTotalPages(data.pagination.totalPages || 1);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load messages.");
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [searchQuery, startDate, endDate, currentPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };


  const handleView = (id) => {
    const msg = filteredMessages.find((m) => m._id === id);
    setSelectedMessage(msg);
  };

  const closeModal = () => {
    setSelectedMessage(null);
  };

  const toggleSelectAll = () => {
  if (selectAll) {
    setSelectedIds([]);
  } else {
    setSelectedIds(filteredMessages.map((msg) => msg._id));
  }
  setSelectAll(!selectAll);
};

const handleBulkDelete = async () => {
  if (selectedIds.length === 0) {
    toast.warning("Please select at least one message to delete.");
    return;
  }

  const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} selected message(s)?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/contact/deleteMultipleContact`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids: selectedIds }),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      throw new Error(data.message || "Failed to delete messages");
    }

    toast.success(data.message || "Messages deleted successfully");
    setSelectedIds([]);
    setSelectAll(false);
    fetchMessages(); // Refresh data
  } catch (error) {
    console.error(error);
    toast.error("Failed to delete messages.");
  }
};


const toggleSelectOne = (id) => {
  setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((_id) => _id !== id) : [...prev, id]
  );
};


  return (
    <div className="min-h-screen p-8 pt-0">
      <PageHeader title="Contact Query Management" />

      <div className="bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        {/* Filters */}
        <div className="flex justify-between mb-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Search name/email/subject"
              className="p-2 border rounded-md bg-slate-100 text-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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

{selectedIds.length > 0 && (
  <div className="mb-4">
    <button
      onClick={handleBulkDelete}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Delete Selected ({selectedIds.length})
    </button>
  </div>
)}

        {/* Table */}
        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md">
<thead className="bg-slate-900 text-white">
  <tr>
    <th className="py-3 px-4 text-left">
      <input
        type="checkbox"
        checked={selectAll}
        onChange={toggleSelectAll}
      />
    </th>
    <th className="py-3 px-4 text-left">Name</th>
    <th className="py-3 px-4 text-left">Email</th>
    <th className="py-3 px-4 text-left">Phone</th>
    <th className="py-3 px-4 text-left">Subject</th>
    <th className="py-3 px-4 text-left">Date</th>
    <th className="py-3 px-4 text-left">Actions</th>
  </tr>
</thead>

          <tbody>
            {filteredMessages.length > 0 ? (
              filteredMessages.map((msg) => (
<tr key={msg._id} className="hover:bg-slate-100">
  <td className="py-3 px-4">
    <input
      type="checkbox"
      checked={selectedIds.includes(msg._id)}
      onChange={() => toggleSelectOne(msg._id)}
    />
  </td>
  <td className="py-3 px-4">{msg.fullname}</td>
  <td className="py-3 px-4">{msg.email}</td>
  <td className="py-3 px-4">{msg.phone}</td>
  <td className="py-3 px-4">{msg.subject}</td>
  <td className="py-3 px-4">
    {moment(msg.createdAt).format("DD MMM YYYY")}
  </td>
  <td className="py-3 px-4 text-center">
    <button
      onClick={() => handleView(msg._id)}
      className="text-blue-600 hover:text-blue-800"
    >
      <FaEye />
    </button>
  </td>
</tr>

              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-4 px-4 text-center">
                  No messages found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* View Modal */}
      {selectedMessage && (
<div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6 bg-black bg-opacity-50">
  <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-y-auto max-h-[90vh]">
    {/* Close Button */}
    <button
      onClick={closeModal}
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold focus:outline-none"
    >
      &times;
    </button>

    {/* Modal Content */}
    <div className="p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center border-b pb-3">
        📩 Contact Query Details
      </h2>

      <div className="text-gray-700 text-sm sm:text-base">
        <div>
          <p className="mb-2"><span className="font-medium">👤 Name:</span> {selectedMessage.fullname}</p>
          <p className="mb-2"><span className="font-medium">📧 Email:</span> {selectedMessage.email}</p>
          <p className="mb-2"><span className="font-medium">📱 Phone:</span> {selectedMessage.phone}</p>
        </div>
        <div>
          <p className="mb-2"><span className="font-medium">📝 Subject:</span> {selectedMessage.subject}</p>
          <p className="mb-2"><span className="font-medium">📨 Message:</span> {selectedMessage.message}</p>
          <p className="mb-2"><span className="font-medium">🕒 Received:</span> {moment(selectedMessage.createdAt).format("DD MMM YYYY, h:mm A")}</p>
        </div>
      </div>
    </div>
  </div>
</div>

      )}

      <ToastContainer />
    </div>
  );
};

export default ContactMessageManagementPage;
