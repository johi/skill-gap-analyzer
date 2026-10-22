import { computed, ref, watch } from 'vue';
import { analyzeJobAdvertisement } from '@/api/job-analysis';
import { ApiError } from '@/api/client';
import type { JobAdvertisementAnalysis } from '@/schemas/job-analysis';

export function useJobAnalysis() {
    const advertisement = ref('');
    const analysis = ref<JobAdvertisementAnalysis | null>(null);
    const analyzing = ref(false);
    const error = ref<string | null>(null);
    const validationErrors = ref<string[]>([]);
    watch(advertisement, () => {
        // An edited advertisement invalidates the previous analysis.
        analysis.value = null;
        error.value = null;
        validationErrors.value = [];
    });

    const canAnalyze = computed(() =>
        advertisement.value.trim().length >= 50 &&
        advertisement.value.trim().length <= 30_000 &&
        !analyzing.value
    );

    async function analyze(): Promise<void> {
        if (!canAnalyze.value) return;
        analyzing.value = true;
        error.value = null;
        validationErrors.value = [];
        analysis.value = null;
        try {
            analysis.value = await analyzeJobAdvertisement(
                advertisement.value.trim()
            );
        } catch (caught) {
            if (caught instanceof ApiError) {
                error.value = caught.message;
                validationErrors.value = caught.issues.map(
                    issue => `${issue.path}: ${issue.message}`
                );
            } else {
                error.value = 'Unable to analyze this advertisement';
            }
        } finally {
            analyzing.value = false;
        }
    }

    return {
        advertisement,
        analysis,
        analyzing,
        error,
        validationErrors,
        canAnalyze,
        analyze,
    };
}
