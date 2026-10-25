
import { ref, watch, type Ref } from 'vue';
import { getJobMatch } from '@/api/job-match';
import type { JobMatchResult } from '@/schemas/job-match';

export function useJobMatch(jobId: Ref<number>) {
    const result = ref<JobMatchResult | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);

    let requestVersion = 0;

    async function loadMatch(): Promise<void> {
        const version = ++requestVersion;

        loading.value = true;
        error.value = null;
        result.value = null;

        if (!Number.isInteger(jobId.value) || jobId.value <= 0) {
            error.value = 'Invalid job ID';
            loading.value = false;
            return;
        }

        try {
            const loaded = await getJobMatch(jobId.value);

            if (version !== requestVersion) return;

            result.value = loaded;
        } catch (err) {
            if (version !== requestVersion) return;

            error.value = err instanceof Error
                ? err.message
                : 'Unable to calculate job match';
        } finally {
            if (version === requestVersion) {
                loading.value = false;
            }
        }
    }

    watch(jobId, () => {
        void loadMatch();
    }, { immediate: true });

    return {
        result,
        loading,
        error,
        loadMatch,
    };
}
