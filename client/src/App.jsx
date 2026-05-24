import React, { useEffect } from "react";
// Import Socket Context
import { SocketProvider } from './utils/socketContext.jsx'; // Make sure the context is imported
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Protectedroutes from "./components/common/Protectedroutes.jsx";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/Login.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import MatrimonialProfiles from "./pages/MatrimonialProfiles.jsx";
import RequestProfile from "./pages/RequestProfile.jsx";
import SingleUserPKA from "./pages/SingleUserPKA.jsx";
import SpecialistProfile from "./pages/SpecialistProfile.jsx";
import ActivistsProfile from "./pages/ActivistsProfile.jsx";
import ProfileApprovals from "./pages/ProfileApprovals.jsx";
import SubscriptionManagement from "./pages/SubscriptionManagent.jsx";
import ReportManagement from "./pages/ReportManagement.jsx";
import Notifications from "./pages/Notifications.jsx";
import NewsEvents from "./pages/NewsEvents.jsx";
import DharmshalaPage from "./pages/DharmshalaPage.jsx";
import { ToastContainer } from "react-toastify";
import BioDataProfile from "./pages/BioDataProfile.jsx";
import DharmshalaProfile from "./pages/DharmashalaProfile.jsx";
import Committees from "./pages/Committees.jsx";
import FeedbackManagementPage from "./pages/FeedbackManagementPage.jsx";
import AdvertiseWithUsManagementPage from "./pages/AdvertiseWithUsManagementPage.jsx";
import SuccessStoryApprovals from "./pages/SuccessStoryApprovals.jsx";
import CreateAdvertisement from "./pages/CreateAdvertisement.jsx";
import DefaultAdvertisement from "./pages/DefaultAdvertisment.jsx";
import SuccessStories from "./pages/SuccessStories.jsx";
import ContactMessageManagementPage from "./pages/ContactMessageManagementPage.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import AdminBroadcastNotification from "./pages/AdminNotification.jsx";

const App = () => {

  return (
    // Wrap the app with SocketProvider to provide the socket globally
    <SocketProvider>
      <BrowserRouter>
           {/* Global Toast Container */}
           <ToastContainer position="top-right" autoClose={5000} hideProgressBar />

        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<Protectedroutes />}>
            {/* Main Routes - matching the pages directory */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/all-users" element={<UserManagement />} />
            <Route
              path="/matrimonial-profiles"
              element={<MatrimonialProfiles />}
            />
            <Route path="/request/:id" element={<RequestProfile />} />
            <Route path="/profile/:id" element={<BioDataProfile />} />
            <Route path="/:userType/:id" element={<SingleUserPKA />} />
            <Route path="/specialist/:userType" element={<SpecialistProfile />} />
            <Route path="/dharmshala/:id" element={<DharmshalaProfile />} />
            <Route path="/activist-profiles" element={<ActivistsProfile />} />
            <Route path="/profile-approvals" element={<ProfileApprovals />} />
            <Route path="/success-stories" element={<SuccessStories />} />
            <Route path="/story-approvals" element={<SuccessStoryApprovals />} />
            <Route path="/default-Advertisement" element={<DefaultAdvertisement />} />
            <Route path="/create-Advertisement" element={<CreateAdvertisement />} />
            <Route
              path="/manage-subscriptions"
              element={<SubscriptionManagement />}
            />
            <Route path="/profile-reports" element={<ReportManagement />} />
            <Route path="/advertise-with-us" element={<AdvertiseWithUsManagementPage/>} />
            <Route path="/feedbacks" element={<FeedbackManagementPage />} />
            <Route path="/committees" element={<Committees />} />
            <Route path="/news&events" element={<NewsEvents />} />
            <Route path="/broadcastNotification" element={<AdminBroadcastNotification/>} />
            <Route path="/dharm-shala" element={<DharmshalaPage />} />
            <Route path="/contactMessage" element={<ContactMessageManagementPage />} />
            <Route path="/changeAdminPassword" element={<ChangePassword />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
};

export default App;
