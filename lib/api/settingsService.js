/**
 * lib/api/settingsService.js
 * Settings API calls for the SACCO savings dashboard.
 *
 * This service intentionally depends only on the shared API client. The client
 * owns base URL, authentication headers, interceptors, and common HTTP behavior,
 * while this module owns only settings-related endpoints.
 */

import api from "./client";

const SETTINGS_BASE_PATH = "/settings";
const DEFAULT_SETTINGS_GROUP = "all";

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function unwrapResponse(response) {
  return response.data;
}

function requireSettingKey(key) {
  if (!key || typeof key !== "string") {
    throw new Error("A valid setting key is required.");
  }
}

export async function getAllSettings(group = DEFAULT_SETTINGS_GROUP) {
  const response = await api.get(`${SETTINGS_BASE_PATH}${buildQuery({ group })}`);
  return unwrapResponse(response);
}

export async function getPublicSettings() {
  const response = await api.get(`${SETTINGS_BASE_PATH}/public`);
  return unwrapResponse(response);
}

export async function getFinancialSettings() {
  const response = await api.get(`${SETTINGS_BASE_PATH}/financial`);
  return unwrapResponse(response);
}

export async function getSavingsSettings() {
  const response = await api.get(`${SETTINGS_BASE_PATH}/savings`);
  return unwrapResponse(response);
}

export async function getLoanSettings() {
  const response = await api.get(`${SETTINGS_BASE_PATH}/loans`);
  return unwrapResponse(response);
}

export async function getMemberSettings() {
  const response = await api.get(`${SETTINGS_BASE_PATH}/members`);
  return unwrapResponse(response);
}

export async function updateSettings(updates) {
  const response = await api.put(SETTINGS_BASE_PATH, updates);
  return unwrapResponse(response);
}

export async function resetSetting(key) {
  requireSettingKey(key);

  const encodedKey = encodeURIComponent(key);
  const response = await api.put(`${SETTINGS_BASE_PATH}/${encodedKey}/reset`, {});
  return unwrapResponse(response);
}

export default {
  getAllSettings,
  getPublicSettings,
  getFinancialSettings,
  getSavingsSettings,
  getLoanSettings,
  getMemberSettings,
  updateSettings,
  resetSetting,
};
