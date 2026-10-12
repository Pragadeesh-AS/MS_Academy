const MAX_DIMENSION = 1920;

// Shrink large phone photos before upload so visitors don't download multi-MB originals
export const resizeImage = (file, maxDimension = MAX_DIMENSION) => new Promise((resolve) => {
  if (file.type === 'image/gif') return resolve(file);
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => resolve(blob && blob.size < file.size ? blob : file),
      'image/jpeg',
      0.85
    );
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(file);
  };
  img.src = objectUrl;
});
