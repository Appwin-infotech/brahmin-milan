import React from "react";

const PageHeader = ({ title }) => {
  return (
    <div
      className="flex items-center justify-center h-16 p-6 w-full"
      style={{
        borderBottom: "1px solid transparent",
        background:
          "linear-gradient(to right, rgba(255, 255, 255, 0) 10%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 90%)",
      }}
    >
      <h1 className="font-semibold text-white text-2xl text-center capitalize">
        {title}
      </h1>
    </div>
  );
};

export default PageHeader;
