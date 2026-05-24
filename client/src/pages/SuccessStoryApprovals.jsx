import React, { useEffect, useState } from "react";
import moment from "moment";
import { toast, ToastContainer } from "react-toastify";
import { BASE_URL, IMAGE_URL } from "../utils/constants";
import Pagination from "../components/common/Pagination";
import { FaEye } from "react-icons/fa";

const SuccessStoryApprovals = () => {
  const [stories, setStories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedStory, setSelectedStory] = useState(null);
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
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/admin/getAllStoryRequests`,
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
        setStories(data.data);
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

  useEffect(() => {
    const handleNewStory = (e) => {
      const newRequest = e.detail;
      console.log("newStory:", newRequest);

      if (!newRequest || !newRequest._id) return; // fallback will handle

      setStories((prev) => [newRequest, ...prev]);
    };

    window.addEventListener("new-StoryRequest", handleNewStory);
    return () => {
      window.removeEventListener("new-StoryRequest", handleNewStory);
    };
  }, []);

  // Redirect to User Profile or Reported Profile
  const handleProfileClick = (profileId,currentPage) => {

    localStorage.setItem("storyApprovalCurrentPage", currentPage);

      let  url = `/profile/${profileId}`;
        
    window.location.href = url; // Navigate to the correct profile page
  };

    useEffect(() => {
      const savedPage = localStorage.getItem("storyApprovalCurrentPage");
      if (savedPage) {
        setCurrentPage(Number(savedPage)); // set to page 45, for example
        localStorage.removeItem("storyApprovalCurrentPage"); // optional
      }
    }, []);

  const handleApproval = async (isApproved, storyId) => {
    const status = isApproved === "approved" ? "approved" : "rejected";

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/reviewSuccessStory/${status}/${storyId}`,
        {
          method: "POST",
          headers: headers,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      toast.success(data.message || "Status updated");
      fetchSuccessStories(); // refresh list
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredStories = stories.filter((story) => {
    const matchName =
      story.brideName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.groomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.userId.userId
        ?.toLowerCase()
        .includes(searchTerm.toLocaleLowerCase());
    !searchTerm; // Allow all if no searchTerm

    const matchStatus = selectedStatus
      ? story.status?.toLowerCase() === selectedStatus.toLowerCase()
      : true; // Allow all if no status selected

    return matchName && matchStatus;
  });

  //pagination lo
  const totalPages = Math.ceil(filteredStories.length / storiesPerPage);
  const indexOfLastRecord = currentPage * storiesPerPage;
  const indexOfFirstRecord = indexOfLastRecord - storiesPerPage;
  const currentStories = filteredStories.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const handleView = (id) => {
    const story = filteredStories.find((story) => story._id === id);
    setSelectedStory(story);
  };

  const closeModal = () => {
    setSelectedStory(null);
  };

  return (
    <div className="min-h-screen sm:p-2 md:p-8 pt-0">
      <h2 className="text-2xl font-semibold mb-4 text-white">
        Success Story Approvals
      </h2>

      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            className="border rounded-md p-2"
            placeholder="Search by BrideName..GroomName.. RequestBy"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="p-3">RequestBy</th>
              <th className="p-3">GroomName</th>
              <th className="p-3">BrideName</th>
              <th className="p-3">Submission Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
              <th className="p-3">View</th>
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
                  <td
                    className="py-3 px-4 text-blue-600 cursor-pointer hover:underline"
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
                  <td className="p-3 capitalize">
                    <span className="p-1 bg-yellow-200 border rounded-md">
                      {story.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      className="p-2 border rounded-md text-center bg-white text-gray-900"
                      onChange={(e) =>
                        handleApproval(e.target.value, story?._id)
                      }
                      disabled={story.status === "approved"}
                    >
                      <option value="">Select Action</option>
                      <option
                        value="approved"
                        className="bg-green-500 text-white font-bold"
                      >
                        Approve
                      </option>
                      <option
                        value="rejected"
                        className="bg-red-500 text-white font-bold"
                      >
                        Reject
                      </option>
                    </select>
                  </td>

                  <td className="px-4 py-2 ">
                    <button
                      onClick={() => handleView(story._id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEye />
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
      {selectedStory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative ml-14 mt-20">
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
                    src={IMAGE_URL+selectedStory.photoUrl}
                    alt="Wedding"
                    className="rounded-lg shadow-md md:max-h-72 object-cover"
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

export default SuccessStoryApprovals;
