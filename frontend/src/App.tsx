import { Outlet } from "react-router";
import Footer from "./pages/Footer.tsx";
import Header from "./pages/Header.tsx";

function App() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

export default App;
