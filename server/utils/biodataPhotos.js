class PhotoValidationError extends Error {}

function photoKey(value) {
  return value.replace(/\\/g, "/").split(/[?#]/)[0].split("/").pop();
}

function photoList(value, field) {
  if (value === undefined) return undefined;
  if (value === "") return [];
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      if (/^\s*[\[{]/.test(value)) {
        throw new PhotoValidationError(`${field} must be a valid JSON array of photo URLs.`);
      }
      parsed = value;
    }
  }
  const values = Array.isArray(parsed) ? parsed : [parsed];
  if (values.some((photo) => typeof photo !== "string" || !photo.trim() || !photoKey(photo))) {
    throw new PhotoValidationError(`${field} must contain photo URLs.`);
  }
  return values;
}

function resolveBiodataPhotos(existing, { removePhotos, retainedPhotos, newPhotos = [] } = {}) {
  const existingByKey = new Map(existing.map((photo) => [photoKey(photo), photo]));
  const removed = photoList(removePhotos, "removePhotos") || [];
  const retained = photoList(retainedPhotos, "closeUpPhoto");
  for (const photo of [...removed, ...(retained || [])]) {
    if (!existingByKey.has(photoKey(photo))) {
      throw new PhotoValidationError("A selected photo does not belong to this biodata. Refresh and try again.");
    }
  }
  const removeKeys = new Set(removed.map(photoKey));
  const keepKeys = retained === undefined ? new Set(existingByKey.keys()) : new Set(retained.map(photoKey));
  const kept = [...existingByKey].filter(([key]) => keepKeys.has(key) && !removeKeys.has(key)).map(([, photo]) => photo);
  const photos = [...kept, ...newPhotos];
  if (photos.length < 1) throw new PhotoValidationError("At least one close-up photo is required.");
  if (photos.length > 3) throw new PhotoValidationError("You can have a maximum of 3 close-up photos. Remove an old photo before adding another.");
  const keptKeys = new Set(kept.map(photoKey));
  return { photos, removedPhotos: [...existingByKey].filter(([key]) => !keptKeys.has(key)).map(([, photo]) => photo) };
}

module.exports = { resolveBiodataPhotos, PhotoValidationError };
