import { IMAGE_URL } from "./constants";

export const getPhotoUrl = (photo) => {
    if (!photo || typeof photo !== "string") return null;

    if (photo.startsWith("http://") || photo.startsWith("https://")) {
        return photo;
    }

    return IMAGE_URL + photo;
};

export const getPhotoUrls = (photoOrPhotos) => {
    if (!photoOrPhotos) return [];

    const arr = Array.isArray(photoOrPhotos) ? photoOrPhotos : [photoOrPhotos];

    return arr.map(getPhotoUrl).filter(Boolean);
};