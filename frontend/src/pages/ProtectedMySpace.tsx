import { Navigate } from "react-router";
import MySpace from "./MySpace.tsx";
import { isAuthenticated } from "../auth.ts";

export default function ProtectedMySpace() {
  return isAuthenticated() ? <MySpace /> : <Navigate to="/login" replace />;
}
