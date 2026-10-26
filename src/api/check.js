import api from "./axios";

// GET HISTORY CHECK
export const getChecks = async (params = {}) => {
  const response = await api.get("/check", {
    params,
  });

  return response.data;
};

// SEARCH VENDOR
export const searchVendor = async (keyword) => {
  const response = await api.get("/check", {
    params: {
      vendor: keyword,
    },
  });
  return response.data;
};

// CREATE CHECK
export const createCheck = async (payload) => {
  const response = await api.post("/check", payload);
  return response.data;
};

// DELETE CHECK
export const deleteCheck = async (id) => {
  const response = await api.delete(`/check/${id}`);
  return response.data;
};

// GET CHECK LAYOUT OFFSETS FROM SERVER
export const getCheckLayouts = async () => {
  const response = await api.get("/check-layouts");
  return response.data;
};

// SAVE CHECK LAYOUT OFFSET TO SERVER
export const saveCheckLayout = async (payload) => {
  const response = await api.post("/check-layouts", payload);
  return response.data;
};

// DELETE CHECK LAYOUT FROM SERVER
export const deleteCheckLayout = async (bankName) => {
  const response = await api.delete(`/check-layouts/${encodeURIComponent(bankName)}`);
  return response.data;
};

// EXPORT CHECK EXCEL
export { exportCheck } from "./export";