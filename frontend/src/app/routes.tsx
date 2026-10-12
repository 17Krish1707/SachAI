import { createBrowserRouter, Navigate } from "react-router";
import PublicLayout from "./shared/components/layout/PublicLayout";
import HomePage from "./features/verify/HomePage";
import ResultPage from "./features/verify/ResultPage";
import HistoryPage from "./features/history/HistoryPage";
import AboutPage from "./features/about/AboutPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicLayout>
        <HomePage />
      </PublicLayout>
    ),
  },
  {
    path: "/result/:id",
    element: (
      <PublicLayout>
        <ResultPage />
      </PublicLayout>
    ),
  },
  {
    path: "/history",
    element: (
      <PublicLayout>
        <HistoryPage />
      </PublicLayout>
    ),
  },
  {
    path: "/about",
    element: (
      <PublicLayout>
        <AboutPage />
      </PublicLayout>
    ),
  },
  // Redirect legacy login, admin, and mock dashboard routes directly to public verify home
  {
    path: "/login",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/dashboard",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/dashboard/*",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/admin",
    element: <Navigate to="/" replace />,
  },
  {
    path: "/admin/*",
    element: <Navigate to="/" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
