import { Outlet, useLocation } from "react-router";
import Footer from "./pages/Footer.tsx";
import Header from "./pages/Header.tsx";

function App() {
  const location = useLocation();
  const isMySpace = location.pathname === "/my-space";

  return (
    <>
      {!isMySpace && <Header />}
      <Outlet />
      {!isMySpace && <Footer />}
    </>
  );
}

export default App;
