import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { deleteJob, getJob } from '@/api/jobs';
import { ApiError } from '@/api/client';
import type { JobWithSkills } from '@/types/job';

export function useJobDetail() {
  const route = useRoute();
  const router = useRouter();
  const deleting = ref(false);
  const job = ref<JobWithSkills | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  onMounted(async () => {
    const id = Number(route.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      error.value = 'Invalid job ID';
      loading.value = false;
      return;
    }

    try {
      job.value = await getJob(id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        error.value = 'Job not found';
      } else {
        error.value = err instanceof Error ? err.message : 'Unable to load job';
      }
    } finally {
      loading.value = false;
    }
  });

  async function removeJob(): Promise<void> {
    if (!job.value) return;
    deleting.value = true;
    error.value = null;
    try {
      await deleteJob(job.value.id);
      await router.push({ name: 'jobs' });
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to delete job';
    } finally {
      deleting.value = false;
    }
  }

  return { job, loading, error, deleting, removeJob };
}
