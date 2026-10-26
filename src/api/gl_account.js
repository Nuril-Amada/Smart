// src/api/gl_account.js
import api from "./axios";

// GET ALL GL ACCOUNT
export const getAllGLAccount = async (search = "") => {

    const response = await api.get(
        "/gl-account/",
        {
            params: {
                search
            }
        }
    );

    return response.data;

};

// CREATE GL ACCOUNT
export const createGLAccount = async (payload) => {

    const response = await api.post(
        "/gl-account/",
        payload
    );

    return response.data;
};

// DELETE GL ACCOUNT
export const deleteGLAccount = async (id) => {

    const response = await api.delete(
        `/gl-account/${id}`
    );

    return response.data;

};