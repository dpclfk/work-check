import { apiClient } from './client';

export type TaskCycle = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Task {
  id: number;
  title: string;
  description?: string;
  cycleType: TaskCycle;
  cycleValue?: number;
  reminderTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  cycleType: TaskCycle;
  cycleValue?: number;
  reminderTime?: string;
}

export const tasksApi = {
  list: () => apiClient.get<Task[]>('/tasks').then((res) => res.data),
  create: (input: CreateTaskInput) =>
    apiClient.post<Task>('/tasks', input).then((res) => res.data),
  complete: (id: number) => apiClient.post(`/tasks/${id}/complete`).then((res) => res.data),
  remove: (id: number) => apiClient.delete(`/tasks/${id}`).then((res) => res.data),
};
