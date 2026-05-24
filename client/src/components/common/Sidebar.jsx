// src/components/Sidebar.js
import { IoIosNotificationsOutline } from "react-icons/io";
import {
  MdManageHistory,
  MdApproval,
  MdAddBusiness,
  MdOutlinePeopleAlt,
  MdReportGmailerrorred,
  MdFeedback,
  MdCampaign,
} from "react-icons/md";
import { AiOutlineUser } from "react-icons/ai";
import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
  FaSignOutAlt,
  FaHome,
  FaUsers,
  FaBook,
  FaUserCircle,
  FaStar,
  FaHandshake,
  FaHotel,
  FaNewspaper,
  FaChalkboardTeacher,
  FaPhoneAlt,
  FaLock,
  FaBell
} from "react-icons/fa";
import { FaDiagramSuccessor } from "react-icons/fa6";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { Bell } from "lucide-react";

const menuItems = [
  { path: "/", label: "Dashboard", icon: <FaHome /> },
  { path: "/all-users", label: "All Users", icon: <FaUsers /> },
  { path: "/matrimonial-profiles", label: "Matrimonial Profiles", icon: <MdOutlinePeopleAlt /> },
  { path: "/specialist/pandit", label: "Pandit Profiles", icon: <FaBook /> },
  { path: "/specialist/kathavachak", label: "Kathavachak Profiles", icon: <FaUserCircle /> },
  { path: "/specialist/jyotish", label: "Jyotish Profiles", icon: <FaStar /> },
  { path: "/committees", label: "Committees", icon: <FaChalkboardTeacher /> },
  { path: "/activist-profiles", label: "Activist Profiles", icon: <FaHandshake /> },
  { path: "/success-stories", label: "Success Stories", icon: <FaDiagramSuccessor /> },
  { path: "/profile-approvals", label: "Profile Approvals", icon: <MdApproval /> },
  { path: "/story-approvals", label: "SuccessStory Approvals", icon: <MdApproval /> },
  { path: "/default-Advertisement", label: "Default Advertisement", icon: <MdAddBusiness /> },
  { path: "/create-Advertisement", label: "Create Advertisement", icon: <MdAddBusiness /> },
  { path: "/manage-subscriptions", label: "Subscriptions", icon: <MdManageHistory /> },
  { path: "/profile-reports", label: "Profile Reports", icon: <MdReportGmailerrorred /> },
  { path: "/feedbacks", label: "Feedbacks", icon: <MdFeedback /> },
  { path: "/advertise-with-us", label: "Advertise With Us", icon: <MdCampaign /> },
  { path: "/dharm-shala", label: "Dharamshala", icon: <FaHotel /> },
  { path: "/news&events", label: "News & Events", icon: <FaNewspaper /> },
  { path: "/broadcastNotification", label: "Broadcast-Notification", icon: <FaBell/> },
  { path: "/contactMessage", label: "Appwin Contact Query", icon: <FaPhoneAlt /> },
  { path: "/changeAdminPassword", label: "Change Password", icon: <FaLock /> },
,

];

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // (inside Sidebar component)
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);



  const fetchNotifications = async () => {

    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/v1/admin/getAllNotificationsForAdmin`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json();
      console.log(data)
      if (!data.status) {
        setNotifications([]);
        setNotificationCount(0);
        setLoading(false);
        return;
      }

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
          notificationType: n.notificationType,
        };
      });

      console.log("mapped: ", mapped)
      setNotifications(mapped);

      // Count unread notifications
      const unreadCount = mapped.filter((n) => !n.seen).length;
      setNotificationCount(unreadCount);
    } catch (err) {
      setNotifications([]);
      setNotificationCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Optionally refresh count every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    try {
      localStorage.removeItem("adminId");
      localStorage.removeItem("authToken");
      localStorage.removeItem("message");
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("adminInfo");
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Error logging out. Please try again.");
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 h-screen flex flex-col bg-slate-900 text-slate-100 transition-width duration-300 ${isCollapsed ? "w-18" : "w-64"
        }`}
    >
      {/* Header with collapse button */}
      {/* Top area */}
      {isCollapsed ? (
        <div className="flex flex-col items-center p-4 gap-4 border-b border-white/20">
          {/* Menu button on top */}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-white/20"
            title="Expand sidebar"
          >
            <HiOutlineMenuAlt3 className="text-white text-xl" />
          </button>

          {/* User icon below */}
          <div className="w-10 h-10 flex justify-center items-center rounded-full bg-white/10 overflow-hidden">
            <AiOutlineUser size={24} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex justify-center items-center rounded-full bg-white/10 overflow-hidden">
              <AiOutlineUser size={24} />
            </div>
            <div>
              <h1 className="font-semibold text-white">Admin</h1>
              <Link to="/" className="text-xs text-slate-500 uppercase">
                Raj Sharma
              </Link>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-white/20"
            title="Collapse sidebar"
          >
            <HiOutlineMenuAlt3 className="text-white text-xl" />
          </button>
        </div>
      )}


      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-3 space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${location.pathname === item.path
                    ? "bg-slate-800 text-white"
                    : "hover:bg-slate-800 hover:text-white text-slate-300"
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-white/20 space-y-3">
        <Link
          to="/notifications"
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${isCollapsed ? "justify-center" : "bg-slate-800 hover:bg-slate-700"
            }`}
        >
          <IoIosNotificationsOutline className="text-xl" />
          {!isCollapsed && (
            <>
              <span className="text-sm">Notifications</span>
              {notificationCount > 0 && (
                <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-400 text-xs">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </>
          )}
        </Link>
        <button
          onClick={handleLogout}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors w-full ${isCollapsed ? "" : "bg-slate-800 hover:bg-slate-700"
            }`}
        >
          <FaSignOutAlt className="text-lg" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
