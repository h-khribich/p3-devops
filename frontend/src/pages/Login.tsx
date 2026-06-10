import { useState } from "react";
import "../components/headerComponent.css";
import "../components/inputComponent.css";
import "../components/buttonComponent.css";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-page">
      <header className="header login-page__header">
        <div className="header__inner">
          <h1 className="header__title">DataShare</h1>
          <div className="header__actions">
            <button type="button" className="header__action-button">
              Se connecter
            </button>
          </div>
        </div>
      </header>

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
              <button
                type="button"
                className="button button--secondary button--small"
              >
                Créer un compte
              </button>
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

      <footer className="login-page__footer">
        <p className="login-page__footer-text">Copyright DataShare © 2025</p>
      </footer>
    </div>
  );
}
