import React from "react";

const StatsCard = ({ icon: Icon, title, number }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-white shadow-md rounded-2xl border border-gray-200">
      <div className="p-3 bg-gray-100 rounded-full">
        <Icon className="w-6 h-6 text-gray-700" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-xl font-semibold text-gray-800">{number}</p>
      </div>
    </div>
  );
};

export default StatsCard;
