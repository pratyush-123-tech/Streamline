import { createContext, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import httpStatus from "http-status";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: "http://localhost:8080",
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState("");
  const router = useNavigate();

  const handleRegister = async (username, password) => {
    try {
      let request = await client.post("/register", {
        username,
        password,
      });
      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (err) {
      throw err;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      let request = await client.post("/login", { username, password });
      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        localStorage.setItem("isGuest", "false");
        router("/home");
      }
    } catch (err) {
      throw err;
    }
  };

  const handleGuestLogin = async () => {
    try {
      let request = await client.post("/guest_login");
      if (request.status === httpStatus.CREATED) {
        localStorage.setItem("token", request.data.token);
        localStorage.setItem("isGuest", "true");
        router("/home");
      }
    } catch (err) {
      throw err;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        },
      });
      return request.data;
    } catch (err) {
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post("/add_to_activity", {
        token: localStorage.getItem("token"),
        meeting_code: meetingCode,
      });
      return request;
    } catch (e) {
      throw e;
    }
  };

  const data = {
    userData,
    setUserData,
    addToUserHistory,
    getHistoryOfUser,
    handleRegister,
    handleLogin,
    handleGuestLogin,
  };

  return (
    <AuthContext.Provider value={data}>
      {children}
    </AuthContext.Provider>
  );
};