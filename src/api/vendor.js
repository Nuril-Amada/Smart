import api from "./axios";

// GET ALL VENDOR
export const getVendors = async (search = "") => {
  const response = await api.get("/vendor", {
    params: {
      search,
    },
  });

  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
};

// GET DETAIL VENDOR
export const getVendorById = async (id) => {
  const response = await api.get(`/vendor/${id}`);
  return response.data;
};

// CREATE VENDOR
export const createVendor = async (payload) => {
  const response = await api.post("/vendor", payload);
  return response.data;
};

// DELETE VENDOR
export const deleteVendor = async (id) => {
  const response = await api.delete(`/vendor/${id}`);
  return response.data;
};