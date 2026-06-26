import React, { useEffect, useState } from "react";
import { BASE_URL, IMAGE_URL } from "../utils/constants";
import { toast, ToastContainer } from "react-toastify";
import {
  FaEdit,
  FaTrashAlt,
  FaEye,
  FaCommentDots,
  FaSpinner,
} from "react-icons/fa";
import Modal from "react-modal";
import Pagination from "../components/common/Pagination";
import PageHeader from "../components/common/PageHeader";

const EventPostsTable = () => {
  const [allPosts, setAllPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showLikes, setShowLikes] = useState(false);

  const [filters, setFilters] = useState({
    title: "",
    date: "",
    activistId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    postId: "",
    title: "",
    description: "",
    images: [], // URLs or base64
    date: "",
  });
  const [editImages, setEditImages] = useState([]); // For new uploads
  const [editLoading, setEditLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchEventPosts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/admin/getAllEvents`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Token expired") {
          alert("Session expired. Please login again.");
          localStorage.clear();
          window.location.href = "/login";
          return;
        }
        throw new Error(data.message || "Failed to fetch posts.");
      }

      setAllPosts(data.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtering logic
  useEffect(() => {
    let filtered = allPosts;

    if (filters.title.trim()) {
      filtered = filtered.filter((post) =>
        post.title?.toLowerCase().includes(filters.title.toLowerCase())
      );
    }

    if (filters.date) {
      filtered = filtered.filter((post) => {
        const postDate = new Date(post.date || post.createdAt)
          .toISOString()
          .split("T")[0];
        return postDate === filters.date;
      });
    }

    if (filters.activistId.trim()) {
      filtered = filtered.filter((post) =>
        post.activistDetails?.activistId
          ?.toLowerCase()
          .includes(filters.activistId.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
    setCurrentPage(1); // reset to first page on filter change
  }, [filters, allPosts]);

  useEffect(() => {
    fetchEventPosts();
  }, []);

  useEffect(() => {
    const handleNewEvents = (e) => {
      const newRequest = e.detail;
      console.log("eventPost:", newRequest);

      if (!newRequest || !newRequest._id) return; // fallback will handle

      setAllPosts((prev) => [newRequest, ...prev]);
      setFilteredPosts((prev) => [newRequest, ...prev]);
    };

    window.addEventListener("new-EventPost", handleNewEvents);
    return () => {
      window.removeEventListener("new-EventPost", handleNewEvents);
    };
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleClearFilters = () => {
    setFilters({
      title: "",
      date: "",
      activistId: "",
    });
  };

  const handleView = (id) => {
    const post = allPosts.find((p) => p._id === id);
    setSelectedPost(post);
  };

  const handleEdit = (id) => {
    const post = allPosts.find((p) => p._id === id);
    setEditForm({
      postId: post._id,
      title: post.title || "",
      description: post.description || "",
      images: post.images || [],
      date: post.createdAt
        ? new Date(post.createdAt).toISOString().split("T")[0]
        : "",
    });
    setEditImages([]);
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      const formData = new FormData();

      formData.append("postId", editForm.postId);
      formData.append("title", editForm.title);
      formData.append("description", editForm.description);
      formData.append("date", editForm.date);

      // Pass removeImages as JSON string
      const imagesToRemove = allPosts
        .find((p) => p._id === editForm.postId)
        .images.filter((img) => !editForm.images.includes(img));
      formData.append("removeImages", JSON.stringify(imagesToRemove));

      // Append new image files
      if (editImages.length > 0) {
        Array.from(editImages).forEach((file) => {
          formData.append("images", file);
        });
      }

      const res = await fetch(
        `${BASE_URL}/api/v1/admin/updateEventPostByAdmin/${editForm.postId}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Event post updated successfully!");
      setEditModalOpen(false);
      fetchEventPosts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this EventPost?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/delete-eventPost/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Refresh list after deletion
      fetchEventPosts();
    } catch (err) {
      alert("Failed to delete advertisement: " + err.message);
    }
  };
  const closeModal = () => {
    setSelectedPost(null);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Pagination slice
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstItem, indexOfLastItem);

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
    <div className="min-h-screen p-8 pt-0">
      <PageHeader title="News Events" />
      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Event Posts</h2>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap mb-4">
          <input
            type="text"
            name="title"
            value={filters.title}
            onChange={handleFilterChange}
            placeholder="Search Title"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
          />
          <input
            type="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
          />
          <input
            type="text"
            name="activistId"
            value={filters.activistId}
            onChange={handleFilterChange}
            placeholder="Activist ID"
            className="p-2 border rounded-md bg-slate-100 text-slate-900"
          />
          <button
            onClick={handleClearFilters}
            className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Clear Filters
          </button>
        </div>

        {/* Table */}

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            {/* Filter Result Count */}
            <div className="mb-4 text-gray-700 font-medium">
              Showing {filteredPosts.length} result
              {filteredPosts.length !== 1 && "s"}
            </div>
            <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
              <thead className="bg-slate-900 text-slate-100">
                <tr>
                  <th className="px-4 py-2 ">No</th>
                  <th className="px-4 py-2 ">Image</th>
                  {/* <th className="px-4 py-2 ">Title</th> */}
                  <th className="px-4 py-2 ">Date</th>
                  <th className="px-4 py-2 ">Likes</th>
                  <th className="px-4 py-2 ">Comments</th>
                  <th className="px-4 py-2 ">Activist</th>
                  <th className="px-4 py-2  text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPosts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-gray-500">
                      No posts found.
                    </td>
                  </tr>
                ) : (
                  currentPosts.map((post, index) => (
                    <tr
                      key={post._id}
                      className="text-sm hover:bg-gray-50 text-center"
                    >
                      <td className="px-4 py-2 border">
                        {indexOfFirstItem + index + 1}
                      </td>
                      <td className="px-4 py-2 border">
                        {post.images?.length > 0 ? (
                          <div className="flex space-x-2">
                            {post.images.slice(0, 3).map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={IMAGE_URL + imgUrl}
                                alt={`thumbnail-${idx}`}
                                className="w-10 h-10 object-cover rounded-md"
                              />
                            ))}
                            {post.images.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{post.images.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span>No images</span>
                        )}
                      </td>
                      {/* <td className="px-4 py-2 border">{post.title || "N/A"}</td> */}
                      <td className="px-4 py-2 border">
                        {new Date(
                          post.date || post.createdAt
                        ).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-2 border">
                        {post.likes?.length || 0}
                      </td>
                      <td className="px-4 py-2 border p-0">
                        <div className="flex items-center ml-6 space-x-1">
                          <FaCommentDots className="text-gray-600" />
                          <span>{post.comments?.length || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border">
                        {post.activistDetails?.fullname}
                        <br />
                        <span className="text-xs text-gray-500">
                          ID: {post.activistDetails?.activistId}
                        </span>
                      </td>
                      <td className="px-4 py-2 border text-center space-x-2">
                        <button
                          onClick={() => handleView(post._id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEdit(post._id)}
                          className="text-yellow-500 hover:text-yellow-700"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(post._id)}
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
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* View Modal */}
      {selectedPost && (
        <Modal
          isOpen={!!selectedPost}
          onRequestClose={closeModal}
          contentLabel="Post Details"
          className="bg-white rounded-lg p-6 w-full max-w-3xl mx-auto my-8 shadow-xl outline-none overflow-y-auto max-h-[90vh]"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <h2 className="text-2xl font-bold mb-4 text-center">
            {selectedPost.title}
          </h2>
          <p className="mb-6 text-gray-700 text-justify">
            {selectedPost.description}
          </p>

          {selectedPost.images?.length > 0 && (
            <div
              className={`grid grid-cols-${selectedPost?.images?.length} sm:grid-cols-${selectedPost?.images?.length} md:grid-cols-${selectedPost?.images?.length} gap-4 mb-6`}
            >
              {selectedPost.images.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={IMAGE_URL + imgUrl}
                  alt={`event-img-${idx}`}
                  className="w-60 h-60 object-cover rounded-md shadow"
                />
              ))}
            </div>
          )}

          {/* Liked By Section with Toggle */}
          {selectedPost.likes?.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowLikes(!showLikes)}
                className="mb-2 text-blue-600 hover:underline"
              >
                {showLikes
                  ? "Hide Likes"
                  : `Show Likes (${selectedPost.likes.length})`}
              </button>

              {showLikes && (
                <div className="max-h-64 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                  {selectedPost.likes.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center space-x-4 bg-gray-50 p-3 rounded-md shadow-sm"
                    >
                      <img
                        src={user.photoUrl?.[0] || "/no-user.png"}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {user.username}
                        </p>
                        {user.email && (
                          <p className="text-sm text-gray-500">{user.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">
              Comments ({selectedPost.comments?.length || 0})
            </h4>
            {selectedPost.comments?.length === 0 ? (
              <p className="text-sm text-gray-500">No comments yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                {selectedPost.comments.map((comment) => (
                  <div
                    key={comment._id}
                    className="flex items-start space-x-3 bg-gray-50 p-3 rounded-md shadow-sm"
                  >
                    <img
                      src={comment.user?.photoUrl?.[0] || "/no-user.png"}
                      alt={comment.user?.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        {comment.user?.username}
                      </p>
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(comment.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={closeModal}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      <Modal
        isOpen={editModalOpen}
        onRequestClose={() => setEditModalOpen(false)}
        contentLabel="Edit Event Post"
        className="bg-white rounded-md p-4 max-w-2xl mx-auto my-8 shadow-xl outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      >
        <h2 className="text-xl font-bold mb-4">Edit Event Post</h2>
        <form onSubmit={handleUpdate}>
          {/* <label className="block mb-2 font-semibold">Title</label>
          <input
            type="text"
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            required
          /> */}

          <label className="block mb-2 font-semibold">Description</label>
          <textarea
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
            className="w-full p-2 border rounded mb-3"
            rows={3}
            required
          />

          <label className="block mb-2 font-semibold">Date</label>
          <input
            type="date"
            value={editForm.date}
            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            className="w-full p-2 border rounded mb-3"
            required
          />

          <label className="block mb-2 font-semibold">Images</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {editForm.images.map((img, idx) => (
              <div key={idx} className="relative">
                <img
                  src={IMAGE_URL + img}
                  alt={`img-${idx}`}
                  className="w-16 h-16 object-cover rounded"
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-1"
                  onClick={() =>
                    setEditForm((prev) => ({
                      ...prev,
                      images: prev.images.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  &times;
                </button>
              </div>
            ))}

            {/* New images preview */}
            {Array.from(editImages).map((file, idx) => {
              const objectUrl = URL.createObjectURL(file);
              return (
                <div key={`new-${idx}`} className="relative">
                  <img
                    src={objectUrl}
                    alt={`new-img-${idx}`}
                    className="w-16 h-16 object-cover rounded"
                  />
                </div>
              );
            })}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setEditImages(e.target.files)}
            className="mb-3"
          />

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={editLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {editLoading ? "Updating..." : "Update"}
            </button>
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
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

export default EventPostsTable;
