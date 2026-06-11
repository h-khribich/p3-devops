import { NavLink } from "react-router";

export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <h1 className="header__title">DataShare</h1>
        <div className="header__actions">
          <NavLink to="/login" className="header__action-button">
            Se connecter
          </NavLink>
        </div>
      </div>
    </header>
  );
}
