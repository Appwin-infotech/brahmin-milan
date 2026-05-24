import io from "socket.io-client";

// Set the socket URL based on the environment
const SOCKET_URL = import.meta.env.VITE_MODE === "Production" ? import.meta.env.VITE_APP_API_URL : import.meta.env.VITE_LOCALHOST_URL;

let socket = null;

// Initialize the socket connection
export const initializeSocket = (userId) => {
    // If the socket is already initialized, disconnect before reinitializing
    if (socket) {
        socket.disconnect();
    }

    // Create a new socket connection
    socket = io(SOCKET_URL, {
        auth: { userId }
    });

    // Event listener for successful connection
    socket.on("connect", () => {
        console.log("Connected to Socket server with ID:", socket.id);
        // Check the connection status
        console.log("Socket connected:", socket.connected); // Should be true when connected
    });

    // Handle disconnects
    socket.on("disconnect", () => {
        console.log("Disconnected from the socket server.");
    });
};

// Check if the socket is connected by checking the `socket.connected` property
export const isSocketConnected = () => {
    // Return whether the socket is connected
    return socket && socket.connected;
};

// Get the socket instance (throws error if not initialized)
export const getSocket = () => {
    if (!socket) {
        throw new Error("Socket not initialized");
    }
    return socket;
};

// Disconnect the socket
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log("Socket disconnected");
    }
};
