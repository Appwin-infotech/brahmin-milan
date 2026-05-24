import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const UserProfileCell = ({ user, currentPage }) => {
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef(null);

  let profileLinks = [];

  if (user.isPandit)
    profileLinks.push({ name: "Pandit", url: `/pandit/${user.userId}` });
  if (user.isKathavachak)
    profileLinks.push({
      name: "Kathavachak",
      url: `/kathavachak/${user.userId}`,
    });
  if (user.isJyotish)
    profileLinks.push({ name: "Jyotish", url: `/jyotish/${user.userId}` });
  if (user.isMatrimonial)
    profileLinks.push({ name: "Matrimonial", url: `/profile/${user.userId}` });

  const hasActivistProfile = user.isActivist;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
      }
    };
    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

    // Redirect to User Profile or Reported Profile
  const handleProfileClick = (currentPage) => {
    // Store the current page in localStorage
    localStorage.setItem("userCurrentPage", currentPage);
  };


  if (profileLinks.length === 0 && !hasActivistProfile) {
    return <td className="py-3 px-4">{user.username}</td>;
  }

  if (profileLinks.length === 1) {
    return (
      <td className="py-3 px-4 text-blue-600">
        <Link to={profileLinks[0].url}                     onClick={() => {
                      handleProfileClick(currentPage);
                
                    }} >{user.username}</Link>
      </td>
    );
  }


  return (
    <td className="py-3 px-4 text-blue-600 relative">
      <button
        onClick={() => setShowModal(true)}
        className="text-blue-600 font-medium underline hover:text-blue-800 transition duration-200"
      >
        {user.username}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
          <div
            ref={modalRef}
            className="bg-white p-6 rounded-xl shadow-xl transform transition-all scale-100 max-w-sm w-full"
          >
            <h2 className="text-lg font-bold mb-4 text-gray-800 text-center">
              Select Profile Type
            </h2>
            <ul className="space-y-2">
              {profileLinks.map((profile) => (
                <li key={profile.url} className="text-center">
                  <Link
                    to={profile.url}
                    className="block text-blue-600 hover:text-blue-800 font-medium transition duration-200 py-2 rounded-lg hover:bg-gray-100"
                    onClick={() => {
                      handleProfileClick(currentPage);
                      setShowModal(false);
                    }}
                  >
                    {profile.name}
                  </Link>
                </li>
              ))}
            </ul>

            {hasActivistProfile && (
              <div className="mt-2 text-gray-500 text-center py-2 border-t border-gray-200">
                Activist
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* {hasActivistProfile && (
                <div className="text-gray-500 text-sm mt-1">{user.username} (Activist)</div>
            )} */}
    </td>
  );
};

export default UserProfileCell;
