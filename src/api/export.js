import api from "./axios";

// EXPORT DASHBOARD EXCEL
export const exportExcel = async (
    source = "rungkut",
    startDate = "",
    endDate = ""
) => {

    const response =
        await api.get(
            "/export/excel",
            {
                params: {
                    source,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                },
                responseType: "blob",
            }
        );
    return response.data;
};


// EXPORT DASHBOARD PDF
export const exportPDF = async (
    source = "rungkut",
    startDate = "",
    endDate = "",
    trendGroup = "month"
) => {

    const response =
        await api.get(
            "/export/pdf",
            {
                params: {
                    source,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                    trend_group: trendGroup,
                },
                responseType: "blob",
            }
        );
    return response.data;
};

// EXPORT SETTLEMENT EXCEL
export const exportSettlement = async (
    startDate = "",
    endDate = "",
    employeeName = "",
    costCenter = "",
    status = "",
    source = ""
) => {
    const response = await api.get(
        "/export/settlement",
        {
            params: {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                employee_name: employeeName || undefined,
                cost_center: costCenter || undefined,
                status: status || undefined,
                source: source || undefined,
            },
            responseType: "blob",
        }
    );

    return response.data;
};


// EXPORT ADVANCE EXCEL
export const exportAdvance = async (
    startDate = "",
    endDate = "",
    employeeName = "",
    costCenter = "",
    status = ""
) => {

    const response = await api.get(
        "/export/advance",
        {
            params: {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                employee_name: employeeName || undefined,
                cost_center: costCenter || undefined,
                status: status || undefined,
            },
            responseType: "blob",
        }
    );

    return response.data;
};


// EXPORT CHECK EXCEL
export const exportCheck = async (
    startDate = "",
    endDate = "",
    bankType = ""
) => {

    const response = await api.get(
        "/export/check",
        {
            params: {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                bank_type: bankType || undefined,
            },
            responseType: "blob",
        }
    );

    return response.data;
};


// EXPORT VENDOR EXCEL
export const exportVendor = async () => {
    const response = await api.get(
        "/export/vendor",
        {
            responseType: "blob",
        }
    );

    return response.data;
};
