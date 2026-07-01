import { NavLink } from "react-router";
import { isAuthenticated } from "../auth";
import "../style/components/headerComponent.css";

export default function Header() {
  const loggedIn = isAuthenticated();

  return (
    <header className="header">
      <div className="header__inner">
        <NavLink to="/" className="header__logo header__title">
          DataShare
        </NavLink>
        <div className="header__actions">
          <NavLink
            to={loggedIn ? "/my-space" : "/login"}
            className="header__action-button"
          >
            {loggedIn ? "Mon espace" : "Se connecter"}
          </NavLink>
        </div>
      </div>
    </header>
  );
}
