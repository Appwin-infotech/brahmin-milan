import { FaBell } from "react-icons/fa";

const CustomToast = ({ message, photoUrl }) => {
  return (
    <div className="flex items-center gap-3">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="notification"
          className="w-8 h-8 rounded-full object-cover border border-gray-300"
        />
      ) : (
        <FaBell className="text-gray-600 w-8 h-8" />
      )}
      <p className="text-sm text-gray-800">{message}</p>
    </div>
  );
};

export default CustomToast;
