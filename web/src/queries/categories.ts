import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mainCategoriesApi, subCategoriesApi } from '../api/categories';
import { tasksQueryKey } from './tasks';

export const mainCategoriesQueryKey = ['mainCategories'] as const;
export const subCategoriesQueryKey = ['subCategories'] as const;

export function useMainCategoriesQuery() {
  return useQuery({ queryKey: mainCategoriesQueryKey, queryFn: mainCategoriesApi.list });
}

export function useSubCategoriesQuery() {
  return useQuery({ queryKey: subCategoriesQueryKey, queryFn: subCategoriesApi.list });
}

// GET /tasks가 subCategory/mainCategory를 join해서 내려주기 때문에, 카테고리
// 이름이 바뀌거나 지워지면 tasks 캐시도 같이 무효화해야 목록의 뱃지가 최신으로 보임
function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: mainCategoriesQueryKey });
    queryClient.invalidateQueries({ queryKey: subCategoriesQueryKey });
    queryClient.invalidateQueries({ queryKey: tasksQueryKey });
  };
}

export function useCreateMainCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (name: string) => mainCategoriesApi.create(name),
    onSuccess: invalidate,
  });
}

export function useRenameMainCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => mainCategoriesApi.rename(id, name),
    onSuccess: invalidate,
  });
}

export function useRemoveMainCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, deleteSubItems }: { id: number; deleteSubItems: boolean }) =>
      mainCategoriesApi.remove(id, deleteSubItems),
    onSuccess: invalidate,
  });
}

export function useCreateSubCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ name, mainCategoryId }: { name: string; mainCategoryId: number | null }) =>
      subCategoriesApi.create(name, mainCategoryId),
    onSuccess: invalidate,
  });
}

export function useUpdateSubCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: { name?: string; mainCategoryId?: number | null };
    }) => subCategoriesApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useRemoveSubCategoryMutation() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, deleteSubItems }: { id: number; deleteSubItems: boolean }) =>
      subCategoriesApi.remove(id, deleteSubItems),
    onSuccess: invalidate,
  });
}
