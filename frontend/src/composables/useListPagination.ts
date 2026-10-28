import { computed, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listQuerySchema, type ListQuery } from '@/schemas/list-pagination';

export function useListPagination(defaultSort = 'name', defaultOrder: 'asc'|'desc' = 'asc') {
  const route = useRoute(); const router = useRouter();
  const searchInput = ref(''); let timer: ReturnType<typeof setTimeout> | undefined;

  const query = computed<ListQuery>(() => {
    const raw = { search: route.query.search ?? '', sortBy: route.query.sortBy ?? defaultSort,
      sortOrder: route.query.sortOrder ?? defaultOrder, page: route.query.page ?? 1,
      pageSize: route.query.pageSize ?? 25 };
    const parsed = listQuerySchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    const safe: Record<string, unknown> = {...raw};
    for (const issue of parsed.error.issues) delete safe[String(issue.path[0])];
    return listQuerySchema.parse({...safe, sortBy: safe.sortBy ?? defaultSort, sortOrder: safe.sortOrder ?? defaultOrder});
  });

  function update(changes: Partial<ListQuery>, reset = true) {
    const next = {...query.value, ...changes, page: reset ? 1 : (changes.page ?? query.value.page)};
    void router.replace({query: { ...route.query, ...next, page: String(next.page), pageSize: String(next.pageSize) }});
  }

  function search(value: string) {
    searchInput.value = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {if (value.trim() !== query.value.search) update({search: value.trim()});}, 300);
  }

  watch(() => query.value.search, value => {searchInput.value = value;}, {immediate: true});

  onUnmounted(() => {if (timer) clearTimeout(timer);});

  return {query, update, search, searchInput};
}
