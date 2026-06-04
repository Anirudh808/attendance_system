"use client";

import React, { useState, useEffect } from "react";
import Login from "../components/Login";
import Dashboard from "../components/Dashboard";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      // Check if user is already logged in
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        setIsLoading(true);
        try {
          const staff = await getStaffByIdOrEmail(storedToken);
          return staff;
        } catch (e) {
          console.error("Error fetching user on load:", e);
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchUser().then((staff) => {
      if (staff) {
        setUser(staff);
      }
    });
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
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
