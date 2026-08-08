import { IMAGE_URL } from "./constants";

export const getPhotoUrl = (photo) => {
    if (!photo || typeof photo !== "string") return null;

    if (photo.startsWith("http://") || photo.startsWith("https://")) {
        return photo;
    }
    const base = IMAGE_URL.replace(/\/+$/, "");
    const path = photo.replace(/^\/+/, "");
    return `${base}/${path}`;
};

export const getPhotoUrls = (photoOrPhotos) => {
    if (!photoOrPhotos) return [];

    const arr = Array.isArray(photoOrPhotos) ? photoOrPhotos : [photoOrPhotos];

    return arr.map(getPhotoUrl).filter(Boolean);
};