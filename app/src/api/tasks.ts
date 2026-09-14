import { apiClient } from './client';

export type TaskCycle = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONCE';

export interface Task {
  id: number;
  subCategoryId?: number;
  name: string;
  cycle: TaskCycle;
  cycleValue?: number;
  dueDate?: string;
  deadLine: number;
  remindTime: number;
  createdAt: string;
  updatedAt: string;
}

export const tasksApi = {
  list: () => apiClient.get<Task[]>('/tasks').then((res) => res.data),
  complete: (id: number) => apiClient.post(`/tasks/${id}/complete`).then((res) => res.data),
};
