import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateTaskInput, UpdateTaskInput, tasksApi } from '../api/tasks';

export const tasksQueryKey = ['tasks'] as const;

export function useTasksQuery() {
  return useQuery({ queryKey: tasksQueryKey, queryFn: tasksApi.list });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) => tasksApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

export function useCompleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tasksApi.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

export function useRemoveTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}

export function useSetTaskActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => tasksApi.setActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey }),
  });
}
