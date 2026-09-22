import axios from "axios";

export const api = axios.create({
  baseURL: "https://graceful-adventure-production-db1e.up.railway.app/api"
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err?.response?.data?.error ?? "Une erreur réseau est survenue.";
    return Promise.reject(new Error(message));
  }
);

/** Déclenche le téléchargement d'un fichier binaire renvoyé par l'API (PDF/Excel). */
export async function downloadFile(url: string, filename: string) {
  const res = await api.get(url, { responseType: "blob" });

  const blobUrl = window.URL.createObjectURL(res.data);
  const a = document.createElement("a");

  a.href = blobUrl;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(blobUrl);
}