import React, { useEffect, useState } from "react";
import moment from "moment";
import { toast, ToastContainer } from "react-toastify";
import { BASE_URL } from "../utils/constants";
import Pagination from "../components/common/Pagination";
import { FaEdit, FaEye, FaTrashAlt } from "react-icons/fa";

const SuccessStories = () => {
  const [stories, setStories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedStory, setSelectedStory] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const storiesPerPage = 10;

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

  const fetchSuccessStories = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/get-successStories`,
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
          throw new Error(data.message || "Failed to fetch stories.");
        }
      }

      if (data.status && data.data.length) {
        setStories(data?.data);
        // toast.success(data.message);
      } else {
        setStories([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to fetch story requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuccessStories();
  }, []);

  const filteredStories = stories.filter((story) => {
    const matchName =
      story.brideName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.groomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.userId.userId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = selectedStatus
      ? story.status?.toLowerCase() === selectedStatus.toLowerCase()
      : true;

    const storyDate = moment(story.createdAt).startOf("day");

    const matchStartDate = startDate
      ? storyDate.isSameOrAfter(moment(startDate).startOf("day"))
      : true;

    const matchEndDate = endDate
      ? storyDate.isSameOrBefore(moment(endDate).endOf("day"))
      : true;

    return matchName && matchStatus && matchStartDate && matchEndDate;
  });

  // Redirect to User Profile or Reported Profile
  const handleProfileClick = (profileId,currentPage) => {

    localStorage.setItem("storyCurrentPage", currentPage);

   let url = `/profile/${profileId}`;
    

    window.location.href = url; // Navigate to the correct profile page
  };

      useEffect(() => {
        const savedPage = localStorage.getItem("storyCurrentPage");
        if (savedPage) {
          setCurrentPage(Number(savedPage)); // set to page 45, for example
          localStorage.removeItem("storyCurrentPage"); // optional
        }
      }, []);

  const handleView = (id) => {
    const story = filteredStories.find((story) => story._id === id);
    setSelectedStory(story);
  };

  const handleEdit = (id) => {
    const story = stories.find((s) => s._id === id);
    setEditedStory(story);
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/editSuccessStory/${editedStory._id}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(editedStory),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Success Story updated!");
      fetchSuccessStories();
      setIsEditing(false);
      setEditedStory(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this Success Story from records.?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/delete-successStory/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to delete Success Story.");

      // Show success message or toast if you're using a library
      alert("Success Story deleted successfully.");
      toast.success("Success Story deleted successfully.");

      // Refresh data after deletion
      fetchSuccessStories();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const closeModal = () => {
    setSelectedStory(null);
  };

  //pagination lo
  const totalPages = Math.ceil(filteredStories.length / storiesPerPage);
  const indexOfLastRecord = currentPage * storiesPerPage;
  const indexOfFirstRecord = indexOfLastRecord - storiesPerPage;
  const currentStories = filteredStories.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">
      <h2 className="text-2xl font-semibold mb-4 text-white">
        Success Stories Record
      </h2>

      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        <div className="flex flex-wrap gap-4 mb-4 overflow-x-auto">
          <input
            className="border rounded-md p-2"
            placeholder="Search by BrideName..GroomName.. RequestBy"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <input
            type="date"
            className="border rounded-md p-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            type="date"
            className="border rounded-md p-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            onClick={() => {
              setSearchTerm("");
              setStartDate("");
              setEndDate("");
              setSelectedStatus("");
            }}
            className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Clear Filters
          </button>
        </div>

        {/* Filter Result Count */}
        <div className="mb-4 text-gray-700 font-medium">
          Showing {filteredStories.length} result
          {filteredStories.length !== 1 && "s"}
        </div>

        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="p-3">RequestBy</th>
              <th className="p-3">GroomName</th>
              <th className="p-3">BrideName</th>
              <th className="p-3">Approved Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentStories.length === 0 ? (
              <tr>
                <td colSpan="13" className="px-4 py-2 text-center bg-white">
                  No records available
                </td>
              </tr>
            ) : (
              currentStories.map((story) => (
                <tr key={story._id} className="border-b bg-white text-center">
                  <td className="p-3">{story?.userId === story?.groomDetails?.userId ? story?.groomBiodataId : story?.brideBiodataId}</td>
                  <td className="py-3 px-4 text-blue-600 cursor-pointer hover:underline"
                    onClick={() =>
                      handleProfileClick(story?.groomBiodataId, currentPage)
                    }
                  >{`${story.groomName} (${story.groomBiodataId})`}</td>
                  <td
                    className="py-3 px-4 text-blue-600 cursor-pointer hover:underline"
                    onClick={() =>
                      handleProfileClick(story?.brideBiodataId, currentPage)
                    }
                  >{`${story.brideName} (${story.brideBiodataId})`}</td>
                  <td className="p-3">
                    {moment(story.createdAt).format("DD MMM YYYY")}
                  </td>

                  <td className="px-4 py-2  space-x-2">
                    <button
                      onClick={() => handleView(story._id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleEdit(story._id)}
                      className="text-yellow-500 hover:text-yellow-700"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(story._id)}
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
        {/* ✅ Pagination Component */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* VIEW MODAL */}
      {selectedStory && !isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative ml-14">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
            >
              &times;
            </button>
            <h2 className="text-xl font-semibold mb-4">
              Success Story Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedStory?.photoUrl && (
                <div>
                  <img
                    src={BASE_URL+"/"+selectedStory.photoUrl}
                    alt="Wedding"
                    className="rounded-lg shadow-md max-h-64 object-cover"
                  />
                </div>
              )}
              <div>
                <p>
                  <strong>Request By:</strong> {selectedStory?.userId?.userId}
                </p>
                <p>
                  <strong>Bride:</strong> {selectedStory?.brideName} (
                  {selectedStory?.brideBiodataId})
                </p>
                <p>
                  <strong>Groom:</strong> {selectedStory?.groomName} (
                  {selectedStory?.groomBiodataId})
                </p>
                {selectedStory?.weddingDate && (
                  <p>
                    <strong>Wedding Date:</strong>{" "}
                    {moment(selectedStory?.weddingDate).format("DD MMM YYYY")}
                  </p>
                )}
                <p>
                  <strong>Thought:</strong> {selectedStory?.thought}
                </p>
                <p>
                  <strong>Rating:</strong> {selectedStory?.rating}/5
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
{isEditing && editedStory && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-2 overflow-auto">
    <div className="bg-white rounded-lg shadow-lg w-full ml-8 max-w-3xl p-4 sm:p-6 my-8 relative overflow-y-auto max-h-[90vh]">
      <button
        onClick={() => {
          setIsEditing(false);
          setEditedStory(null);
        }}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
      >
        &times;
      </button>

      <h2 className="text-lg sm:text-xl font-semibold mb-4">
        Edit Success Story
      </h2>

      <form onSubmit={handleUpdate}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editedStory?.photoUrl && (
            <div>
              <img
                src={editedStory.photoUrl}
                alt="Wedding"
                className="rounded-lg shadow-md md:w-full max-h-64 object-cover"
              />
            </div>
          )}

          <div>
            <label className="block mb-1 font-semibold">Bride Name:</label>
            <input
              type="text"
              name="brideName"
              value={editedStory?.brideName || ""}
              onChange={(e) =>
                setEditedStory({ ...editedStory, brideName: e.target.value })
              }
              className="border rounded p-2 w-full mb-2"
            />

            <label className="block mb-1 font-semibold">
              Bride Biodata ID:
            </label>
            <input
              type="text"
              name="brideBiodataId"
              value={editedStory?.brideBiodataId || ""}
              onChange={(e) =>
                setEditedStory({
                  ...editedStory,
                  brideBiodataId: e.target.value,
                })
              }
              className="border rounded p-2 w-full mb-2"
            />

            <label className="block mb-1 font-semibold">Groom Name:</label>
            <input
              type="text"
              name="groomName"
              value={editedStory?.groomName || ""}
              onChange={(e) =>
                setEditedStory({ ...editedStory, groomName: e.target.value })
              }
              className="border rounded p-2 w-full mb-2"
            />

            <label className="block mb-1 font-semibold">
              Groom Biodata ID:
            </label>
            <input
              type="text"
              name="groomBiodataId"
              value={editedStory?.groomBiodataId || ""}
              onChange={(e) =>
                setEditedStory({
                  ...editedStory,
                  groomBiodataId: e.target.value,
                })
              }
              className="border rounded p-2 w-full mb-2"
            />

            <label className="block mb-1 font-semibold">Thought:</label>
            <textarea
              name="thought"
              value={editedStory?.thought || ""}
              onChange={(e) =>
                setEditedStory({ ...editedStory, thought: e.target.value })
              }
              className="border rounded p-2 w-full mb-2"
            />

            <label className="block mb-1 font-semibold">Rating:</label>
            <input
              type="number"
              name="rating"
              min="1"
              max="5"
              value={editedStory?.rating || ""}
              onChange={(e) =>
                setEditedStory({ ...editedStory, rating: e.target.value })
              }
              className="border rounded p-2 w-full mb-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setEditedStory(null);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
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

export default SuccessStories;
