// Marketing popup settings (Firestore site_settings/popup):
//   isActive:        show the popup on the website
//   images:          [{ url, storagePath }] in the order they're shown
//   intervalSeconds: how long each poster stays before the next one slides in
//   imageUrl:        first poster - older versions of the site only read this field
// Popups saved before multiple posters existed only have imageUrl (a data: URL).

export const DEFAULT_POPUP_INTERVAL = 5;
export const POPUP_INTERVAL_OPTIONS = [3, 5, 8, 10];

export const popupImagesOf = (data) => {
  if (Array.isArray(data?.images)) return data.images.filter(i => i?.url);
  return data?.imageUrl ? [{ url: data.imageUrl, storagePath: '' }] : [];
};

export const popupIntervalOf = (data) => {
  const n = Number(data?.intervalSeconds);
  return n >= 2 && n <= 60 ? n : DEFAULT_POPUP_INTERVAL;
};
