import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import App from "./App.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import Upload from "./pages/Upload.tsx";
import Download from "./pages/Download.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { index: true, Component: LandingPage },
      { path: "welcome", Component: LandingPage },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "upload", Component: Upload },
      { path: "download/:token", Component: Download },
      {
        path: "*",
        Component: () => (
          <main className="not-found-page">
            <h2>Page introuvable</h2>
          </main>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
