import React, { useState, useEffect } from "react";
import { BASE_URL, IMAGE_URL } from "../utils/constants";
import PageHeader from "../components/common/PageHeader";
import { AiFillPlusCircle, AiOutlineUserAdd } from "react-icons/ai";
import { FaEdit, FaEye, FaSpinner, FaTrashAlt } from "react-icons/fa";
import Modal from "react-modal";
import { ToastContainer } from "react-toastify";

const DefaultAdvertisement = () => {
  const [form, setForm] = useState({
    section: "Top",
    targetProfileType: "",
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaMeta, setMediaMeta] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [advertisementData, setAdvertisementData] = useState([]);
  const [selectedAdvertisement, setSelectedAdvertisement] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch existing ads
  const fetchAdvertisementData = async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/get-defaultAdvertisement`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAdvertisementData(data.data || []);
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
  const handleSingleSelect = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, targetProfileType: value }));
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

  const handleView = (id) => {
    const adv = advertisementData.find((ad) => ad._id === id);
    setSelectedAdvertisement(adv);
  };

  const handleEdit = (id) => {
    console.log("Edit:", id);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this advertisement?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/delete-defaultAdvertisement/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to delete advertisement");

      // Show success message or toast if you're using a library
      alert("Advertisement deleted successfully");

      // Refresh data after deletion
      fetchAdvertisementData();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message || "Something went wrong while deleting");
    }
  };

  const closeModal = () => {
    setSelectedAdvertisement(null);
  };

  const validate = () => {
    const errs = {};
    if (!form.section.trim()) errs.section = "Section required";
    if (!form.targetProfileType)
      errs.targetProfileType = "Select at least one profile type";
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

    const fd = new FormData();
    fd.append("section", form.section); // Append section here
    fd.append("targetProfileType", form.targetProfileType);
    fd.append("mediaMeta", JSON.stringify(mediaMeta));
    mediaFiles.forEach((f) => fd.append("media", f));

    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/update-defaultAdvertisement`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: fd,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage("Default Advertisement created!");
      setForm({
        targetProfileType: "",
        section: "Top",
      });
      setMediaFiles([]);
      setMediaMeta([]);
      setMessage("");
      setIsModalOpen(false);
      fetchAdvertisementData();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          <AiFillPlusCircle size={20} /> <span className="ml-2">Add Advertisement </span>
        </button>
      </div>

      <div className="max-w-8xl mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
        {/* Table */}
        <table className="min-w-full table-auto bg-slate-50 rounded-lg shadow-md overflow-hidden">
          <thead className="bg-slate-900 text-slate-100">
            <tr>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Profile Types</th>
              <th className="px-4 py-2">Media</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white text-center">
            {advertisementData.length > 0 ? (
              advertisementData.map((ad, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 font-semibold">
                    <span
                      className={
                        ad.section === "Top" ? "text-green-600" : "text-red-600"
                      }
                    >
                      {ad.section}
                    </span>
                  </td>
                  <td className="px-4 py-2">{ad.targetProfileType}</td>
                  <td className="px-4 py-2 space-y-1">
                    {ad.media.map((m, i) => {
                      const url = `${IMAGE_URL}${m.mediaUrl}`;
                      return m.mediaType === "video" ? (
                        <video
                          key={i}
                          src={url}
                          width="80"
                          controls
                          className="mx-auto"
                        />
                      ) : (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          width="80"
                          className="mx-auto"
                        />
                      );
                    })}
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => handleView(ad._id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEye />
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
                <td colSpan="4" className="text-center text-gray-500 py-4">
                  No default advertisement found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-4xl w-full overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Create Default Advertisement
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

              {/* Profile Types */}
              <div>
                <label className="block font-semibold mb-1">
                  Target Profile Types *
                </label>
                <select
                  value={form.targetProfileType}
                  onChange={handleSingleSelect}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Select profile type</option>
                  <option value="HomePage">HomePage</option>
                  <option value="Pandit">Pandit</option>
                  <option value="Jyotish">Jyotish</option>
                  <option value="Kathavachak">Kathavachak</option>
                  <option value="Activist">Activist</option>
                  <option value="Dharmshala">Dharmshala</option>
                  <option value="Committee">Committee</option>
                  <option value="Biodata">Biodata</option>
                  <option value="EventPost">EventPost</option>
                </select>
                {errors.targetProfileType && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.targetProfileType}
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
                    <p className="text-gray-700 text-xs pt-2">
                      Hyperlink :- {item?.hyperlink ? item?.hyperlink : "N/A"}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Section */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Section:</h4>
              <p
                className={`text-sm font-semibold ${
                  selectedAdvertisement.section === "Top"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {selectedAdvertisement.section}
              </p>
            </div>

            {/* Target Profile Types */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Target Profile Type:</h4>
              <p className="text-gray-700 text-sm">
                {selectedAdvertisement.targetProfileType}
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

export default DefaultAdvertisement;
