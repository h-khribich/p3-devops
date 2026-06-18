import { useState } from "react";
import { NavLink } from "react-router";
import "../style/components/inputComponent.css";
import "../style/components/buttonComponent.css";
import "../style/pages/Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-page">
      <main className="login-page__content">
        <section className="login-page__card">
          <h2 className="login-page__title">Connexion</h2>

          <form className="login-page__form">
            <div className="input">
              <label htmlFor="email" className="input__label">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Saisissez votre email..."
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                className="input__control"
              />
            </div>

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
              >
                Connexion
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
