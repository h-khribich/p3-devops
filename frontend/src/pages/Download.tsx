import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import "../style/components/inputComponent.css";
import "../style/components/buttonComponent.css";
import "../style/pages/Upload.css";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type DownloadMetadata = {
  filename: string;
  size: number;
  expiresAt: string;
  passwordRequired: boolean;
  expired: boolean;
};

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 2.5V11.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M5.5 8.5L9 12L12.5 8.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 14.5H14.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Download() {
  const { token = "" } = useParams();
  const [metadata, setMetadata] = useState<DownloadMetadata | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

  const fileSize = useMemo(() => {
    if (!metadata) return "";
    const bytes = metadata.size;
    if (bytes === 0) return "0 Octet";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(1))
        .toString()
        .replace(".", ",") +
      " " +
      sizes[i]
    );
  }, [metadata]);

  const expiryLabel = useMemo(() => {
    if (!metadata || loadedAt === 0) return "";
    const daysLeft = Math.max(
      1,
      Math.ceil(
        (new Date(metadata.expiresAt).getTime() - loadedAt) /
          (1000 * 60 * 60 * 24),
      ),
    );
    return daysLeft === 1 ? "1 jour" : `${daysLeft} jours`;
  }, [loadedAt, metadata]);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!token) {
        setError("Lien invalide.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/downloads/${token}`);

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(payload?.message || "Lien introuvable ou expiré.");
        }

        const payload = (await response.json()) as DownloadMetadata;
        setLoadedAt(Date.now());
        setMetadata(payload);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger le fichier.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadMetadata();
  }, [token]);

  const handleDownload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setError("Lien invalide.");
      return;
    }

    if (metadata?.passwordRequired && password.trim().length === 0) {
      setPasswordError("Le mot de passe est requis.");
      return;
    }

    if (password.trim().length > 0 && password.trim().length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/downloads/${token}/file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password.trim() || undefined }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Téléchargement impossible.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = metadata?.filename ?? "download";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Téléchargement impossible.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="upload-page">
      <main className="upload-page__content">
        <section className="upload-page__card">
          <h2 className="upload-page__title">Télécharger un fichier</h2>

          {isLoading ? (
            <p className="upload-success__message">Chargement du fichier...</p>
          ) : error ? (
            <p className="file-error-message">{error}</p>
          ) : metadata ? (
            <form className="upload-page__form" onSubmit={handleDownload}>
              <div className="file-preview upload-success__file-preview">
                <div className="file-preview__icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>

                <div className="file-preview__details">
                  <span className="file-preview__name">
                    {metadata.filename}
                  </span>
                  <span className="file-preview__size">{fileSize}</span>
                </div>
              </div>

              <div className="upload-page__alert">
                <span className="upload-page__alert-icon">i</span>
                <span>Ce fichier expirera dans {expiryLabel}.</span>
              </div>

              {metadata.passwordRequired && (
                <div className="input">
                  <label htmlFor="download-password" className="input__label">
                    Mot de passe
                  </label>
                  <input
                    id="download-password"
                    type="password"
                    placeholder="Saisissez le mot de passe..."
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordError("");
                      setError("");
                    }}
                    className="input__control"
                  />
                  {passwordError && (
                    <p className="file-error-message">{passwordError}</p>
                  )}
                </div>
              )}

              {error && <p className="file-error-message">{error}</p>}

              <button
                type="submit"
                className="button button--primary"
                disabled={
                  isDownloading || (metadata.passwordRequired && !password)
                }
              >
                <DownloadIcon />
                {isDownloading ? "Téléchargement..." : "Télécharger"}
              </button>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}
