// Modal.js
import React from "react";

const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-md shadow-lg w-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
        <button
          onClick={onClose}
          className="mt-4 bg-red-500 text-white p-2 rounded hover:bg-red-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Modal;
