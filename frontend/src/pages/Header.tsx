import { NavLink } from "react-router";

export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <NavLink to="/" className="header__logo header__title">
          DataShare
        </NavLink>
        <div className="header__actions">
          <NavLink to="/login" className="header__action-button">
            Se connecter
          </NavLink>
        </div>
      </div>
    </header>
  );
}
