import request from "./httpClient";

export const getMyPatientOverview = () => request("/patient-overview/me");
