import { apiClient } from './client';

export interface MainCategory {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  id: number;
  mainCategoryId?: number | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const mainCategoriesApi = {
  list: () => apiClient.get<MainCategory[]>('/main-categories').then((res) => res.data),
  create: (name: string) =>
    apiClient.post<MainCategory>('/main-categories', { name }).then((res) => res.data),
  rename: (id: number, name: string) =>
    apiClient.patch<MainCategory>(`/main-categories/${id}`, { name }).then((res) => res.data),
  remove: (id: number, deleteSubItems: boolean) =>
    apiClient
      .delete(`/main-categories/${id}`, { params: { deleteSubItems } })
      .then((res) => res.data),
};

export const subCategoriesApi = {
  list: () => apiClient.get<SubCategory[]>('/sub-categories').then((res) => res.data),
  create: (name: string, mainCategoryId: number | null) =>
    apiClient.post<SubCategory>('/sub-categories', { name, mainCategoryId }).then((res) => res.data),
  update: (id: number, input: { name?: string; mainCategoryId?: number | null }) =>
    apiClient.patch<SubCategory>(`/sub-categories/${id}`, input).then((res) => res.data),
  remove: (id: number, deleteSubItems: boolean) =>
    apiClient
      .delete(`/sub-categories/${id}`, { params: { deleteSubItems } })
      .then((res) => res.data),
};
