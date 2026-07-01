import { type FormEvent, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { API_BASE_URL, readApiError } from "./pageHelpers.ts";
import "../style/components/inputComponent.css";
import "../style/components/buttonComponent.css";
import "../style/pages/Register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Submit the registration form with a small amount of validation before calling the API.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (trimmedPassword !== passwordConfirmation.trim()) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Impossible de créer le compte."),
        );
      }

      // The backend only creates the user here, so we send the user to the login page.
      await response.json().catch(() => null);
      navigate("/login");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Impossible de créer le compte.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <main className="register-page__content">
        <section className="register-page__card">
          <h2 className="register-page__title">Créer un compte</h2>

          <form className="register-page__form" onSubmit={handleSubmit}>
            <div className="input">
              <label htmlFor="register-email" className="input__label">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                placeholder="Saisissez votre email..."
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                className="input__control"
              />
            </div>

            <div className="input">
              <label htmlFor="register-password" className="input__label">
                Mot de passe
              </label>
              <input
                id="register-password"
                type="password"
                placeholder="Saisissez votre mot de passe..."
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                className="input__control"
              />
            </div>

            <div className="input">
              <label
                htmlFor="register-password-confirmation"
                className="input__label"
              >
                Verification du mot de passe
              </label>
              <input
                id="register-password-confirmation"
                type="password"
                placeholder="Saisissez le à nouveau"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.currentTarget.value)
                }
                className="input__control"
              />
            </div>

            {error && <p className="file-error-message">{error}</p>}

            <div className="register-page__actions">
              <NavLink
                to="/login"
                className="button button--tertiary button--small"
              >
                J'ai déjà un compte
              </NavLink>
              <button
                type="submit"
                className="button button--primary button--small"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Création..." : "Créer mon compte"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
