export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const IMAGE_REQUIREMENTS = "JPG, JPEG, PNG, or WEBP only. Maximum size: 5 MB per image.";
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateImageFiles(files, { maxFiles = Infinity, required = false } = {}) {
  const images = Array.from(files || []);
  if (required && !images.length) return "Error: An image is required.";
  if (images.length && maxFiles <= 0) return "Error: Remove an existing image before adding another.";
  if (images.length > maxFiles) return `Error: Select no more than ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`;
  for (const file of images) {
    if (file.size > MAX_IMAGE_SIZE) return "Error: Maximum file size is 5 MB. Please choose a smaller image.";
    if (!/\.(jpe?g|png|webp)$/i.test(file.name) ||
        !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      return "Error: Choose a JPG, JPEG, PNG, or WEBP image.";
    }
  }
  return "";
}

export async function readUploadResponse(response) {
  if (response.status === 413) {
    throw new Error("Error: Upload is too large. Choose a smaller image (maximum 5 MB per image). The server may enforce a smaller total upload limit.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status === false) {
    throw new Error(data?.error || data?.message || "Unable to save. Please try again.");
  }
  if (!data) throw new Error("The server returned an invalid response. Please try again.");
  return data;
}
