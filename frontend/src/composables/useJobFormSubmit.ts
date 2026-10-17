import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import type { CreateJobInput, JobWithSkills } from '@/types/job';

export function useJobFormSubmit(
  save: (input: CreateJobInput) => Promise<JobWithSkills>,
  fallbackMessage: string,
) {
  const router = useRouter();
  const submitting = ref(false);
  const error = ref<string | null>(null);
  const validationErrors = ref<string[]>([]);

  async function handleSubmit(input: CreateJobInput): Promise<void> {
    if (submitting.value) return;
    submitting.value = true;
    error.value = null;
    validationErrors.value = [];

    try {
      const job = await save(input);
      await router.push({ name: 'job-detail', params: { id: job.id } });
    } catch (err) {
      if (err instanceof ApiError && err.error === 'validation_error') {
        validationErrors.value = err.issues.map((issue) =>
          issue.path ? `${issue.path}: ${issue.message}` : issue.message
        );
      } else {
        error.value = err instanceof Error ? err.message : fallbackMessage;
      }
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, error, validationErrors, handleSubmit };
}
