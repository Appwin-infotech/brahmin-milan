import { BASE_URL, IMAGE_URL } from "./constants";

export const getPhotoUrl = (mediaUrl) => {
    if (!mediaUrl || typeof mediaUrl !== "string") return null;
    if (/^(https?:\/\/|blob:|data:)/i.test(mediaUrl)) return mediaUrl;

    const normalized = mediaUrl.replace(/\\/g, "/");
    const uploadsIndex = normalized.lastIndexOf("/uploads/");
    const publicPath = uploadsIndex >= 0
        ? normalized.slice(uploadsIndex + 1)
        : normalized.replace(/^\/+/, "");
    const base = (IMAGE_URL || BASE_URL || "").replace(/\/+$/, "");
    return `${base}/${publicPath}`;
};

export const getAdvertisementMediaUrl = getPhotoUrl;

export const getPhotoUrls = (photoOrPhotos) => {
    if (!photoOrPhotos) return [];

    const arr = Array.isArray(photoOrPhotos) ? photoOrPhotos : [photoOrPhotos];

    return arr.map(getPhotoUrl).filter(Boolean);
};
