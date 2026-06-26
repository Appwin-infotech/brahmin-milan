import { AiFillPlusCircle, AiOutlineUserAdd } from "react-icons/ai";
import { useState, useEffect } from "react";
import { FaSpinner, FaTrash, FaTrashAlt, FaXing } from "react-icons/fa";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL, subCasteOptions } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";
import { Link } from "react-router-dom";
import { getPhotoUrl } from "../utils/imageHelpers";

const DharamsalaPage = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  // Pending requests filters
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [pendingCityFilter, setPendingCityFilter] = useState("");
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");
  const [addingDharmshala, setAddingDharmshala] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // Filtered requests
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = filteredRequests.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const headers = getAuthHeaders();

  const fetchDharamshalaData = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/getAllDharmshala`,
        {
          method: "GET",
          headers: headers,
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
          throw new Error(data.message || "Failed to fetch Dharamshala data.");
        }
      }

      if (data.status) {
        setPendingRequests(data.data);
        setFilteredRequests(data.data);
        setLoading(false);
      } else {
        toast.error(data.message || "Failed to update status!");
      }
    } catch (error) {
      // setError("Error fetching Dharamshala data");
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this Dharmashala profile?"
      )
    ) {
      try {
        const response = await fetch(
          `${BASE_URL}/api/v1/admin/deleteDharmshala/${id}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          }
        );
        const data = await response.json();
        if (data.status) {
          toast.success(data.message);
          // Remove from state
          setPendingRequests((prev) => prev.filter((req) => req._id !== id));
          setFilteredRequests((prev) => prev.filter((req) => req._id !== id));
        } else {
          toast.error(data.message || "Failed to delete Dharmshala profile.");
        }
      } catch (error) {
        console.error("Error deleting Dharmshala profile:", error.message);
        toast.error("Failed to delete Dharmshala profile.");
      }
    }
  };

  useEffect(() => {
    fetchDharamshalaData();
  }, []);

  const filterRequests = (requests, query, city, startDate, endDate) => {
    let filtered = requests;

    // Search Filter
    if (query) {
      filtered = filtered.filter(
        (req) =>
          req.dharmshalaName.toLowerCase().includes(query.toLowerCase()) ||
          req.subCaste.toLowerCase().includes(query.toLowerCase())
      );
    }

    // City Filter
    if (city) {
      filtered = filtered.filter((req) =>
        req.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Date Range Filter
    if (startDate && endDate) {
      filtered = filtered.filter((req) => {
        const requestDate = new Date(req.createdAt);
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        // Normalize dates to ignore the time part
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);

        return requestDate >= startDateObj && requestDate <= endDateObj;
      });
    }
    return filtered;
  };

  const handlePendingFilters = (
    newQuery = pendingSearchQuery,
    newCity = pendingCityFilter,
    newStartDate = pendingStartDate,
    newEndDate = pendingEndDate
  ) => {
    const filtered = filterRequests(
      pendingRequests,
      newQuery,
      newCity,
      newStartDate,
      newEndDate
    );

    setFilteredRequests(filtered); // Update filtered requests state
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (imageFiles.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 images.");
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
  };

  // Remove a specific image
  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddDharmshala = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData();
    formData.append("activistId", form.activistId.value);
    formData.append("dharmshalaName", form.dharmshalaName.value);
    formData.append("subCaste", form.subCaste.value);
    formData.append("city", form.city.value);
    formData.append("description", form.description.value);
    formData.append("mobileNo", form.mobileNo.value);

    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/create-DharmshalaByAdmin`,
        {
          method: "POST",
          headers: getAuthHeaders(), // DO NOT set Content-Type here
          body: formData,
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
          throw new Error(data.message || "Failed to add Dharmshala");
        }
      }
      if (data.status) {
        toast.success(data.message || "Dharmshala Added Successfully");
        fetchDharamshalaData();
        setImageFiles([]);
        setAddingDharmshala(false);
      }
    } catch (error) {
      toast.error(error.message || "Error while Adding New Dharmshala");
      setImageFiles([]);
      setAddingDharmshala(false);
    }
  };

  // Redirect to User Profile or Reported Profile
  const handleProfileClick = (currentPage) => {
    // Store the current page in localStorage
    localStorage.setItem("dharmashalaCurrentPage", currentPage);
  };

  useEffect(() => {
    const savedPage = localStorage.getItem("dharmashalaCurrentPage");
    if (savedPage) {
      setCurrentPage(Number(savedPage)); // set to page 45, for example
      localStorage.removeItem("dharmashalaCurrentPage"); // optional
    }
  }, []);

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
    <div className="min-h-screen p-6 custom-scroll">
      <PageHeader title="Dharamsalas" />

      {/* Top bar */}
      <div className="flex items-center mb-4">
        <button
          className="ml-auto bg-white border border-white text-gray-900 p-2 text-bold rounded-full  hover:bg-gray-900 hover:text-white flex items-center"
          onClick={() => setAddingDharmshala(true)}
        >
          <AiFillPlusCircle size={20} />{" "}
          <span className="ml-2">Add Dharmshala </span>
        </button>
      </div>

      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg ">
        {/* Pending Requests Filters */}

        <div className="flex-wrap  items-center space-x-4 space-y-4 ">
          <input
            type="text"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            placeholder="Search by name or requester..."
            value={pendingSearchQuery}
            onChange={(e) => {
              setPendingSearchQuery(e.target.value);
              handlePendingFilters(e.target.value);
            }}
          />
          <input
            type="text"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            placeholder="Filter by city"
            value={pendingCityFilter}
            onChange={(e) => {
              setPendingCityFilter(e.target.value);
              handlePendingFilters(pendingSearchQuery, e.target.value);
            }}
          />
          <input
            type="date"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={pendingStartDate}
            onChange={(e) => {
              setPendingStartDate(e.target.value);
              handlePendingFilters(
                pendingSearchQuery,
                pendingCityFilter,
                e.target.value,
                pendingEndDate
              );
            }}
          />
          <input
            type="date"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
            value={pendingEndDate}
            onChange={(e) => {
              setPendingEndDate(e.target.value);
              handlePendingFilters(
                pendingSearchQuery,
                pendingCityFilter,
                pendingStartDate,
                e.target.value
              );
            }}
          />
          <button
            className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            onClick={() => {
              setPendingSearchQuery("");
              setPendingCityFilter("");
              setPendingStartDate("");
              setPendingEndDate("");
              setFilteredRequests(pendingRequests); // Reset filters
            }}
          >
            Reset Filters
          </button>
        </div>

        {addingDharmshala && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
            <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
              <h2 className="text-xl font-bold mb-4 underline">
                Add Dharmshala
              </h2>
              <form onSubmit={handleAddDharmshala}>
                <input
                  type="text"
                  name="activistId"
                  placeholder="Activist ID"
                  required
                  className="border p-2 rounded-md w-full mb-2"
                />
                <input
                  type="text"
                  name="dharmshalaName"
                  placeholder="Dharmshala Name"
                  required
                  className="border p-2 rounded-md w-full mb-2"
                />
                <select
                  name="subCaste"
                  required
                  className="border p-2 rounded-md w-full mb-2"
                >
                  <option value="">Select Sub Caste</option>
                  {subCasteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  required
                  className="border p-2 rounded-md w-full mb-2"
                />
                <textarea
                  type="text"
                  name="description"
                  placeholder="Description"
                  className="border p-2 rounded-md w-full mb-2"
                />
                <input
                  type="text"
                  name="mobileNo"
                  placeholder="Mobile No"
                  required
                  className="border p-2 rounded-md w-full mb-2"
                />
                <div className="flex flex-col space-y-4">
                  <label className="font-semibold">Upload Photos</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="border p-2 rounded-md"
                  />
                  <div className="flex gap-4 flex-wrap">
                    {imageFiles.map((file, index) => {
                      const imageUrl = URL.createObjectURL(file);
                      return (
                        <div key={index} className="relative">
                          <img
                            src={imageUrl}
                            alt="Preview"
                            className="w-20 h-20 object-fit rounded-md cursor-pointer"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 font-sans text-white bg-red-500 p-1 rounded-full"
                          >
                            <FaTrash className="text-white w-2 h-2" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    className="bg-gray-900 text-white px-4 py-1 rounded-md hover:bg-gray-600"
                    onClick={() => setAddingDharmshala(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-1 rounded-md hover:bg-green-700"
                  >
                    Add Dharmshala
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filter Result Count */}
        <div className="my-4 text-gray-700 font-medium">
          Showing {filteredRequests.length} result
          {filteredRequests.length !== 1 && "s"}
        </div>

        {/* Pending Requests Table */}
        <div className="overflow-x-auto w-full shadow-md custom-scroll">
          <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-lg overflow-hidden">
            <thead className="bg-slate-900 text-slate-100">
              <tr>
                <th className="pl-5 ">Activist ID</th>
                <th className="pl-5">Dharamsala Name</th>
                <th className="pl-5">Sub Caste</th>
                <th className="p-3">City</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-left">Images</th>
                <th className="p-3">Created Date</th>
                <th className="p-3">Operations</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-4 py-2 text-center">
                    No records available
                  </td>
                </tr>
              ) : (
                currentRecords.map((req) => (
                  <tr
                    key={req._id}
                    className="border-t border-slate-200 text-center"
                  >
                    <td className="pl-5">{req.activistId.activistId}</td>
                    <td className="pl-5">
                      <Link
                        to={`/dharmshala/${req._id}`}
                        className="text-blue-500 hover:underline"
                        onClick={() => handleProfileClick(currentPage)}
                      >
                        {req.dharmshalaName}
                      </Link>
                    </td>
                    <td className="p-3">{req.subCaste}</td>
                    <td className="p-3">{req.city}</td>
                    <td className="p-3">{req.mobileNo}</td>
                    <td className="p-3 flex gap-2 whitespace-nowrap overflow-x-auto">
                      {req.images.map((img, index) => (
                        <img
                          key={index}
                          src={getPhotoUrl(img)}
                          alt="Preview"
                          className="min-w-12 h-12 object-cover rounded-md cursor-pointer"
                          onClick={() => setSelectedImage(img)}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder-image.png";
                          }}
                        />
                      ))}
                    </td>
                    <td className="p-3">
                      {new Date(req.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-3 px-10">
                      <button
                        onClick={() => handleDelete(req._id)}
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
        {/* Image Preview Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="bg-white p-4 rounded-lg max-w-lg mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getPhotoUrl(selectedImage)}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/placeholder-image.png";
                }}
              />
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default DharamsalaPage;