import api from "./axios";

export const loginApi = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

export const logoutApi = async () => {
  try {
    const response = await api.post("/auth/logout");
    return response.data;
  } catch (error) {
    console.error("Logout error:", error);
    return null;
  }
};

export const getMeApi = async () => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    console.error("Get profile error:", error);
    return null;
  }
};

export const changePasswordApi = async (passwordData) => {
  const response = await api.post("/auth/change-password", passwordData);
  return response.data;
};

export const getUsersApi = async () => {
  const response = await api.get("/auth/users");
  return response.data;
};

export const createUserApi = async (userData) => {
  const response = await api.post("/auth/users", userData);
  return response.data;
};

export const updateUserApi = async (id, userData) => {
  const response = await api.put(`/auth/users/${id}`, userData);
  return response.data;
};

export const deleteUserApi = async (id) => {
  const response = await api.delete(`/auth/users/${id}`);
  return response.data;
};
