import React, { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import bgimg from "../../assets/bg.jpg";

const ProtectedRoutes = () => {
  const authToken = localStorage.getItem("authToken");
  const adminInfo = JSON.parse(localStorage.getItem("adminInfo"));
  const isAdmin =
    (authToken && adminInfo?.role === "admin") ||
    adminInfo?.role === "super_admin";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const toggleSidebar = () => setIsCollapsed((prev) => !prev);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className="flex h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${bgimg})` }}
    >
      {/* Sidebar container */}
      <div
        className={`fixed z-20 h-full bg-white transition-all duration-300 ease-in-out
          ${isMobile ? (isCollapsed ? "-left-64" : "left-0 w-64") : (isCollapsed ? "w-16" : "w-64")}
        `}
      >
        <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      </div>

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col overflow-auto transition-all duration-300
          ${isMobile ? "ml-0" : isCollapsed ? "ml-0" : "ml-0"}
        `}
      >
    
        {/* Routed page content */}
        <main className={`${isMobile ? "ml-16 p-2" : isCollapsed ? "ml-16" : "ml-64"} p-6`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProtectedRoutes;
