import api from "./axios";

// SUMMARY CARD
export const getAdvanceSummary = async (params) => {
    const response = await api.get(
        "/advance/summary",
        { params }
    );

    return response.data;
};


// PPC TABLE
export const getAdvancePpc = async (params) => {
    const response = await api.get(
        "/advance/ppc",
        { params }
    );

    return response.data;
};


// CREATE PPC
export const createAdvanceRequest = async (data) => {
    const response = await api.post(
        "/advance/ppc",
        data
    );

    return response.data;
};


// CANCEL PPC
export const cancelAdvanceRequest = async (id) => {
    const response = await api.put(
        `/advance/ppc/${id}/cancel`
    );

    return response.data;
};


// DELETE PPC
export const deleteAdvanceRequest = async (id) => {
    const response = await api.delete(
        `/advance/ppc/${id}`
    );

    return response.data;
};


// UPDATE PPC
export const updateAdvanceRequest = async (id, data) => {
    const response = await api.put(
        `/advance/ppc/${id}`,
        data
    );

    return response.data;
};


// GENERATE PPC NUMBER
export const generatePPCNumber = async (
    request_date
) => {

    const response = await api.get(
        "/advance/generate-ppc-no",
        {
            params: {
                request_date,
            },
        }
    );

    return response.data;
};


// CREATE SETTLEMENT
export const submitSettlement = async (
    id,
    data
) => {

    const response = await api.post(
        `/advance/ppc/${id}/settlement`,
        data
    );

    return response.data;
};


// GET RECEIPT SETTLEMENT
export const getSettlementReceipt = async (
    id
) => {

    const response = await api.get(
        `/advance/ppc/${id}/receipt`
    );

    return response.data;
};
