import { NavLink } from "react-router";
import logo from "../assets/logo.svg";
import "../style/pages/LandingPage.css";

export default function LandingPage() {
  return (
    <section className="landing-page">
      <h1 className="landing-page__title">Tu veux partager un fichier ?</h1>
      <NavLink to="/upload" className="landing-page__button">
        <img src={logo} alt="Upload Icon" className="landing-page__icon" />
      </NavLink>
    </section>
  );
}
