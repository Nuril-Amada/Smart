import axios from "./axios";

export const getSettlementSummary = async (params) => {
    const { data } = await axios.get("/settlements/summary", { params });
    return data;
};

export const getSettlementList = async (params) => {
    const { data } = await axios.get("/settlements/list", { params });
    return data;
};

export const createReimbursement = async (payload) => {
    const { data } = await axios.post(
        "/settlements/reimbursement",
        payload
    );
    return data;
};

export const updateReimbursement = async (id, payload) => {
    const { data } = await axios.put(
        `/settlements/reimbursement/${id}`,
        payload
    );
    return data;
};

export const deleteReimbursement = async (id) => {
    const { data } = await axios.delete(
        `/settlements/${id}`
    );
    return data;
};

export const toggleSettlementCheck = async (id) => {
    const { data } = await axios.patch(
        `/settlements/${id}/check`
    );
    return data;
};


export const importSettlement = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axios.post(
        "/settlements/import",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return data;
};

export const exportSettlement = async (params) => {
    const response = await axios.get(
        "/settlements/export",
        {
            params,
            responseType: "blob",
        }
    );

    return response.data;
};

export const downloadSettlement = async (params) => {
    const response = await axios.get(
        "/settlements/export",
        {
            params,
            responseType: "blob",
        }
    );

    const url = window.URL.createObjectURL(
        new Blob([response.data])
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "settlement_export.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
};
