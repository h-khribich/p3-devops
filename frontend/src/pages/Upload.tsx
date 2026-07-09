import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { getAccessToken } from "../auth";
import {
  API_BASE_URL,
  formatFileSize,
  getDownloadToken,
  getDownloadUrl,
  readApiError,
} from "./pageHelpers.ts";
import "../style/components/inputComponent.css";
import "../style/components/buttonComponent.css";
import "../style/pages/Upload.css";
import uploadIcon from "../assets/upload.svg";

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 Go en octets
const ALLOWED_FILE_TYPES = ["jpg", "jpeg", "png", "pdf", "doc"];
const PUBLIC_LINK_HOST =
  import.meta.env.VITE_PUBLIC_LINK_HOST ?? "datashare.fr";

type UploadSuccess = {
  filename: string;
  size: number;
  expirationDays: number;
  downloadPath: string;
};

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 5.5H3.75A1.75 1.75 0 0 0 2 7.25v5A1.75 1.75 0 0 0 3.75 14h5A1.75 1.75 0 0 0 10.5 12.25V10.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.25 2H7.75A1.75 1.75 0 0 0 6 3.75v4.5A1.75 1.75 0 0 0 7.75 10h4.5A1.75 1.75 0 0 0 14 8.25v-4.5A1.75 1.75 0 0 0 12.25 2Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getDurationLabel(duration: string) {
  if (duration === "3") {
    return "3 jours";
  }

  if (duration === "1") {
    return "une journée";
  }

  return "une semaine";
}

export default function Upload() {
  const [duration, setDuration] = useState("7");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadSuccess | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const durationLabel = getDurationLabel(duration);

  const downloadUrl = uploadResult
    ? getDownloadUrl(uploadResult.downloadPath)
    : "";

  const downloadToken = uploadResult
    ? getDownloadToken(uploadResult.downloadPath)
    : "";

  const displayLink = downloadToken
    ? `${PUBLIC_LINK_HOST}/download/${downloadToken}`
    : "";

  const handleFileAction = () => {
    fileInputRef.current?.click();
  };

  // Small local validation so the user gets fast feedback before the upload starts.
  const isAllowed = (f: File): { ok: boolean; message: string | null } => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      return {
        ok: false,
        message: `Type non autorisé — extensions autorisées : ${ALLOWED_FILE_TYPES.join(", ")}`,
      };
    }
    if (f.size > MAX_FILE_SIZE) {
      return {
        ok: false,
        message: "Fichier trop volumineux — taille maximale : 1 Go",
      };
    }
    return { ok: true, message: null };
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectedFile = input.files?.[0];
    if (!selectedFile) return;
    const res = isAllowed(selectedFile);
    if (!res.ok) {
      input.value = "";
      setFile(null);
      setFileError(res.message || "");
      return;
    }
    setFile(selectedFile);
    setFileError("");
    setUploadError("");
  };

  const isFileTooLarge = file ? file.size > MAX_FILE_SIZE : false;

  const handleCopyLink = async () => {
    if (!downloadUrl) return;

    await navigator.clipboard.writeText(downloadUrl);
    setIsCopied(true);
  };

  // The upload submit stays easy to follow: validate, build FormData, call the API.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setUploadError("Veuillez sélectionner un fichier.");
      return;
    }

    if (passwordError) {
      setUploadError(passwordError);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("expirationDays", duration);

    if (password.trim()) {
      formData.append("password", password.trim());
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const token = getAccessToken();
      const endpoint = token ? "/uploads/me" : "/uploads/anonymous";
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Le téléversement a échoué."),
        );
      }

      const payload = (await response.json()) as UploadSuccess;
      setUploadResult(payload);
      setIsCopied(false);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Le téléversement a échoué.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setUploadResult(null);
    setIsCopied(false);
    setUploadError("");
    setFileError("");
    setFile(null);
    setPassword("");
    setPasswordError("");
    setDuration("7");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="upload-page">
      <main className="upload-page__content">
        <section className="upload-page__card">
          <h2 className="upload-page__title">Ajouter un fichier</h2>

          {!uploadResult ? (
            <form
              className="upload-page__form"
              onSubmit={handleSubmit}
              data-cy="upload-form"
            >
              <div className="upload-page__file-section">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.doc"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  data-cy="upload-file-input"
                />

                {!file ? (
                  <button
                    type="button"
                    className="button button--outline-orange"
                    onClick={handleFileAction}
                  >
                    Ajouter un fichier
                  </button>
                ) : (
                  <>
                    <div className="file-preview">
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
                        <span className="file-preview__name">{file.name}</span>
                        <span
                          className={`file-preview__size ${isFileTooLarge ? "text-error" : ""}`}
                        >
                          {formatFileSize(file.size)}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="button button--outline-orange"
                        onClick={handleFileAction}
                      >
                        Changer
                      </button>
                    </div>
                    {isFileTooLarge && (
                      <p className="file-error-message">
                        La taille des fichiers est limitée à 1 Go
                      </p>
                    )}
                  </>
                )}
                {fileError && <p className="file-error-message">{fileError}</p>}
              </div>

              <div className="input">
                <label htmlFor="password" className="input__label">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Optionnel"
                  value={password}
                  onChange={(event) => {
                    const v = event.currentTarget.value;
                    setPassword(v);
                    setPasswordError(
                      v && v.length > 0 && v.length < 6
                        ? "Le mot de passe doit contenir au moins 6 caractères."
                        : "",
                    );
                    setUploadError("");
                  }}
                  className="input__control"
                />
                {passwordError && (
                  <p className="file-error-message">{passwordError}</p>
                )}
              </div>

              <div className="input">
                <label htmlFor="duration" className="input__label">
                  Expiration
                </label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(event) => setDuration(event.currentTarget.value)}
                  className="input__control"
                >
                  <option value="7">Une semaine</option>
                  <option value="3">3 jours</option>
                  <option value="1">Une journée</option>
                </select>
              </div>

              {uploadError && (
                <p className="file-error-message">{uploadError}</p>
              )}

              <button
                type="submit"
                className="button button--primary"
                disabled={!file || isFileTooLarge || isUploading}
                data-cy="upload-submit"
              >
                <img
                  src={uploadIcon}
                  alt="Upload Icon"
                  className="upload-page__icon"
                />
                {isUploading ? "Téléversement..." : "Téléverser"}
              </button>
            </form>
          ) : (
            <div className="upload-success">
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
                    {uploadResult.filename}
                  </span>
                  <span className="file-preview__size">
                    {formatFileSize(uploadResult.size)}
                  </span>
                </div>
              </div>

              <p className="upload-success__message">
                Félicitations, ton fichier sera conservé chez nous pendant{" "}
                {durationLabel} !
              </p>

              <a
                className="upload-success__link"
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                data-cy="upload-success-link"
              >
                {displayLink}
              </a>

              <button
                type="button"
                className="button button--outline-orange upload-success__copy"
                onClick={handleCopyLink}
              >
                <CopyIcon />
                {isCopied ? "Lien copié" : "Copier le lien"}
              </button>

              <button
                type="button"
                className="button button--secondary upload-success__reset"
                onClick={resetForm}
              >
                Ajouter un autre fichier
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
