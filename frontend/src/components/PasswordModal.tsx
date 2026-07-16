import { useState } from "react";
import "../style/components/passwordModal.css";

interface PasswordModalProps {
  filename: string;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  error?: string;
  isDeleting?: boolean;
}

export default function PasswordModal({
  filename,
  onConfirm,
  onCancel,
  error: externalError,
  isDeleting = false,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const displayedError = externalError || localError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.trim().length === 0) {
      setLocalError("Le mot de passe est requis pour supprimer ce fichier.");
      return;
    }

    setLocalError("");
    onConfirm(password.trim());
  };

  return (
    <div
      className="password-modal-overlay"
      onClick={isDeleting ? undefined : onCancel}
    >
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="password-modal__header">
          <h3 className="password-modal__title">Supprimer le fichier</h3>
          <button
            type="button"
            className="password-modal__close"
            onClick={onCancel}
            aria-label="Fermer"
            disabled={isDeleting}
          >
            <i className="fa-solid fa-x"></i>
          </button>
        </div>

        <p className="password-modal__description">
          Le fichier <strong>{filename}</strong> est protégé par mot de passe.
          Veuillez le saisir pour confirmer la suppression.
        </p>

        <form className="password-modal__form" onSubmit={handleSubmit}>
          <label htmlFor="modal-password" className="password-modal__label">
            Mot de passe
          </label>
          <input
            id="modal-password"
            type="password"
            className="password-modal__input"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLocalError("");
            }}
            autoFocus
            disabled={isDeleting}
            placeholder="Saisissez le mot de passe"
          />

          {displayedError && (
            <p className="password-modal__error">{displayedError}</p>
          )}

          <div className="password-modal__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="button button--danger"
              disabled={isDeleting}
            >
              {isDeleting ? (
                "Suppression..."
              ) : (
                <>
                  <i className="fa-regular fa-trash-can"></i>
                  Supprimer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
