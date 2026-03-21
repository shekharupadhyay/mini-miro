import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, clearToken } from "../utils/auth";
import "./Login.css";

const API = import.meta.env.VITE_API_BASE;

export default function Login() {
  const navigate = useNavigate();

  // Handle token coming back from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (token) {
      localStorage.setItem("auth_token", token);
      window.history.replaceState({}, "", "/");
      navigate("/", { replace: true });
      return;
    }

    if (error) {
      window.history.replaceState({}, "", "/login");
      return;
    }

    // Already logged in → go to dashboard
    if (getToken()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  function handleLogout() {
    clearToken();
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
               strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="7" height="7" />
            <rect x="11" y="2" width="7" height="7" />
            <rect x="2" y="11" width="7" height="7" />
            <rect x="11" y="11" width="7" height="7" />
          </svg>
        </div>

        <div className="login-title">Welcome to MiniMiro</div>
        <div className="login-subtitle">Sign in to create and manage your boards</div>

        <button
          className="google-signin-btn"
          onClick={() => { window.location.href = `${API}/auth/google`; }}
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="login-terms">
          By signing in you agree to our terms of service
        </p>
      </div>
    </div>
  );
}
