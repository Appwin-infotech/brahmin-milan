import { useId, useState } from "react";
import PropTypes from "prop-types";
import { IMAGE_ACCEPT, IMAGE_REQUIREMENTS, validateImageFiles } from "../../utils/imageValidation";

export default function ImageUploadInput({ onChange, maxFiles, onValidationError, ...props }) {
  const [error, setError] = useState("");
  const id = useId();
  const limit = maxFiles ?? (props.multiple ? Infinity : 1);

  const handleChange = (event) => {
    const message = validateImageFiles(event.target.files, { maxFiles: limit });
    setError(message);
    onValidationError?.(message);
    if (message) {
      event.target.value = "";
      return;
    }
    onChange?.(event);
  };

  return (
    <span className="block">
      <input
        {...props}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-invalid={!!error}
        aria-describedby={`${id}-requirements ${id}-error`}
        onChange={handleChange}
      />
      <span id={`${id}-requirements`} className="block text-sm text-gray-600 mt-1">
        {IMAGE_REQUIREMENTS}{Number.isFinite(limit) && limit > 1 ? ` Select up to ${limit} images.` : ""}
      </span>
      <span id={`${id}-error`} role="alert" className="block text-sm text-red-600 mt-1">{error}</span>
    </span>
  );
}

ImageUploadInput.propTypes = {
  onChange: PropTypes.func,
  onValidationError: PropTypes.func,
  maxFiles: PropTypes.number,
  multiple: PropTypes.bool,
};
