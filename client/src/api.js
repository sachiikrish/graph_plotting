async function request(url, options) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const saveGraph = (graph) =>
  request("/api/graphs", { method: "POST", body: JSON.stringify(graph) });

export const getGraph = (id) => request(`/api/graphs/${encodeURIComponent(id)}`);

export const listStudentGraphs = (studentId) =>
  request(`/api/graphs/student/${encodeURIComponent(studentId)}`);
