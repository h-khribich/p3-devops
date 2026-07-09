import { Navigate } from "react-router";
import { isAuthenticated } from "./auth.ts";

/**
 * Composant de route protégée : redirige vers /login si non authentifié.
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}
