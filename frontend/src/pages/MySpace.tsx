import { useEffect, useState } from "react";
import { Link, useNavigate, NavLink } from "react-router";
import { clearAccessToken, getAccessToken } from "../auth";
import { API_BASE_URL, getDaysLeft, readApiError } from "./pageHelpers.ts";
import "../style/components/buttonComponent.css";
import "../style/pages/MySpace.css";

type FilterKey = "active" | "all" | "expired";

type UserFile = {
  id: number;
  filename: string;
  size: number;
  sendDate: string;
  expireDate: string;
  state: "active" | "expired";
  downloadPath: string;
  passwordRequired: boolean;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "expired", label: "Expirés" },
];

function getStatusLabel(file: UserFile) {
  if (file.state === "expired") {
    return "Expiré";
  }

  const daysLeft = getDaysLeft(file.expireDate);

  if (daysLeft === 1) {
    return "Expire demain";
  }

  return `Expire dans ${daysLeft} jours`;
}

export default function MySpace() {
  const [filter, setFilter] = useState<FilterKey>("active");
  const [files, setFiles] = useState<UserFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const token = getAccessToken();

  useEffect(() => {
    if (!token) return;

    const loadFiles = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/files/me?status=${filter}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            await readApiError(response, "Impossible de charger vos fichiers."),
          );
        }

        const payload = (await response.json()) as UserFile[];
        setFiles(payload);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger vos fichiers.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadFiles();
  }, [filter, token]);

  const handleDelete = async (fileId: number) => {
    if (!token) return;
    const file = files.find((item) => item.id === fileId);

    let password: string | undefined;
    if (file?.passwordRequired) {
      const input = window.prompt(
        "Ce fichier est protégé. Saisissez le mot de passe pour le supprimer.",
      );

      if (input === null) {
        return;
      }

      if (input.trim().length === 0) {
        setError("Le mot de passe est requis pour supprimer ce fichier.");
        return;
      }

      password = input.trim();
    }

    setDeletingId(fileId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/files/me/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Suppression impossible."),
        );
      }

      setFiles((current) => current.filter((file) => file.id !== fileId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Suppression impossible.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleAccess = (file: UserFile) => {
    if (file.state !== "active") {
      return;
    }

    if (!file.passwordRequired) {
      navigate(file.downloadPath);
      return;
    }

    const password = window.prompt(
      "Ce fichier est protégé. Saisissez le mot de passe pour l'ouvrir.",
    );

    if (password === null) {
      return;
    }

    if (password.trim().length === 0) {
      setError("Le mot de passe est requis pour accéder à ce fichier.");
      return;
    }

    navigate(
      `${file.downloadPath}?password=${encodeURIComponent(password.trim())}`,
    );
  };

  const handleLogout = () => {
    clearAccessToken();
    navigate("/login");
  };

  if (!token) {
    return (
      <main className="myspace-page">
        <section className="myspace-panel">
          <h2>Mon espace</h2>
          <p>Vous devez vous connecter pour voir vos fichiers.</p>
          <Link to="/login" className="button button--primary">
            Se connecter
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="myspace-dashboard">
      <aside className={`myspace-sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <i
          id="sidebar-closeBtn"
          className="fa-solid fa-x"
          onClick={() => setIsSidebarOpen(false)}
        ></i>
        <NavLink to="/" className="myspace-sidebar__logo">
          DataShare
        </NavLink>
        <nav className="myspace-sidebar__nav">
          <button type="button" className="myspace-sidebar__nav-item is-active">
            Mes fichiers
          </button>
        </nav>
        <p className="myspace-sidebar__copyright">Copyright DataShare© 2025</p>
      </aside>

      <section className="myspace-workspace">
        <header className="myspace-toolbar">
          <button
            type="button"
            id="burger-menu__mobile"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <button
            type="button"
            id="user__mobile"
            aria-label="Profil utilisateur"
          >
            <i className="fa-solid fa-user"></i>
          </button>
          <Link to="/upload" className="myspace-toolbar__button">
            Ajouter des fichiers
          </Link>
          <button
            type="button"
            className="myspace-toolbar__logout"
            onClick={handleLogout}
          >
            <i className="fa-solid fa-arrow-right-to-bracket"></i>
            Déconnexion
          </button>
        </header>

        <div className="myspace-content">
          <div className="myspace-panel__top">
            <h2 className="myspace-panel__title">Mes fichiers</h2>
          </div>

          <div className="myspace-filters">
            <div className="myspace-filters__wrapper">
              {FILTERS.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  className={`myspace-filters__chip ${filter === option.key ? "is-active" : ""}`}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="myspace-status">Chargement...</p>
          ) : error ? (
            <p className="myspace-error">{error}</p>
          ) : files.length === 0 ? (
            <p className="myspace-status">Aucun fichier pour ce filtre.</p>
          ) : (
            <div className="myspace-list">
              {files.map((file) => (
                <article key={file.id} className="myspace-item">
                  <div className="myspace-item__main">
                    <span
                      className="myspace-item__file-icon"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                      >
                        <path
                          d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20V3.5Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M14 3.5V8h4"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                      </svg>
                    </span>

                    <div className="myspace-item__text">
                      <p className="myspace-item__name" title={file.filename}>
                        {file.filename}
                      </p>
                      <p
                        className={`myspace-item__meta ${file.state === "expired" ? "is-expired" : ""}`}
                      >
                        {getStatusLabel(file)}
                      </p>
                    </div>
                  </div>

                  <div className="myspace-item__actions">
                    {file.state === "active" && file.passwordRequired && (
                      <span
                        className="myspace-item__lock"
                        title="Fichier protégé par mot de passe"
                        aria-label="Fichier protégé par mot de passe"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="12"
                          height="12"
                          fill="none"
                        >
                          <rect
                            x="5"
                            y="10"
                            width="14"
                            height="10"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M8 10V7.5a4 4 0 0 1 8 0V10"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                        </svg>
                      </span>
                    )}

                    {file.state === "active" ? (
                      <>
                        <button
                          type="button"
                          className="myspace-action myspace-action--danger"
                          onClick={() => void handleDelete(file.id)}
                          disabled={deletingId === file.id}
                        >
                          <i className="fa-regular fa-trash-can"></i>
                          {deletingId === file.id
                            ? "Suppression..."
                            : "Supprimer"}
                        </button>
                        <button
                          type="button"
                          className="myspace-action"
                          onClick={() => handleAccess(file)}
                        >
                          Accéder
                          <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      </>
                    ) : (
                      <span className="myspace-item__expired-note">
                        Ce fichier a expiré, il n'est plus stocké chez nous
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
