// src/api/cost_center.js
import api from "./axios";

// GET ALL COST CENTER
export const getCostCenters = async (search = "") => {
    const response = await api.get(
        "/cost-center/",
        {
            params: {
                search,
            },
        }
    );

    return response.data;
};

// CREATE COST CENTER
export const createCostCenter = async (payload) => {
    const response = await api.post(
        "/cost-center/",
        payload
    );

    return response.data;
};

// DELETE COST CENTER
export const deleteCostCenter = async (id) => {
    const response = await api.delete(
        `/cost-center/${id}`
    );

    return response.data;
};