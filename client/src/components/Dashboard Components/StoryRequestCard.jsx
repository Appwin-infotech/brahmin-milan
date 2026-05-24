import React from 'react';
import { IMAGE_URL } from '../../utils/constants';

const StoryRequestCard = ({ request }) => {
  const photoUrl = request.photoUrl; // This is the uploaded couple image URL

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <h3 className="text-xl font-semibold mb-2">Wedding Story Request</h3>
      
      {/* Show the image only if photoUrl is available */}
      {photoUrl && (
        <div className="mb-4">
          <img 
            src={IMAGE_URL+photoUrl} 
            alt="Couple's Wedding Story"
            className=" md:w-80 sm:h-50h-80 object-cover rounded-lg"
          />
        </div>
      )}

      <div className="flex items-center mb-4">
        <div className="text-lg font-medium">
          <strong>Groom Name:</strong> {request.groomName || '—'}
        </div>
      </div>

      <div className="flex items-center mb-4">
        <div className="text-lg font-medium">
          <strong>Bride Name:</strong> {request.brideName || '—'}
        </div>
      </div>

      <div className="mb-2">
        <strong>Thought:</strong> {request.thought || '—'}
      </div>
      <div className="mb-2">
        <strong>Status:</strong> {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
      </div>

    </div>
  );
};

const StoryRequestsSection = ({ requests }) => {
  // Display only the first 2 requests
  const visibleRequests = requests.slice(0, 2);

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">Story Requests</h2>
        <p className="text-gray-500">No story requests found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 overflow-auto">
      <h2 className="text-lg font-bold mb-4">Story Requests ({requests.length})</h2>
      {visibleRequests.map((req, idx) => (
        <StoryRequestCard key={req._id || idx} request={req} />
      ))}
      {requests.length > 0 && (
        <div className="text-right mt-4">
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            onClick={() => window.location.href = '/story-approvals'}
          >
            View More
          </button>
        </div>
      )}
    </div>
  );
};

export default StoryRequestsSection;
