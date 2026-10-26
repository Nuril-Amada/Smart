import api from "./axios";

export const getEmployees = async (search = "") => {
  const response = await api.get("/employees", {
    params: {
      search,
    },
  });

  return response.data;
};

export const createEmployee = async (data) => {
  const response = await api.post("/employees", data);

  return response.data;
};

export const updateEmployee = async (id, data) => {
  const response = await api.put(`/employees/${id}`, data);

  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}`);

  return response.data;
};