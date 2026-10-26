import api from "./axios";

// IMPORT SAP
export const uploadSAP = (
    file,
    source = "rungkut"
) => {

    const formData = new FormData();

    formData.append("file", file);

    return api.post(
        "/dashboard/import-sap",
        formData,
        {
            params:{
                source
            },
            headers: {
                "Content-Type":
                "multipart/form-data",
            },
        }
    );

};
