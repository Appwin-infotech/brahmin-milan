import React, { useEffect, useState } from "react";
import { BASE_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";

import {
  FaUsers,
  FaClipboardList,
  FaBookOpen,
  FaFlag,
  FaComments,
  FaRing,
  FaBell,
  FaScroll,
  FaBuilding,
  FaHome,
  FaCreditCard,
  FaCalendarAlt,
  FaUserShield,
  FaAd,
  FaRegNewspaper,
  FaBullhorn,
  FaSpinner,
} from "react-icons/fa";
import RequestsSection from "../components/Dashboard Components/RequestsSection";
import StoryRequestsSection from "../components/Dashboard Components/StoryRequestCard";
import UsersSection from "../components/Dashboard Components/UsersSection";
import SubscriptionSection from "../components/Dashboard Components/SubscriptionSection";
import { ToastContainer } from "react-toastify";

const Dashboard = () => {
  const [data, setData] = useState({
    requests: [],
    storyRequests: [],
    users: [],
    reports: [],
    feedbacks: [],
    matrimonial: [],
    advertisementRequests: [],
    plans: [],
    committees: [],
    dharmshalas: [],
    subscriptions: [],
    events: [],
    activists: [],
    advertisements: [],
    defaultAdvertisements: [],
    successStories: [],
    adminNotifications: [],
  });
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : {};
  };

const fetchAll = async () => {
  setError("");
  const h = { headers: getAuthHeaders() };

  try {
    const endpoints = [
      { key: "requests", url: "/api/v1/admin/getAllRequests" },
      { key: "storyRequests", url: "/api/v1/admin/getAllStoryRequests" },
      { key: "users", url: "/api/v1/admin/getAllUsers" },
      { key: "reports", url: "/api/v1/admin/getAllReports" },
      { key: "feedbacks", url: "/api/v1/admin/getAllFeedBacks" },
      { key: "matrimonial", url: "/api/v1/admin/getAllMetrionial" },
      { key: "advertisementRequests", url: "/api/v1/admin/getAllAdvertisement-Request" },
      { key: "plans", url: "/api/v1/admin/getPlans" },
      { key: "committees", url: "/api/v1/admin/getAllCommittee" },
      { key: "dharmshalas", url: "/api/v1/admin/getAllDharmshala" },
      { key: "subscriptions", url: "/api/v1/admin/subscriptions" },
      { key: "events", url: "/api/v1/admin/getAllEvents" },
      { key: "activists", url: "/api/v1/admin/fetchActivistForAdmin" },
      { key: "advertisements", url: "/api/v1/admin/get-advertisement" },
      { key: "defaultAdvertisements", url: "/api/v1/admin/get-defaultAdvertisement" },
      { key: "successStories", url: "/api/v1/admin/get-successStories" },
      { key: "adminNotifications", url: "/api/v1/admin/getAllNotificationsForAdmin" },
    ];

    const results = await Promise.allSettled(
      endpoints.map(({ url }) => fetch(`${BASE_URL}${url}`, h))
    );

    const dataObj = {};

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { key } = endpoints[i];

      if (result.status === "fulfilled") {
        try {
          const json = await result.value.json();

          if (json.error === "Token expired") {
            alert("Session expired. Please login again.");
            localStorage.clear();
            window.location.href = "/login";
            return;
          }

          if (key === "plans") {
            dataObj[key] = json.plans || [];
          } else {
            dataObj[key] = json.data || [];
          }
        } catch (err) {
          console.warn(`Failed to parse response for ${key}`, err);
          dataObj[key] = [];
        }
      } else {
        console.warn(`API failed for ${key}`, result.reason);
        dataObj[key] = []; // Skip failed request but don't crash
      }
    }

    setData(dataObj);
  } catch (e) {
    console.error("Unexpected error while loading dashboard:", e);
    setError("Failed to load dashboard data.");
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    fetchAll();
  }, []);

            //refetch when notification -occur
          useEffect(() => {
          const refetchAll = () => 
            fetchAll();
            // Your custom fetch logic
   
          window.addEventListener("refetch-notifications", refetchAll);
          return () => window.removeEventListener("refetch-notifications", refetchAll);
        }, []);
  

