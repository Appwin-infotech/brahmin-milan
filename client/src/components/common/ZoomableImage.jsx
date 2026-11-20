import React, { useEffect, useState } from "react";

const ZoomableImage = ({ src, alt = "Image", className = "", ...imageProps }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <img
        {...imageProps}
        src={src}
        alt={alt}
        className={`${className} cursor-zoom-in`}
        onClick={(event) => {
          event.stopPropagation();
          imageProps.onClick?.(event);
          if (!event.defaultPrevented && src) setIsOpen(true);
        }}
      />
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} enlarged`}
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            className="absolute right-5 top-3 text-4xl leading-none text-white hover:text-gray-300"
            aria-label="Close enlarged image"
            onClick={() => setIsOpen(false)}
          >
            &times;
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[95vw] rounded object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ZoomableImage;
