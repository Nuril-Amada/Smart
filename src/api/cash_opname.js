import api from "./axios";

export const getSettlementRecap = async (params) => {
    const response = await api.get("/cash-opname/recap/settlement", { params });
    return response.data;
};

export const getAdvanceRecap = async (params) => {
    const response = await api.get("/cash-opname/recap/advance", { params });
    return response.data;
};

export const getCashOpnameHistory = async () => {
    const response = await api.get("/cash-opname/history");
    return response.data;
};

export const saveCashOpname = async (data) => {
    const response = await api.post("/cash-opname", data);
    return response.data;
};

export const updateCashOpname = async (id, data) => {
    const response = await api.put(`/cash-opname/${id}`, data);
    return response.data;
};

export const deleteCashOpname = async (id) => {
    const response = await api.delete(`/cash-opname/${id}`);
    return response.data;
};

export const downloadCashOpnamePdf = async (id) => {
    const response = await api.get(`/cash-opname/${id}/pdf`, {
        responseType: "blob",
    });
    return response.data;
};
