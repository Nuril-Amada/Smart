import api from "./axios";

// Helper
const buildParams = (
    source,
    startDate,
    endDate
) => {

    const params = {
        source,
    };

    if (startDate) {
        params.start_date = startDate;
    }

    if (endDate) {
        params.end_date = endDate;
    }

    return params;
};


// Dashboard Summary
export const getSummary = (
    source = "rungkut",
    startDate,
    endDate
) =>
    api.get(
        "/dashboard/summary",
        {
            params: buildParams(
                source,
                startDate,
                endDate
            ),
        }
    );


// GL Account
export const getGLAccount = (
    source = "rungkut",
    startDate,
    endDate
) =>
    api.get(
        "/dashboard/gl-account",
        {
            params: buildParams(
                source,
                startDate,
                endDate
            ),
        }
    );


// Cost Center
export const getCostCenters = (
    source = "rungkut",
    startDate,
    endDate
) => {

    return api.get(
        "/dashboard/cost-center",
        {
            params: buildParams(
                source,
                startDate,
                endDate
            ),
        }
    );

};


// Top Cost Center
export const getTopCostCenters = (
    source = "rungkut",
    startDate,
    endDate
) =>
    api.get(
        "/dashboard/top-cost-center",
        {
            params: buildParams(
                source,
                startDate,
                endDate
            ),
        }
    );


// Trend
export const getTrend = (
    source = "rungkut",
    groupBy = "month",
    startDate,
    endDate
) =>
    api.get(
        "/dashboard/trend",
        {
            params: {
                ...buildParams(
                    source,
                    startDate,
                    endDate
                ),
                group_by: groupBy,
            },
        }
    );


// Delete Transactions by Period
export const deleteTransactions = (
    source = "rungkut",
    startDate,
    endDate
) =>
    api.delete(
        "/dashboard/transactions",
        {
            params: buildParams(
                source,
                startDate,
                endDate
            ),
        }
    );