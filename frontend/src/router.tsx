import { createBrowserRouter } from "react-router";
import App from "./App.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import LandingPage from "./pages/LandingPage.tsx";
import Upload from "./pages/Upload.tsx";
import Download from "./pages/Download.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import ProtectedMySpace from "./pages/ProtectedMySpace.tsx";
import ProtectedDashboardLayout from "./pages/ProtectedDashboardLayout.tsx";

export const router = createBrowserRouter([
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
        Component: NotFoundPage,
      },
    ],
  },
  {
    path: "/",
    Component: ProtectedDashboardLayout,
    children: [{ path: "my-space", Component: ProtectedMySpace }],
  },
]);
