import React, { useState, useEffect } from "react";
import PageHeader from "../components/common/PageHeader";
import { BASE_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { ToastContainer } from "react-toastify";
import Pagination from "../components/common/Pagination";


const notificationTypeMap = {
  comment: {
    title: "New Comment",
    icon: "💬",
    category: "comments",
  },
  like: {
    title: "New Like",
    icon: "👍",
    category: "likes",
  },
  connectionRequest: {
    title: "Connection Request",
    icon: "🔗",
    category: "connections",
  },
  activistApproved: {
    title: "Activist Approved",
    icon: "✅",
    category: "activist",
  },
  activistRequest: {
    title: "Activist Request",
    icon: "✊",
    category: "activist",
  },
  kathavachakRequest: {
    title: "Kathavachak Request",
    icon: "📖",
    category: "kathavachak",
  },
  panditRequest: {
    title: "Pandit Request",
    icon: "🕉️",
    category: "pandit",
  },
  jyotishRequest: {
    title: "Jyotish Request",
    icon: "🌟",
    category: "jyotish",
  },
  successStoryRequest: {
    title: "Success Story Request",
    icon: "📝",
    category: "Success Story",
  },
  biodataCreated:{
    title: "Biodata Created",
    icon: "💑",
    category: "Biodata Created",
  },
  eventPostCreated:{
    title: "EventPost",
    icon: "📰",
    category: "EventPost",
  }          
};

const NotificationsPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const itemsPerPage = 10;
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    readStatus: "all",
    category: "all",
  });

  // Auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
      : {};
  };

    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/v1/admin/getAllNotificationsForAdmin`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );
        const data = await res.json();
        if (!data.status) {
          setNotifications([]);
          setLoading(false);
          return;
        }
        // Map API response to notification format
        const mapped = (data.data || []).map((n, idx) => {
          const typeInfo = notificationTypeMap[n.notificationType] || {};
          return {
            id: n._id || idx + 1,
            title: typeInfo.title || n.notificationType || "Notification",
            description: n.message || "",
            icon: typeInfo.icon || "🔔",
            timestamp: new Date(n.seenAt || n.updatedAt || n.createdAt),
            category: typeInfo.category || "general",
            seen: n.seen,
            relatedData: n.relatedData,
            notificationType: n.notificationType, // 👈 Add this line
          };
        });
        setNotifications(mapped);
      } catch (err) {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchNotifications();
  }, []);

          //refetch when notification -occur
        useEffect(() => {
        const refetchNotifications = () => 
          fetchNotifications();
          // Your custom fetch logic
 
        window.addEventListener("refetch-notifications", refetchNotifications);
        return () => window.removeEventListener("refetch-notifications", refetchNotifications);
      }, []);


  const categories = [...new Set(notifications.map((n) => n.category))];

  const formatDate = (date) => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
  
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
  
    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  
    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return `${date.toLocaleDateString()}, ${time}`;
  };
  

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/markSeenAllNotification`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.status) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };
  
  const markAsSeen = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/admin/seeNotification/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.status) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error("Error marking as seen:", error);
    }
  };
  
  // Redirect to User Profile or Reported Profile
  const handleNotificationClick = (notification,currentPage) => {

  localStorage.setItem("notificationCurrentPage", currentPage);

    const { notificationType, relatedData } = notification;
  
    let url = "";
  
    switch (notificationType) {
      case "panditCreated":
          url = "/specialist/pandit";
        break;
      case "kathavachakCreated":
          url = "/specialist/kathavachak";
        break;
      case "jyotishCreated":
           url = "/specialist/jyotish";
        break;
      case "activistRequest":
      case "activistApproved":
        url = "/profile-approvals";
        break;
      case "successStoryRequest":
        url = "/story-approvals";
        break;
      case "biodataCreated":
        url = `/profile/${relatedData?.profileId || relatedData?.BiodataId}`;
        break;
        case "eventPostCreated":
          url = `/news&events`;
          break;
      case "comment":
      case "like":
        url = "/news&events";
        break;
      case "connectionRequest":
        url = "/admin/connections";
        break;
      default:
        return;
    }

    if(!notification.seen){
      markAsSeen(notification.id);
    }
  
    navigate(url);
  };
  
    useEffect(() => {
      const savedPage = localStorage.getItem("notificationCurrentPage");
      if (savedPage) {
        setCurrentPage(Number(savedPage)); // set to page 45, for example
        localStorage.removeItem("notificationCurrentPage"); // optional
      }
    }, []);

  // Filtering
  const filteredNotifications = notifications.filter((notification) => {
    const readFilter =
      filters.readStatus === "all" ||
      (filters.readStatus === "read" && notification.seen) ||
      (filters.readStatus === "unread" && !notification.seen);

    const categoryFilter =
      filters.category === "all" || notification.category === filters.category;

    const dateRangeFilter =
      (!dateRange.startDate ||
        notification.timestamp >= new Date(dateRange.startDate)) &&
      (!dateRange.endDate ||
        notification.timestamp <= new Date(dateRange.endDate));

    return readFilter && categoryFilter && dateRangeFilter;
  });

  

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

    const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const categoryLabels = {
    comments: "Comments",
    likes: "Likes",
    connections: "Connections",
    activist: "Activist",
    kathavachak: "Kathavachak",
    jyotish: "Jyotish",
    pandit: "Pandit",
    general: "General",
  };

  return (
    <div className="max-w-8xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Notifications" />

      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2 items-center">
          <input
            type="date"
            className="px-3 py-2 border rounded-lg"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
          />
          <span className="text-white">to</span>
          <input
            type="date"
            className="px-3 py-2 border rounded-lg"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, endDate: e.target.value })
            }
          />
        </div>

        <select
          className="px-3 py-2 border rounded-lg"
          value={filters.readStatus}
          onChange={(e) =>
            setFilters({ ...filters, readStatus: e.target.value })
          }
        >
          <option value="all">All notifications</option>
          <option value="read">Read</option>
          <option value="unread">Unread</option>
        </select>

        <select
          className="px-3 py-2 border rounded-lg"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category] || category}
            </option>
          ))}
        </select>
        <button
          onClick={markAllAsRead}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Mark all as read
        </button>
      </div>

      <div className="space-y-4">
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
        ) : paginatedNotifications.length === 0 ? (
          <div className="flex justify-center items-center mt-60 py-10">No notifications found.</div>
        ) : (
          paginatedNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${notification.seen ? "bg-white" : "bg-blue-100"
                }`}
                onClick={() => {
                
                  handleNotificationClick(notification,currentPage)
  
                }}
                
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{notification.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{notification.title}</h3>
                    <span className="text-sm text-gray-500">
                      {formatDate(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{notification.description}</p>
                  <div className="mt-2">
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {categoryLabels[notification.category] || notification.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
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

export default NotificationsPage;
