import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  initializeSocket,
  getSocket,
  disconnectSocket,
} from "../../socket/socket.client";
import CustomToast from "./CustomToast";
import { IMAGE_URL } from "./constants";

const SocketContext = createContext();
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState();
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(localStorage.getItem("adminId"));

  // ✅ Notification config
const notificationHandlers = {
  activistRequest: {
    path: "/profile-approvals",
    updateState: (data) => {
      const payload = data?.newData;
      if (payload && payload._id) {
        window.dispatchEvent(new CustomEvent("new-Request", { detail: payload }));
      } else {
        throw new Error("Invalid data");
      }
    },
    refetch: () => window.dispatchEvent(new Event("refetch-notifications")),

  },
  biodataCreated: {
    path: "/matrimonial-profiles",
        updateState: (data) => {
      const payload = data?.newData;
      if (payload && payload._id) {
        window.dispatchEvent(new CustomEvent("new-biodata", { detail: payload }));
      } else {
        throw new Error("Invalid data");
      }
    },
     refetch: () => window.dispatchEvent(new Event("refetch-notifications")),
  },
  eventPostCreated: {
    path: "/news&events",
            updateState: (data) => {
      const payload = data?.newData;
      if (payload && payload._id) {
        window.dispatchEvent(new CustomEvent("new-EventPost", { detail: payload }));
      } else {
        throw new Error("Invalid data");
      }
    },
     refetch: () => window.dispatchEvent(new Event("refetch-notifications")),
  },
  jyotishCreated: {
    path: "specialist/jyotish",
    updateState: (data) => {
      const payload = data?.newData;
      if (payload && payload._id) {
        window.dispatchEvent(new CustomEvent("new-Created", { detail: payload }));
      } else {
        throw new Error("Invalid data");
      }
    },
     refetch: () => window.dispatchEvent(new Event("refetch-notifications"))
  },
  kathavachakCreated: {
    path: "specialist/kathavachak",
    updateState: (data) => {
      const payload = data?.newData;
      if (payload && payload._id) {
        window.dispatchEvent(new CustomEvent("new-Created", { detail: payload }));
      } else {
        throw new Error("Invalid data");
      }
    },
    refetch: () => window.dispatchEvent(new Event("refetch-notifications")),
  },
  panditCreated: {
    path: "specialist/pandit",
    updateState: (data) => {
      const payload = data?.newData;
      if (payload && payload._id) {
        window.dispatchEvent(new CustomEvent("new-Created", { detail: payload }));
      } else {
        throw new Error("Invalid data");
      }
    },
       refetch: () => window.dispatchEvent(new Event("refetch-notifications")),
  },
  successStoryRequest: {
    path: "/story-approvals",
                updateState: (data) => {
      const payload = data?.newData;
      if (payload && payload._id) {
        window.dispatchEvent(new CustomEvent("new-StoryRequest", { detail: payload }));
      } else {
        throw new Error("Invalid data");
      }
    }, refetch: () => window.dispatchEvent(new Event("refetch-notifications")),
  },
};


  // ✅ Handle any notification dynamically
const handleNotification = (type, data) => {
  // Show toast
  toast(<CustomToast message={data.message} photoUrl={IMAGE_URL+data.photoUrl} />, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });


  const handler = notificationHandlers[type];

  if (!handler) return;

  // 🔁 Call updateState if defined
  if (typeof handler.updateState === "function") {
    try {
      handler.updateState(data);
    } catch (err) {
      console.error(`Error in updateState for ${type}:`, err);
    }
  }

    // 🔁 Call updateState if defined
  if (typeof handler.refetch === "function") {
    try {
      handler.refetch();
    } catch (err) {
      console.error(`Error in calling refetch function for ${type}:`, err);
    }
  }

  // 🌀 Refetch only if you're already on that route
  if (window.location.pathname === handler.path) {
    handler.refetch?.();
  }
};

  // ✅ Initialize socket after login
  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      try {
        await initializeSocket(adminId);
        setSocket(getSocket());
      } catch (error) {
        console.error("Socket init failed:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
    return () => {
      disconnectSocket();
      console.log("Socket disconnected");
    };
  }, [adminId]);

  // ✅ Attach socket listeners
  useEffect(() => {
    if (!socket) return;

    // Attach listeners for each notification type
    Object.keys(notificationHandlers).forEach((type) => {
      socket.on(type, (data) => handleNotification(type, data));
    });

    return () => {
      Object.keys(notificationHandlers).forEach((type) => {
        socket.off(type);
      });
    };
  }, [socket]);

  // ✅ Re-init socket on admin login event
  useEffect(() => {
    const handleLogin = () => {
      const id = localStorage.getItem("adminId");
      if (id) setAdminId(id);
    };
    window.addEventListener("admin-logged-in", handleLogin);
    return () => window.removeEventListener("admin-logged-in", handleLogin);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
