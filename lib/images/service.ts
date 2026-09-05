const MAX_LOCAL_IMAGE_BYTES = 5 * 1024 * 1024;

export async function validateRemoteImageUrl(value: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("Image URL must be a valid URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Image URL must use HTTPS.");
  }

  return parsedUrl.toString();
}

export function readLocalImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  if (file.size > MAX_LOCAL_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export async function copyImageToAppStorage(uri: string) {
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(uri)) {
    throw new Error("Local image data is invalid.");
  }

  if (uri.length > Math.ceil((MAX_LOCAL_IMAGE_BYTES * 4) / 3) + 100) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  return uri;
}
