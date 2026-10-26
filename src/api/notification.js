import api from './axios';

export const getReminderLogs = async () => {
  const response = await api.get('/reminders/overdue-list');
  return response.data;
};

export const getGenerateMailto = async (employeeName) => {
  const response = await api.get('/reminders/generate-mailto', {
    params: { employee_name: employeeName },
  });
  return response.data;
};

export const markReminderSent = async (employeeName) => {
  const response = await api.post('/reminders/mark-sent', null, {
    params: { employee_name: employeeName },
  });
  return response.data;
};

export const getGenerateEml = async (employeeName) => {
  const response = await api.get('/reminders/generate-eml', {
    params: { employee_name: employeeName },
    responseType: 'blob',
  });
  return response.data;
};

export const dismissReminder = async (advanceId) => {
  const response = await api.delete(`/reminders/dismiss/${advanceId}`);
  return response.data;
};