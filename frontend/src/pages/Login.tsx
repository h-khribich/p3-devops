import { type FormEvent, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { setAccessToken } from "../auth";
import { API_BASE_URL, readApiError } from "./pageHelpers.ts";
import "../style/components/inputComponent.css";
import "../style/components/buttonComponent.css";
import "../style/pages/Login.css";

type LoginResponse = {
  access_token: string;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Submit the login form and store the token if the backend accepts the credentials.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, "Connexion impossible."));
      }

      const payload = (await response.json()) as LoginResponse;
      setAccessToken(payload.access_token);
      navigate("/my-space");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Connexion impossible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-page__content">
        <section className="login-page__card">
          <h2 className="login-page__title">Connexion</h2>

          <form className="login-page__form" onSubmit={handleSubmit}>
            <div className="input">
              <label htmlFor="email" className="input__label">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Saisissez votre email..."
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                className="input__control"
              />
            </div>

            <div className="input">
              <label htmlFor="password" className="input__label">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="Saisissez votre mot de passe..."
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                className="input__control"
              />
            </div>

            {error && <p className="file-error-message">{error}</p>}

            <div className="login-page__actions">
              <NavLink
                to="/register"
                className="button button--secondary button--small"
              >
                Créer un compte
              </NavLink>
              <button
                type="submit"
                className="button button--primary button--small"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Connexion..." : "Connexion"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
