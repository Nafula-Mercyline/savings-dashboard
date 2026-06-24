/**
 * lib/api/membersService.js
 * Member API calls for the SACCO savings dashboard.
 */

import api from "./client";

const MEMBERS_BASE_PATH = "/members";

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

export async function getMembers(params = {}) {
  const response = await api.get(
    `${MEMBERS_BASE_PATH}${buildQuery(params)}`
  );
  return response.data;
}

export async function getMembersDashboard(params = {}) {
  const response = await api.get(
    `${MEMBERS_BASE_PATH}/dashboard${buildQuery(params)}`
  );
  return response.data;
}

export async function getMemberById(memberId) {
  const response = await api.get(
    `${MEMBERS_BASE_PATH}/${encodeURIComponent(memberId)}`
  );
  return response.data;
}

export async function createMember(member) {
  const response = await api.post(
    MEMBERS_BASE_PATH,
    member
  );
  return response.data;
}

export async function updateMember(memberId, updates) {
  const response = await api.put(
    `${MEMBERS_BASE_PATH}/${encodeURIComponent(memberId)}`,
    updates
  );
  return response.data;
}

export async function deleteMember(memberId) {
  const response = await api.delete(
    `${MEMBERS_BASE_PATH}/${encodeURIComponent(memberId)}`
  );
  return response.data;
}

export async function exportMembers(params = {}) {
  const response = await api.get(
    `${MEMBERS_BASE_PATH}/export${buildQuery(params)}`,
    {
      responseType: "blob",
    }
  );

  const format = params.format || "csv";

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = `members_${format}.${format}`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
}

export default {
  getMembers,
  getMembersDashboard,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  exportMembers,
};