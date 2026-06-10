export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <h1 className="header__title">DataShare</h1>
        <div className="header__actions">
          <button type="button" className="header__action-button">
            Se connecter
          </button>
        </div>
      </div>
    </header>
  );
}
