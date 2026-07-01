export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiErrorPayload = {
  message?: string | string[];
};

// Reads the API error format used by the backend and falls back to a generic message.
export async function readApiError(
  response: Response,
  fallbackMessage: string,
) {
  const payload = (await response
    .json()
    .catch(() => null)) as ApiErrorPayload | null;

  const message = Array.isArray(payload?.message)
    ? payload?.message[0]
    : payload?.message;

  return message || fallbackMessage;
}

// Keeps file size formatting consistent between upload and download pages.
export function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 Octet";
  }

  const base = 1024;
  const labels = ["Octets", "Ko", "Mo", "Go"];
  const index = Math.floor(Math.log(bytes) / Math.log(base));

  return `${Number.parseFloat((bytes / Math.pow(base, index)).toFixed(1))} ${labels[index]}`.replace(
    ".",
    ",",
  );
}

export function getDaysLeft(targetDate: string, referenceTime = Date.now()) {
  const dayInMilliseconds = 1000 * 60 * 60 * 24;
  const difference = new Date(targetDate).getTime() - referenceTime;

  return Math.max(1, Math.ceil(difference / dayInMilliseconds));
}

export function getDownloadUrl(downloadPath: string) {
  return new URL(downloadPath, window.location.origin).toString();
}

export function getDownloadToken(downloadPath: string) {
  return downloadPath.split("/").filter(Boolean).pop() ?? "";
}

// Creates a browser download from a blob returned by the API.
export function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}
