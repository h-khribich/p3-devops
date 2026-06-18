import { useState, useRef } from "react";
import "../style/components/inputComponent.css";
import "../style/components/buttonComponent.css";
import "../style/pages/Upload.css";
import uploadIcon from "../assets/upload.svg";

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 Go en octets

export default function Upload() {
  const [duration, setDuration] = useState("Une semaine");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileAction = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
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
  };

  const truncateFileName = (name: string) => {
    if (name.length > 20) {
      return name.substring(0, 18) + "...";
    }
    return name;
  };

  const isFileTooLarge = file ? file.size > MAX_FILE_SIZE : false;

  return (
    <div className="upload-page">
      <main className="upload-page__content">
        <section className="upload-page__card">
          <h2 className="upload-page__title">Ajouter un fichier</h2>

          <form className="upload-page__form">
            <div className="upload-page__file-section">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {!file ? (
                <button
                  type="button"
                  className="button button--outline-orange"
                  onClick={handleFileAction}
                >
                  Ajouter..
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
                      <span className="file-preview__name">
                        {truncateFileName(file.name)}
                      </span>
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
                onChange={(event) => setPassword(event.target.value)}
                className="input__control"
              />
            </div>

            <div className="input">
              <label htmlFor="duration" className="input__label">
                Expiration
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="input__control"
              >
                <option value="Une semaine">Une semaine</option>
                <option value="3 jours">3 jours</option>
                <option value="une journée">Une journée</option>
              </select>
            </div>

            <button
              type="submit"
              className="button button--primary"
              disabled={isFileTooLarge}
            >
              <img
                src={uploadIcon}
                alt="Upload Icon"
                className="upload-page__icon"
              />
              Téléverser
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
