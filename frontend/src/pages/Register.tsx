import { useState } from "react";
import "../components/headerComponent.css";
import "../components/inputComponent.css";
import "../components/buttonComponent.css";
import "./Register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  return (
    <div className="register-page">
      <header className="header register-page__header">
        <div className="header__inner">
          <h1 className="header__title">DataShare</h1>
          <div className="header__actions">
            <button type="button" className="header__action-button">
              Se connecter
            </button>
          </div>
        </div>
      </header>

      <main className="register-page__content">
        <section className="register-page__card">
          <h2 className="register-page__title">Créer un compte</h2>

          <form className="register-page__form">
            <div className="input">
              <label htmlFor="register-email" className="input__label">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                placeholder="Saisissez votre email..."
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
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
                  setPasswordConfirmation(event.target.value)
                }
                className="input__control"
              />
            </div>

            <div className="register-page__actions">
              <button
                type="button"
                className="button button--tertiary button--small"
              >
                J'ai déjà un compte
              </button>
              <button
                type="submit"
                className="button button--primary button--small"
              >
                Créer mon compte
              </button>
            </div>
          </form>
        </section>
      </main>

      <footer className="register-page__footer">
        <p className="register-page__footer-text">
          Copyright DataShare © 2025
        </p>
      </footer>
    </div>
  );
}
