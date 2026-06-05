"use client";

import React, { useState, useEffect } from "react";
import Login from "../components/Login";
import Dashboard from "../components/Dashboard";
import { getCurrentUser } from "../services/api";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const storedToken = localStorage.getItem("authToken");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await getCurrentUser();
        setUser(response.data);
      } catch (e) {
        console.error("Error fetching user on load:", e);
        localStorage.removeItem("authToken");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
