import React, { useState } from "react";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL } from "../utils/constants";
import { toast } from "react-toastify";

const AdminBroadcastNotification = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [error,setError] = useState("");

  // 🔐 Helper: Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" };
  };

  // 🚀 Function to send broadcast notification
  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Please provide both title and message.");
      return;
    }

    try {
      setIsSending(true);
      const response = await fetch(`${BASE_URL}/api/v1/notification/sendNoticationToAll`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, message }),
      });

      const data = await response.json();

      if (response.status === 401 || data?.error === "Token expired") {
        alert("Session expired. Please login again.");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      if (response.ok && data?.status) {
        setShowSuccess(true);
        setTitle("");
        setMessage("");
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        console.log(data);
        setError(data?.error);
        throw new Error(data?.error || "Failed to send notification");
 
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
      setError(error);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsSending(false);
    }
  };

    const handleClearFields = () => {
    setTitle("");
    setMessage("");
    setShowError(false);
    setShowSuccess(false);
    setError("");
  };

  return (
    <div className="min-h-screen p-8 pt-0">
      <PageHeader title="Broadcast Notification" />

      <div className="mx-auto bg-white mt-6 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-2">Send Notification</h2>
        <p className="text-sm text-gray-500 mb-6">
          Broadcast a custom message to all users.
        </p>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Notification Title
            </label>
            <input
              type="text"
              id="title"
              placeholder="Enter notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-md bg-slate-100 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Notification Message
            </label>
            <textarea
              id="message"
              placeholder="Enter notification message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full p-2 border rounded-md bg-slate-100 text-slate-900 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Button */}
          <div className="pt-2">

                                    <button
              onClick={handleClearFields}
              disabled={isSending}
              className="w-full  p-2 bg-gray-300 text-gray-900 rounded-md text-bold hover:bg-gray-400 transition duration-300 focus:ring-2 focus:ring-gray-400"
            >
              Clear
            </button>
            <button
              onClick={handleSendNotification}
              disabled={isSending || !title.trim() || !message.trim()}
              className={`w-full p-2 mt-3 text-white rounded-md transition duration-300 ${
                isSending || !title.trim() || !message.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              }`}
            >
              {isSending ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                      5.291A7.962 7.962 0 014 12H0c0 
                      3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                "Send to All Users"
              )}
            </button>


          </div>
        </div>

        {/* Alerts */}
        {(showSuccess || showError) && (
          <div className="mt-6">
            {showSuccess && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded-md shadow-sm">
                <p className="font-medium">Success!</p>
                <p className="text-sm">
                  Notification has been sent to all users.
                </p>
              </div>
            )}
            {showError && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-md shadow-sm">
                <p className="font-medium">Error!</p>
                <p className="text-sm">
                  {`Failed to send notification. ${error}`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBroadcastNotification;
