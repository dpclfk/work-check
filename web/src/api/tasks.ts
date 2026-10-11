import { apiClient } from './client';

export type TaskCycle = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONCE';

export interface Task {
  id: number;
  subCategoryId?: number;
  // GET /tasks에서만 join돼서 옴
  subCategory?: {
    id: number;
    name: string;
    mainCategoryId?: number | null;
    mainCategory?: { id: number; name: string };
  };
  name: string;
  cycleType: TaskCycle;
  cycleValue?: number;
  dueDate?: string;
  deadLine: number;
  remindTime: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  subCategoryId?: number;
  name: string;
  cycleType: TaskCycle;
  cycleValue?: number;
  dueDate?: string;
  deadLine: number;
  remindTime: number;
}

export interface UpdateTaskInput {
  // null을 명시적으로 보내면 "서브카테고리와 분리" (undefined/생략은 "안 건드림")
  subCategoryId?: number | null;
  name?: string;
  cycleType?: TaskCycle;
  cycleValue?: number;
  dueDate?: string;
  deadLine?: number;
  remindTime?: number;
}

export const tasksApi = {
  list: () => apiClient.get<Task[]>('/tasks').then((res) => res.data),
  create: (input: CreateTaskInput) =>
    apiClient.post<Task>('/tasks', input).then((res) => res.data),
  update: (id: number, input: UpdateTaskInput) =>
    apiClient.patch<Task>(`/tasks/${id}`, input).then((res) => res.data),
  complete: (id: number) => apiClient.post(`/tasks/${id}/complete`).then((res) => res.data),
  remove: (id: number) => apiClient.delete(`/tasks/${id}`).then((res) => res.data),
  setActive: (id: number, isActive: boolean) =>
    apiClient.patch<Task>(`/tasks/${id}`, { isActive }).then((res) => res.data),
};