const summary = [
  { title: "Users",          count: data.users.length,             icon: <FaUsers />,          color: "bg-gradient-to-r from-blue-300 to-blue-500",   route: "/all-users" },
  { title: "Requests",       count: data.requests.length,          icon: <FaClipboardList />,  color: "bg-gradient-to-r from-indigo-300 to-indigo-500", route: "/profile-approvals" },
  { title: "Story Req.",     count: data.storyRequests.length,     icon: <FaBookOpen />,       color: "bg-gradient-to-r from-green-300 to-green-500",  route: "/story-approvals" },
  { title: "Reports",        count: data.reports.length,           icon: <FaFlag />,           color: "bg-gradient-to-r from-red-300 to-red-500",      route: "/profile-reports" },
  { title: "Feedbacks",      count: data.feedbacks.length,         icon: <FaComments />,       color: "bg-gradient-to-r from-yellow-300 to-yellow-500", route: "/feedbacks" },
  { title: "Matrimonial",    count: data.matrimonial.length,       icon: <FaRing />,           color: "bg-gradient-to-r from-pink-300 to-pink-500",     route: "/matrimonial-profiles" },
  { title: "Ad Requests",    count: data.advertisementRequests.length, icon: <FaAd />,         color: "bg-gradient-to-r from-purple-300 to-purple-500", route: "/advertise-with-us" },
  { title: "Plans",          count: data.plans.length,             icon: <FaScroll />,         color: "bg-gradient-to-r from-gray-300 to-gray-500",     route: "/manage-subscriptions" },
  { title: "Committees",     count: data.committees.length,        icon: <FaBuilding />,       color: "bg-gradient-to-r from-cyan-300 to-cyan-500",     route: "/committees" },
  { title: "Dharmshalas",    count: data.dharmshalas.length,       icon: <FaHome />,           color: "bg-gradient-to-r from-pink-500 to-red-500",      route: "/dharm-shala" },
  { title: "Subs",           count: data.subscriptions.length,     icon: <FaCreditCard />,     color: "bg-gradient-to-r from-red-500 to-red-700",       route: "/manage-subscriptions" },
  { title: "Events",         count: data.events.length,            icon: <FaCalendarAlt />,    color: "bg-gradient-to-r from-yellow-500 to-yellow-700", route: "/news&events" },
  { title: "Activists",      count: data.activists.length,         icon: <FaUserShield />,     color: "bg-gradient-to-r from-indigo-500 to-indigo-700", route: "/activist-profiles" },
  { title: "Ads",            count: data.advertisements.length,    icon: <FaBullhorn />,       color: "bg-gradient-to-r from-pink-500 to-pink-700",     route: "/create-Advertisement" },
  { title: "Def. Ads",       count: data.defaultAdvertisements.length, icon: <FaAd />,         color: "bg-gradient-to-r from-blue-500 to-blue-700",     route: "/default-Advertisement" },
  { title: "Stories",        count: data.successStories.length,    icon: <FaRegNewspaper />,   color: "bg-gradient-to-r from-green-500 to-green-700",   route: "/success-stories" },
  { title: "Admin Notifs",   count: data.adminNotifications.length,icon: <FaBell />,           color: "bg-gradient-to-r from-gray-500 to-gray-700",     route: "/notifications" },
];


  if (loading)
    return (
          <div className="flex justify-center items-center mt-60 py-10">
            <FaSpinner className="animate-spin  text-3xl text-white" />
            <span
              className="text-white font-extrabold text-2xl pl-5
          "
            >
              Loading
            </span>
          </div>
    );
  // if (error)
  //   return <div className="text-center text-red-600 mt-8">{error}</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Summary Cards */}
<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-4 w-full">
  {summary.map((s, index) => (
    <div
      key={s.title}
      className={`p-4 flex flex-col items-center justify-center rounded-xl text-white shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${s.color}`}
      style={{
        minHeight: '140px',
        gridColumn: index === summary.length - 1 && summary.length % 2 !== 0 ? 'span 2' : 'span 1'
      }}
      onClick={() => navigate(s.route)}
    >
      <div className="text-4xl mb-2 transition-transform duration-300">{s.icon}</div>
      <div className="text-center transition-colors duration-300">
        <h3 className="text-sm font-semibold capitalize">{s.title}</h3>
        <p className="text-xl font-extrabold mt-1">{s.count}</p>
      </div>
    </div>
  ))}
</div>




      {/* Data Sections */}
{summary.map((s) => {
  const key = {

    Requests:              "requests",
    "Story Req.":          "storyRequests",
    Users:                 "users",
    Reports:               "reports",
    Feedbacks:             "feedbacks",
    Matrimonial:           "matrimonial",
    "Ad Requests":         "advertisementRequests",
    Plans:                 "plans",
    Committees:            "committees",
    Dharmshalas:           "dharmshalas",
    Subs:                  "subscriptions",
    Events:                "events",
    Activists:             "activists",
    Ads:                   "advertisements",
    "Def. Ads":            "defaultAdvertisements",
    Stories:               "successStories",
    "Admin Notifs":        "adminNotifications",
  }[s.title];

      if(s.title === "Users"){
    return <UsersSection key={s.title} users={data[key]} />
  }


  if (s.title === "Requests") {
    return <RequestsSection key={s.title} requests={data[key]} />;
  }

  if(s.title === "Story Req."){
    return <StoryRequestsSection key={s.title} requests={data[key]} />
  }

    if(s.title === "Subs"){
    return <SubscriptionSection key={s.title} subscriptions={data[key]} />
  }
})}
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



export default Dashboard;
