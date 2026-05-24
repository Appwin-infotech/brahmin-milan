import React, { useState, useEffect } from "react";
import { BASE_URL, IMAGE_URL } from "../utils/constants";
import PageHeader from "../components/common/PageHeader";
import { AiFillPlusCircle, AiOutlineUserAdd } from "react-icons/ai";
import { FaEdit, FaEye, FaSpinner, FaTrashAlt } from "react-icons/fa";
import Modal from "react-modal";
import { toast, ToastContainer } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import Pagination from "../components/common/Pagination";

const CreateAdvertisement = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    section: "Top",
    startTime: "",
    endTime: "",
    targetProfileTypes: [],
  });
  // In your component state:
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState([]); // Active/Inactive
  const [filterSection, setFilterSection] = useState(""); // Top/Bottom/etc.
  const [currentPage, setCurrentPage] = useState(1);
  const advPerPage = 10;
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaMeta, setMediaMeta] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editMediaFiles, setEditMediaFiles] = useState([]);
  const [editMediaMeta, setEditMediaMeta] = useState([]);
  const [editStartDate, setEditStartDate] = useState(null);
  const [editEndDate, setEditEndDate] = useState(null);
  const [editSelectedDays, setEditSelectedDays] = useState([]);
  const [editTimeSlots, setEditTimeSlots] = useState(Array(7).fill({ from: "", to: "" }));

  // 1️⃣ Initialize 7 empty slots { from, to }
  const [timeSlots, setTimeSlots] = useState(
    Array(7).fill({ from: "", to: "" })
  );
  const [selectedDays, setSelectedDays] = useState([]);
  const [filteredAds, setFilteredAds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [advertisementData, setAdvertisementData] = useState([]);
  const [selectedAdvertisement, setSelectedAdvertisement] = useState(null);


  const profileTypes = [
    "HomePage",
    "Pandit",
    "Jyotish",
    "Kathavachak",
    "Activist",
    "Dharmshala",
    "Committee",
    "Biodata",
    "EventPost",
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch existing ads
  const fetchAdvertisementData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/get-Advertisement`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (!res.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        } else {
          throw new Error(
            data.message || "Failed to update advertisement status."
          );
        }
      }

      setAdvertisementData(data.data || []);
      setFilteredAds(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdvertisementData();
  }, []);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  const handleMultiSelect = (e) => {
    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
    setForm((f) => ({ ...f, targetProfileTypes: opts }));
  };
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setMediaFiles((prev) => [...prev, ...files]);
    setMediaMeta((prev) => [
      ...prev,
      ...files.map(() => ({
        resolution: { width: 400, height: 180 },
        duration: "",
        hyperlink: "",
      })),
    ]);
  };
  const removeMedia = (idx) => {
    setMediaFiles((f) => f.filter((_, i) => i !== idx));
    setMediaMeta((m) => m.filter((_, i) => i !== idx));
  };
  const handleMetaChange = (idx, field, value) => {
    setMediaMeta((m) =>
      m.map((slot, i) =>
        i === idx
          ? field === "duration"
            ? { ...slot, duration: value }
            : field === "hyperlink"
              ? { ...slot, hyperlink: value }
              : { ...slot, resolution: { ...slot.resolution, [field]: value } }
          : slot
      )
    );
  };

  const handleDayOfWeekChange = (e, dayIndex) => {
    if (e.target.checked) {
      setSelectedDays((d) => [...d, dayIndex]);
    } else {
      setSelectedDays((d) => d.filter((i) => i !== dayIndex));
    }
  };
  // 2️⃣ Correctly merge into slot
  const handleTimeChange = (dayIndex, type, val) => {
    setTimeSlots((slots) =>
      slots.map((slot, i) => (i === dayIndex ? { ...slot, [type]: val } : slot))
    );
  };

  const handleView = (id) => {
    const adv = advertisementData.find((ad) => ad._id === id);
    setSelectedAdvertisement(adv);
  };

  const handleEdit = (id) => {
    const adv = advertisementData.find((ad) => ad._id === id);
    if (!adv) return;

    setEditForm({
      ...adv,
      targetProfileTypes: adv.targetProfileTypes || [],
      section: adv.section || "Top",
      title: adv.title || "",
      description: adv.description || "",
    });
    setEditMediaFiles([]); // New uploads
    setEditMediaMeta(adv.media ? adv.media.map(m => ({
      resolution: m.resolution || { width: 400, height: 180 },
      duration: m.duration || "",
      hyperlink: m.hyperlink || "",
    })) : []);
    setEditStartDate(adv.startTime ? new Date(adv.startTime) : null);
    setEditEndDate(adv.endTime ? new Date(adv.endTime) : null);

    // Handle repeatSchedule
    if (adv.repeatSchedule) {
      setEditSelectedDays(adv.repeatSchedule.daysOfWeek || []);
      setEditTimeSlots(
        adv.repeatSchedule.timeSlots && adv.repeatSchedule.timeSlots.length === 7
          ? adv.repeatSchedule.timeSlots
          : Array(7).fill({ from: "", to: "" })
      );
    } else {
      setEditSelectedDays([]);
      setEditTimeSlots(Array(7).fill({ from: "", to: "" }));
    }

    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("title", editForm.title);
    fd.append("description", editForm.description);
    if (editStartDate) fd.append("startTime", editStartDate.toISOString());
    if (editEndDate) fd.append("endTime", editEndDate.toISOString());
    fd.append("section", editForm.section);
    fd.append("targetProfileTypes", JSON.stringify(editForm.targetProfileTypes));
    // Repeat schedule
    if (editSelectedDays.length > 0) {
      fd.append(
        "repeatSchedule",
        JSON.stringify({
          daysOfWeek: editSelectedDays,
          timeSlots: editSelectedDays.map(i => ({
            from: editTimeSlots[i].from,
            to: editTimeSlots[i].to,
          })),
        })
      );
    }
    fd.append("mediaMeta", JSON.stringify(editMediaMeta));
    editMediaFiles.forEach(f => fd.append("media", f));

    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/updateAdvertisementByAdmin/${editForm._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Advertisement updated!");
      setIsEditModalOpen(false);
      fetchAdvertisementData();
    } catch (err) {
      toast.error(err.message);
    }
  };


  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this advertisement?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/delete-Advertisement/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (!res.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        } else {
          throw new Error(
            data.message || "Failed to update advertisement status."
          );
        }
      }

      alert("Advertisement deleted successfully");
      // Refresh list after deletion
      fetchAdvertisementData();
    } catch (err) {
      alert("Failed to delete advertisement: " + err.message);
    }
  };

  const closeModal = () => {
    setSelectedAdvertisement(null);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (!form.section.trim()) errs.section = "Section required";
    if (!form.targetProfileTypes.length)
      errs.targetProfileTypes = "Select at least one profile type";
    if (!mediaFiles.length)
      errs.mediaFiles = "At least one media file is required";
    mediaMeta.forEach((m, i) => {
      if (!m.duration || !m.resolution.width || !m.resolution.height) {
        errs[`mediaMeta-${i}`] = "Fill duration & resolution";
      }
    });

    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setMessage("");

    // 3️⃣ Build real repeatSchedule
    const repeatSchedulePayload =
      selectedDays.length > 0
        ? {
          daysOfWeek: selectedDays,
          timeSlots: selectedDays.map((i) => ({
            from: timeSlots[i].from,
            to: timeSlots[i].to,
          })),
        }
        : null;

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    if (startDate) fd.append("startTime", startDate.toISOString());
    if (endDate) fd.append("endTime", endDate.toISOString());
    fd.append("section", form.section); // Append section here
    if (repeatSchedulePayload)
      fd.append("repeatSchedule", JSON.stringify(repeatSchedulePayload));
    fd.append("targetProfileTypes", JSON.stringify(form.targetProfileTypes));
    fd.append("mediaMeta", JSON.stringify(mediaMeta));
    mediaFiles.forEach((f) => fd.append("media", f));

    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/createAdvertisement`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage("Advertisement created!");
      setForm({
        title: "",
        section: "Top",
        description: "",
        startTime: "",
        endTime: "",
        targetProfileTypes: [],
      });
      setMediaFiles([]);
      setMediaMeta([]);
      setSelectedDays([]);
      setTimeSlots(Array(7).fill({ from: "", to: "" }));
      setMessage("");
      setIsModalOpen(false);
      fetchAdvertisementData();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (advertisementId, isActive) => {
    try {
      const updatedStatus = !isActive;

      const response = await fetch(
        `${BASE_URL}/api/v1/admin/update-advertisementStatus/${advertisementId}`,
        {
          method: "PATCH",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json", // ensure proper JSON format
          },
          body: JSON.stringify({
            isActive: updatedStatus,
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
          throw new Error(
            data.message || "Failed to update advertisement status."
          );
        }
      }

      if (data.status) {
        toast.success(
          data.message || "Advertisement status updated successfully!"
        );
      } else {
        toast.error(data.message || "Failed to update advertisement status!");
      }


      setAdvertisementData((prevData) =>
        prevData.map((adv) =>

          adv._id === advertisementId
            ? { ...adv, isActive: updatedStatus }
            : adv
        ),
   
      );

           setFilteredAds((prevData) =>
        prevData.map((adv) =>

          adv._id === advertisementId
            ? { ...adv, isActive: updatedStatus }
            : adv
        ),
   
      );

      
    } catch (error) {
      console.error("Error updating advertisement status:", error);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // convert 0 to 12 for 12 AM

    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
  };

  const filterAds = () => {

    let filtered = advertisementData;

    // Search Term Filtering
    if (searchTerm) {
      filtered = filtered.filter((ad) =>
        ad.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status Filtering
    if (filterStatus.length > 0) {
      filtered = filtered.filter((ad) => String(ad.isActive) === filterStatus);
    }

    // Section Filtering
    if (filterSection) {
      filtered = filtered.filter((ad) => ad.section === filterSection);
    }

    // Date Range Filtering
    if (startDate && endDate && !isNaN(new Date(startDate)) && !isNaN(new Date(endDate))) {
      filtered = filtered.filter((ad) => {
        const adStartDate = new Date(ad.startTime);
        const adEndDate = new Date(ad.endTime);

        // Parse the user-provided startDate and endDate
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        // Normalize both the user-provided and ad dates to UTC with time set to the start/end of the day
        startDateObj.setUTCHours(0, 0, 0, 0);
        endDateObj.setUTCHours(23, 59, 59, 999);

        adStartDate.setUTCHours(0, 0, 0, 0);
        adEndDate.setUTCHours(23, 59, 59, 999);

        // Return ads that fall within the selected date range
        return adStartDate >= startDateObj && adEndDate <= endDateObj;
      });
    }

    setFilteredAds(filtered);
  };


  const resetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setFilterSection("");
    setFilterStatus([]);
    setFilteredAds(advertisementData); // Reset filtered ads to the original data
  };

  useEffect(() => {
    filterAds();
  }, [searchTerm, filterStatus, startDate, endDate, filterSection]);



  // ✅ Pagination state
  const indexOfLastUser = currentPage * advPerPage;
  const indexOfFirstUser = indexOfLastUser - advPerPage;
  const currentAds = filteredAds.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredAds.length / advPerPage);


  if (loading) {
    return (
      <div className="flex justify-center items-center mt-60">
        <FaSpinner className="animate-spin text-3xl text-gray-600" />
        <span className="ml-4 text-xl text-gray-600">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 custom-scroll">
      <PageHeader title="Advertisements" />

      {/* Top bar */}
      <div className="flex items-center mb-4">
        <h1 className="text-xl font-semibold text-white">All Advertisements</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-auto bg-white border border-white text-gray-900 p-2 text-bold rounded-full  hover:bg-gray-900 hover:text-white flex items-center"
        >
          <AiFillPlusCircle size={20} />{" "}
          <span className="ml-2">Add Advertisement </span>
        </button>
      </div>

      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">

        {/* Top bar */}
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by title"
            className="border p-2 rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            className="border p-2 rounded"
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
          >
            <option value="">All Sections</option>
            <option value="Top">Top</option>
            <option value="Bottom">Bottom</option>
          </select>
          <input
            type="date"
            className="border p-2 rounded"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="border p-2 rounded"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            onClick={resetFilters}
            className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Reset Filters
          </button>

        </div>
        {/* Filter Result Count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredAds.length} result
          {filteredAds.length !== 1 && "s"}
        </div>

        {/* Table */}
        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Start Time</th>
              <th className="px-4 py-2">End Time</th>
              <th className="py-3 px-4 text-left">Access</th>
              <th className="px-4 py-2">Profile Types</th>
              <th className="px-4 py-2">Media</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {currentAds.length > 0 ? (
              currentAds.map((ad, idx) => (
                <tr key={idx} className="text-center">
                  <td className="px-4 py-2">{ad.title}</td>
                  <td className="px-4 py-2">{ad.section}</td>
                  <td className="px-4 py-2">
                    {ad.startTime ? formatDateTime(ad.startTime) : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {ad.endTime ? formatDateTime(ad.endTime) : "-"}
                  </td>

                  <td className="py-3 px-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={ad.isActive}
                        onChange={() => handleToggle(ad._id, ad.isActive)}
                      />
                      <span className="w-11 h-6 bg-slate-200 rounded-full inline-flex items-center">
                        <span
                          className={`w-4 h-4 rounded-full transform ${ad.isActive
                            ? "translate-x-6 bg-green-500"
                            : "translate-x-1 bg-red-500"
                            }`}
                        ></span>
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-2">
                    {ad.targetProfileTypes.join(", ")}
                  </td>
                  <td className="px-4 py-2 space-y-1">
                    {ad.media.map((m, i) => {
                      const url = `${IMAGE_URL}${m.mediaUrl}`;
                      return m.mediaType === "video" ? (
                        <video key={i} src={url} width="80" controls />
                      ) : (
                        <img key={i} src={url} alt="" width="80" />
                      );
                    })}
                  </td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <button
                      onClick={() => handleView(ad._id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleEdit(ad._id)}
                      className="text-yellow-500 hover:text-yellow-700"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(ad._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center text-gray-500 py-4">
                  No advertisements found.
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-4xl w-full overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Create Advertisement
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-red-500 transition"
              >
                ✕
              </button>
            </div>

            {message && (
              <div className="mb-4 text-green-600 font-medium">{message}</div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              encType="multipart/form-data"
            >
              {/* Title */}
              <div>
                <label className="block font-semibold mb-1">Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Section */}
              <div>
                <label className="block font-semibold mb-1">Section *</label>
                <select
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Top">Top</option>
                  <option value="Bottom">Bottom</option>
                </select>
                {errors.section && (
                  <p className="text-red-500 text-sm mt-1">{errors.section}</p>
                )}
              </div>

              {/* Times */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-semibold mb-1">Start Time</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    showTimeSelect
                    timeFormat="hh:mm aa"
                    timeIntervals={15}
                    dateFormat="dd/MM/yyyy hh:mm aa"
                    placeholderText="Select start date and time"
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Time</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    showTimeSelect
                    timeFormat="hh:mm aa"
                    timeIntervals={15}
                    dateFormat="dd/MM/yyyy hh:mm aa"
                    placeholderText="Select end date and time"
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Repeat Schedule */}
              <div>
                <label className="block font-semibold mb-2">
                  Repeat Schedule
                </label>
                <div className="flex flex-wrap gap-4">
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(i)}
                        onChange={(e) => handleDayOfWeekChange(e, i)}
                        className="accent-purple-600"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {selectedDays.map((d) => (
                  <div key={d} className="mt-2">
                    <label className="font-medium block mb-1">
                      Time Slots for{" "}
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="time"
                        value={timeSlots[d].from}
                        onChange={(e) =>
                          handleTimeChange(d, "from", e.target.value)
                        }
                        className="border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="time"
                        value={timeSlots[d].to}
                        onChange={(e) =>
                          handleTimeChange(d, "to", e.target.value)
                        }
                        className="border px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Profile Types */}
              <div>
                <label className="block font-semibold mb-1">
                  Target Profile Types *
                </label>
                <select
                  multiple
                  value={form.targetProfileTypes}
                  onChange={handleMultiSelect}
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {profileTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.targetProfileTypes && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.targetProfileTypes}
                  </p>
                )}
              </div>

              {/* Media Upload */}
              <div>
                <label className="block font-semibold mb-2">
                  Media Files *
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="w-full text-sm"
                />
                {errors.mediaFiles && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.mediaFiles}
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {mediaFiles.map((f, i) => {
                    const isImg = f.type.startsWith("image");
                    const url = URL.createObjectURL(f);
                    return (
                      <div key={i} className="relative border p-3 rounded-lg">
                        {isImg ? (
                          <img
                            src={url}
                            alt=""
                            className="w-40 h-60 object-cover rounded"
                          />
                        ) : (
                          <video
                            src={url}
                            controls
                            className="w-full h-40 rounded"
                          />
                        )}
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <label className="text-sm">Duration:</label>
                            <input
                              type="number"
                              value={mediaMeta[i]?.duration || ""}
                              onChange={(e) =>
                                handleMetaChange(i, "duration", e.target.value)
                              }
                              className="border px-2 py-1 w-24 rounded focus:ring-purple-500"
                            />
                          </div>
                          {/* Hyperlink */}
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label
                                htmlFor="hyperlink"
                                className="block text-gray-700"
                              >
                                Hyperlink (Optional)
                              </label>
                              <input
                                type="text"
                                id="hyperlink"
                                name="hyperlink"
                                className="w-full p-2 border rounded-md"
                                value={mediaMeta[i]?.hyperlink || ""}
                                onChange={(e) => {
                                  handleMetaChange(
                                    i,
                                    "hyperlink",
                                    e.target.value
                                  );
                                }}
                                placeholder="Optional URL for redirect"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <label className="text-sm">Resolution:</label>
                            <input
                              type="number"
                              placeholder="W"
                              value={mediaMeta[i]?.resolution?.width || 400} // Default to 400
                              readOnly // Prevent editing
                              className="border px-2 py-1 w-20 rounded focus:ring-purple-500"
                            />
                            <input
                              type="number"
                              placeholder="H"
                              value={mediaMeta[i]?.resolution?.height || 180} // Default to 180
                              readOnly // Prevent editing
                              className="border px-2 py-1 w-20 rounded focus:ring-purple-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedia(i)}
                          className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition"
                        >
                          ✕
                        </button>
                        {errors[`mediaMeta-${i}`] && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors[`mediaMeta-${i}`]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-700 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition font-semibold"
                >
                  {loading ? "Creating..." : "Create Advertisement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAdvertisement && (
        <Modal
          isOpen={!!selectedAdvertisement}
          onRequestClose={closeModal}
          contentLabel="Advertisement Details"
          className="bg-white rounded-md p-6 max-w-3xl mx-auto my-8 shadow-xl outline-none max-h-[90vh] overflow-y-auto"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
          <div>
            {" "}
            {/* Scrollable content wrapper */}
            <h2 className="text-2xl font-bold mb-4">
              {selectedAdvertisement.title}
            </h2>
            <p className="text-gray-700 mb-6">
              {selectedAdvertisement.description}
            </p>
            {/* Media Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {selectedAdvertisement.media?.map((item, idx) => {
                const url = item.mediaUrl
                  ? `${BASE_URL}/${item.mediaUrl}`
                  : null;
                return (
                  <div key={idx} className="flex flex-col items-center">
                    {url ? (
                      item.mediaType === "image" ? (
                        <img
                          src={url}
                          alt={`media-${idx}`}
                          className="w-60 h-40 object-cover rounded-md"
                        />
                      ) : (
                        <video
                          src={url}
                          controls
                          className="w-60 h-40 rounded-md"
                        />
                      )
                    ) : (
                      <div className="w-60 h-40 flex items-center justify-center bg-gray-100 text-gray-500 rounded-md">
                        N/A
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {item.resolution?.width}x{item.resolution?.height}px •{" "}
                      {item.duration || 0}s
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Section */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Section:</h4>
              <p
                className={`text-sm font-semibold ${selectedAdvertisement.section === "Top"
                  ? "text-green-600"
                  : "text-red-600"
                  }`}
              >
                {selectedAdvertisement.section}
              </p>
            </div>
            {/* Start and End Time */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Advertisement Duration:</h4>
              <p className="text-gray-700 text-sm">
                {formatDateTime(selectedAdvertisement.startTime)} →{" "}
                {formatDateTime(selectedAdvertisement.endTime)}
              </p>
            </div>
            {/* Repeat Schedule */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Repeat Schedule:</h4>
              <p className="text-gray-700 text-sm mb-2">
                Days:{" "}
                {selectedAdvertisement.repeatSchedule?.daysOfWeek
                  ?.map(
                    (d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]
                  )
                  .join(", ")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedAdvertisement.repeatSchedule?.timeSlots?.map(
                  (slot, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      {slot.from} to {slot.to}
                    </div>
                  )
                )}
              </div>
            </div>
            {/* Target Profile Types */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Target Profile Types:</h4>
              <p className="text-gray-700 text-sm">
                {selectedAdvertisement.targetProfileTypes?.join(", ")}
              </p>
            </div>
            {/* Status */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Status:</h4>
              <p
                className={`text-sm font-semibold ${selectedAdvertisement.isActive
                  ? "text-green-600"
                  : "text-red-600"
                  }`}
              >
                {selectedAdvertisement.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>{" "}
          {/* End of Scrollable Content */}
        </Modal>
      )}

      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={() => setIsEditModalOpen(false)}
        className="modal bg-white p-6 rounded-lg max-w-2xl mx-auto mt-20"
        overlayClassName="overlay fixed inset-0 bg-black bg-opacity-50"
      >
        <h2 className="text-2xl font-bold mb-4">Edit Advertisement</h2>
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <input
              type="text"
              name="title"
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Title"
              required
            />
            <textarea
              name="description"
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Description"
              required
            />
            <select
              name="section"
              value={editForm.section}
              onChange={e => setEditForm({ ...editForm, section: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="Top">Top</option>
              <option value="Bottom">Bottom</option>
            </select>
            <DatePicker
              selected={editStartDate}
              onChange={date => setEditStartDate(date)}
              className="w-full p-2 border rounded"
              placeholderText="Start Time"
              showTimeSelect
              dateFormat="Pp"
            />
            <DatePicker
              selected={editEndDate}
              onChange={date => setEditEndDate(date)}
              className="w-full p-2 border rounded"
              placeholderText="End Time"
              showTimeSelect
              dateFormat="Pp"
            />
            <select
              multiple
              value={editForm.targetProfileTypes}
              onChange={e =>
                setEditForm({
                  ...editForm,
                  targetProfileTypes: Array.from(e.target.selectedOptions).map(o => o.value),
                })
              }
              className="w-full p-2 border rounded"
            >
              {profileTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {/* Media upload */}
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={e => setEditMediaFiles(Array.from(e.target.files))}
            />
            {/* Optionally show existing media */}
            <div className="flex gap-2 mt-2">
              {editForm.media && editForm.media.map((m, idx) => (
                <div key={idx}>
                  {m.mediaType === "image" ? (
                    <img src={`${BASE_URL}/${m.mediaUrl}`} alt="" className="w-20 h-12 object-cover rounded" />
                  ) : (
                    <video src={`${BASE_URL}/${m.mediaUrl}`} className="w-20 h-12 object-cover rounded" controls />
                  )}
                </div>
              ))}
            </div>
            {/* Repeat schedule, similar to your create form */}
            {/* ... */}
            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Save Changes
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

export default CreateAdvertisement;
