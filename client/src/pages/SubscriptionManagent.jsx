import React, { useState, useEffect } from "react";
import PageHeader from "../components/common/PageHeader";
import { FaEdit, FaRegTimesCircle, FaEye, FaSpinner } from "react-icons/fa";
import { BASE_URL } from "../utils/constants";
import Modal from "../components/common/Modal";
import Pagination from "../components/common/Pagination";
import { ToastContainer } from "react-toastify";

const SubscriptionManagementPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionRecords, setSubscriptionRecords] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const recordsPerPage = 10;
  const [selectedFiles, setSelectedFiles] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    profileType: "",
    trialPeriod: "",
    duration: "",
    amount: "",
    description: "",
  });
  const [newPhoto, setNewPhoto] = useState(null);
  const [filters, setFilters] = useState({
    userId: "",
    username: "",
    mobile: "",
    service: "",
    amount: "",
    duration: "",
    trial: "",
    startDate: "",
    endDate: "",
    paymentDate: "",
    status: "",
  });

  function parseDDMMYYYY(str) {
    if (!str) return null;
    const [day, month, year] = str.split("/");
    return new Date(`${year}-${month}-${day}`);
  }

  const filteredRecords = subscriptionRecords.filter(record => {
    return (
      (filters.userId === "" || (record.userId?.userId || "").toLowerCase().includes(filters.userId.toLowerCase())) &&
      (filters.username === "" || (record.userId?.username || "").toLowerCase().includes(filters.username.toLowerCase())) &&
      (filters.mobile === "" || (record.userId?.mobile || "").includes(filters.mobile)) &&
      (filters.service === "" || (record.service?.serviceType || "").toLowerCase().includes(filters.service.toLowerCase())) &&
      (filters.amount === "" || String(record.amount).includes(filters.amount)) &&
      (filters.duration === "" || String(record.duration) === filters.duration) &&
      (filters.trial === "" || String(record.trialPeriod).includes(filters.trial)) &&
      (filters.startDate === "" || (record.startDate && record.startDate.slice(0, 10) >= filters.startDate)) &&
      (filters.endDate === "" || (record.endDate && record.endDate.slice(0, 10) <= filters.endDate)) &&
      (filters.paymentDate === "" || (record.paymentDate && record.paymentDate.slice(0, 10) === filters.paymentDate)) &&
      (filters.status === "" || (record.status || "").toLowerCase() === filters.status.toLowerCase())
    );
  });

  const handleCreatePlan = async (e) => {
    e.preventDefault();

    // Validate required fields
    const { profileType, trialPeriod, duration, amount, description } = newPlan;
    if (!profileType || !trialPeriod || !duration || !amount || !description) {
      alert("All fields except photo are required");
      return;
    }

    const formData = new FormData();
    formData.append('profileType', profileType);
    formData.append('trialPeriod', trialPeriod);
    formData.append('duration', duration);
    formData.append('amount', amount);
    formData.append('description', description);

    if (newPhoto) {
      formData.append('photo', newPhoto);
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/v1/subscription/createPlan`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create plan");
      }

      alert("Subscription plan created successfully");
      setShowCreateModal(false);
      setNewPlan({ profileType: "", trialPeriod: "", duration: "", amount: "", description: "" });
      setNewPhoto(null);
      fetchSubscriptions(); // Refresh plans list
    } catch (error) {
    
      alert(error.message || "Error creating plan");
    }
  };

  const handleNewPlanChange = (e) => {
    const { name, value } = e.target;
    setNewPlan((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewPhotoChange = (e) => {
    setNewPhoto(e.target.files[0]);
  };

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

  const fetchSubscriptions = async () => {
    // setLoading(true);
    try {
      const adminInfo = JSON.parse(localStorage.getItem("adminInfo"));

      if (!adminInfo || !adminInfo.token) {
        alert("You must be logged in as an admin.");
        return;
      }

      const response = await fetch(`${BASE_URL}/api/v1/admin/getPlans`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        } else {
          throw new Error(data.message || "Failed to fetch subscription plans.");
        }
      }

      setSubscriptions(data.plans || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionRecords = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/admin/subscriptions`, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch subscription records.");
      }

      setSubscriptionRecords(data.data || []);
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchSubscriptionRecords();
  }, []);

  useEffect(() => {
    const savedPage = localStorage.getItem("subscriptionCurrentPage");
    if (savedPage) {
      setCurrentPage(Number(savedPage)); // set to page 45, for example
      localStorage.removeItem("subscriptionCurrentPage"); // optional
    }
  }, []);

  const handleInputChange = (e, planId) => {
    const { name, value } = e.target;
    setSubscriptions((prev) =>
      prev.map((plan) =>
        plan._id === planId ? { ...plan, [name]: value } : plan
      )
    );
  };

  const handleFileChange = (e, planId) => {
    setSelectedFiles((prev) => ({
      ...prev,
      [planId]: e.target.files[0]
    }));
  };

  const handleProfileClick = (profileId, profileType, currentPage) => {
    let url = "/profile";

    localStorage.setItem("subscriptionCurrentPage", currentPage);

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
      default:
        url = `/profile/${profileId}`;
        break;
    }

    window.location.href = url;
  };

  const handleSave = async (planId) => {
    const plan = subscriptions.find((p) => p._id === planId);
    if (!plan) {
      alert("Plan not found.");
      return;
    }

    const formData = new FormData();
    formData.append('planId', plan._id);
    formData.append('profileType', plan.profileType);
    formData.append('trialPeriod', plan.trialPeriod);
    formData.append('duration', plan.duration);
    formData.append('amount', plan.amount);
    formData.append('description', plan.description || '');

    if (selectedFiles[planId]) {
      formData.append('photo', selectedFiles[planId]);
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/v1/subscription/updatePlan`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {}, // Do NOT set Content-Type
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to update subscription plan.");
      }

      setEditing(null);
      fetchSubscriptions();
      alert("Subscription plan updated successfully.");
    } catch (err) {
      alert(err.message || "Failed to update subscription plan.");
    }
  };

  const handleCancel = () => setEditing(null);
  const handleEditClick = (planId) => setEditing(planId);

  const handleDeletePlan = async (planId) => {
    if (window.confirm("Are you sure you want to delete this subscription plan?")) {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${BASE_URL}/api/v1/subscription/deletePlan/${planId}`,
          {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Failed to delete plan.");
        }
        alert("Subscription plan deleted successfully.");
        fetchSubscriptions(); // Refresh the plans list
      } catch (err) {
        alert(err.message || "Failed to delete plan.");
      }
    }
  };

  const handleDeleteSubscriptionRecord = async (id) => {
    if (window.confirm("Are you sure you want to delete this subscription record?")) {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${BASE_URL}/api/v1/subscription/deleteRecord/${id}`,
          {
            method: "DELETE",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.message || "Failed to delete subscription record.");
        }
        alert("Subscription record deleted successfully.");
        fetchSubscriptionRecords(); // Refresh the records list
      } catch (err) {
        alert(err.message || "Failed to delete subscription record.");
      }
    }
  };

  const openModal = (record) => setExpandedRecord(record);
  const closeModal = () => setExpandedRecord(null);

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  if (loading) return <div>{loading ? (
    <div className="flex justify-center items-center mt-60 py-10">
      <FaSpinner className="animate-spin  text-3xl text-white" /><span className="text-white font-extrabold text-2xl pl-5
        ">Loading</span>
    </div>
  ) : (
    <div className="data-display">
      {filteredUsers.length > 0 ? (
        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
        </table>
      ) : (
        <div className="text-center py-10 text-slate-700">No data found.</div>
      )}
    </div>
  )}</div>;

  return (
    <div className="bg-transparent p-8 pt-0">
      <PageHeader title="Manage Subscriptions" />

      {/* Subscription Plans Section */}
      {subscriptions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold">Subscription Plans</h2>
          <div class="justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mb-6"
            >
              Create New Plan
            </button>
          </div>
          <div className="mt-6 flex justify-center items-start gap-4 flex-wrap">
            {subscriptions.map((plan) => (
              <div key={plan._id} className="bg-white p-4 rounded-lg shadow-md w-96">
                <div className="bg-slate-900 text-white p-4 rounded-t-lg flex justify-between items-center">
                  <h2 className="text-lg">{plan.profileType} Subscription</h2>
                  <button onClick={() => handleEditClick(plan._id)} className="text-white hover:text-gray-300">
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan._id)}
                    className="text-red-400 hover:text-red-600"
                    title="Delete Plan"
                  >
                    <FaRegTimesCircle />
                  </button>
                </div>
                <div className="mt-4">
                  {editing === plan._id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Trial Period (in days)</label>
                        <input
                          type="number"
                          name="trialPeriod"
                          value={plan.trialPeriod}
                          onChange={(e) => handleInputChange(e, plan._id)}
                          className="mt-1 block w-full border px-3 py-2 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Subscription Duration (in months)</label>
                        <input
                          type="number"
                          name="duration"
                          value={plan.duration}
                          onChange={(e) => handleInputChange(e, plan._id)}
                          className="mt-1 block w-full border px-3 py-2 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Amount (INR)</label>
                        <input
                          type="number"
                          name="amount"
                          value={plan.amount}
                          onChange={(e) => handleInputChange(e, plan._id)}
                          className="mt-1 block w-full border px-3 py-2 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Photo (optional)</label>
                        <input
                          type="file"
                          name="photo"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, plan._id)}
                          className="mt-1 block w-full border px-3 py-2 rounded-md"
                        />
                      </div>
                      <div className="mt-4 flex justify-end gap-4">
                        <button
                          onClick={() => handleSave(plan._id)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>Trial Period: {plan.trialPeriod} days</p>
                      <p>Duration: {plan.duration} months</p>
                      <p>Amount: ₹{plan.amount}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription Records Table */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold text-white">Subscription Records</h2>
        <div className="overflow-x-auto mt-4">
          <div className="flex flex-wrap gap-4 mb-4">
            <input
              type="text"
              placeholder="User ID"
              value={filters.userId}
              onChange={e => setFilters({ ...filters, userId: e.target.value })}
              className="border px-2 py-1 rounded"
            />
            <input
              type="text"
              placeholder="Name"
              value={filters.username}
              onChange={e => setFilters({ ...filters, username: e.target.value })}
              className="border px-2 py-1 rounded"
            />
            <input
              type="text"
              placeholder="Service"
              value={filters.service}
              onChange={e => setFilters({ ...filters, service: e.target.value })}
              className="border px-2 py-1 rounded"
            />
            <input
              type="number"
              placeholder="Amount"
              value={filters.amount}
              onChange={e => setFilters({ ...filters, amount: e.target.value })}
              className="border px-2 py-1 rounded"
            />
            <input
              type="date"
              placeholder="Payment Date"
              value={filters.paymentDate}
              onChange={e => setFilters({ ...filters, paymentDate: e.target.value })}
              className="border px-2 py-1 rounded"
            />
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="border px-2 py-1 rounded"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
              {/* Add more statuses as needed */}
            </select>
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">UserId</th>
                <th className="px-4 py-2 border">User Name</th>
                <th className="px-4 py-2 border">Mobile</th>
                <th className="px-4 py-2 border">Service</th>
                <th className="px-4 py-2 border">Amount</th>
                <th className="px-4 py-2 border">Duration</th>
                <th className="px-4 py-2 border">Trial</th>
                <th className="px-4 py-2 border">Start Date</th>
                <th className="px-4 py-2 border">End Date</th>
                <th className="px-4 py-2 border">Payment Date</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Action</th>
                <th className="px-4 py-2 border">View</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-4 py-2 text-center">
                    No records available
                  </td>
                </tr>
              ) : (
                currentRecords.map((record) => (
                  <tr key={record._id}>
                    <td className="px-4 py-2 border">{record.userId?.userId || "N/A"}</td>
                    <td className="px-4 py-2 border text-blue-600 cursor-pointer hover:text-blue-800 font-semibold"
                      onClick={() =>
                        handleProfileClick(
                          record.userId?.userId,
                          record.service?.serviceType, currentPage
                        )
                      }>{record.userId?.username || "N/A"}</td>

                    <td className="px-4 py-2 border">{record.userId?.mobileNo || "N/A"}</td>
                    <td className="px-4 py-2 border">{record.service?.serviceType || "N/A"}</td>
                    <td className="px-4 py-2 border">₹{record.service?.amount || "N/A"}</td>
                    <td className="px-4 py-2 border">{record.service?.duration || "N/A"} months</td>
                    <td className="px-4 py-2 border">{record.service?.trialPeriod || "N/A"} days</td>
                    <td className="px-4 py-2 border">{record.service?.startDate ? new Date(record.service.startDate).toLocaleDateString() : "N/A"}</td>
                    <td className="px-4 py-2 border">{record.service?.endDate ? new Date(record.service.endDate).toLocaleDateString("en-GB") : "N/A"}</td>
                    <td className="px-4 py-2 border">{record.paymentDate ? new Date(record.paymentDate).toLocaleDateString("en-GB") : "N/A"}</td>
                    <td className="px-4 py-2 border">{record.service?.status || "N/A"}</td>
                    <td className="px-4 py-2 border">
                      <button onClick={() => handleDeleteSubscriptionRecord(record._id)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600">
                        <FaRegTimesCircle />
                      </button>
                    </td>
                    <td className="px-4 py-2 border">
                      <button onClick={() => openModal(record)} className="text-blue-600 hover:text-blue-800">
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination totalPages={totalPages} currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>

      {/* Modal */}
      <Modal
        show={expandedRecord !== null}
        onClose={closeModal}
        title="Subscription Payment Details"
      >
        {expandedRecord && (
          <div>
            <p><strong>User Name:</strong> {expandedRecord.userId?.username}</p>
            <p><strong>User Mobile:</strong> {expandedRecord.userId?.mobileNo}</p>
            <p><strong>Service Type:</strong> {expandedRecord.service?.serviceType}</p>
            <p><strong>Amount:</strong> ₹{expandedRecord.service?.amount}</p>
            <p><strong>Duration:</strong> {expandedRecord.service?.duration} months</p>
            <p><strong>Trial Period:</strong> {expandedRecord.service?.trialPeriod} days</p>
            <p><strong>Subscription Start Date:</strong> {expandedRecord.service?.startDate
              ? new Date(expandedRecord.service.startDate).toLocaleDateString("en-GB")
              : "N/A"}
            </p>
            <p><strong>Subscription End Date:</strong> {expandedRecord.service?.endDate
              ? new Date(expandedRecord.service.endDate).toLocaleDateString("en-GB")
              : "N/A"}
            </p>
            <p><strong>Payment Status:</strong> {expandedRecord.service?.status}</p>

            <div className="mt-4">
              <h3 className="text-xl font-semibold text-gray-700">Payment Information:</h3>
              <p><strong>Razorpay Payment ID:</strong> {expandedRecord.paymentDetails?.razorpay_payment_id}</p>
              <p><strong>Razorpay Order ID:</strong> {expandedRecord.paymentDetails?.razorpay_order_id}</p>
              <p><strong>Razorpay Signature:</strong> {expandedRecord.paymentDetails?.razorpay_signature}</p>
            </div>
          </div>
        )}
      </Modal>
      <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Subscription Plan">
        <form
          onSubmit= {handleCreatePlan}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Profile Type</label>
            <select
              name="profileType"
              value={newPlan.profileType}
              onChange={handleNewPlanChange}
              className="mt-1 block w-full border px-3 py-2 rounded-md"
              required
            >
              <option value="">Select</option>
              <option value="Biodata">Biodata</option>
              <option value="Pandit">Pandit</option>
              <option value="Kathavachak">Kathavachak</option>
              <option value="Jyotish">Jyotish</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Trial Period (days)</label>
            <input
              type="number"
              name="trialPeriod"
              value={newPlan.trialPeriod}
              onChange={handleNewPlanChange}
              className="mt-1 block w-full border px-3 py-2 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (months)</label>
            <input
              type="number"
              name="duration"
              value={newPlan.duration}
              onChange={handleNewPlanChange}
              className="mt-1 block w-full border px-3 py-2 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount (INR)</label>
            <input
              type="number"
              name="amount"
              value={newPlan.amount}
              onChange={handleNewPlanChange}
              className="mt-1 block w-full border px-3 py-2 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={newPlan.description}
              onChange={handleNewPlanChange}
              className="mt-1 block w-full border px-3 py-2 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Photo (optional)</label>
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handleNewPhotoChange}
              className="mt-1 block w-full border px-3 py-2 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
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

export default SubscriptionManagementPage;
