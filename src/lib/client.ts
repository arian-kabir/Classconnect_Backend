// frontend/src/lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for cookies/sessions
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Specific API functions
export const notesApi = {
  getAll: (userId: number, sectionId: number) =>
    apiClient(`/api/notes?userId=${userId}&sectionId=${sectionId}`),

  create: (data: any) =>
    apiClient('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    apiClient(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number, userId: number) =>
    apiClient(`/api/notes/${id}?userId=${userId}`, {
      method: 'DELETE',
    }),
};
