import { computed, ref } from 'vue';
import { analyzeJobAdvertisement } from '@/api/job-analysis';
import { ApiError } from '@/api/client';
import type { JobAdvertisementAnalysis } from '@/schemas/job-analysis';

export function useJobAnalysis() {
    const inputText = ref('');
    const analysis = ref<JobAdvertisementAnalysis | null>(null);
    const analyzing = ref(false);
    const error = ref<string | null>(null);
    const validationErrors = ref<string[]>([]);
    // Only user edits invalidate an analysis. Clearing the visible input after
    // success must not discard the original text returned with the proposal.
    const advertisement = computed({
        get: () => inputText.value,
        set: (value: string) => {
            inputText.value = value;
            analysis.value = null;
            error.value = null;
            validationErrors.value = [];
        },
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
            const result = await analyzeJobAdvertisement(advertisement.value.trim());
            analysis.value = result;
            // Clear only the input; result.originalText remains intact for UC-13.
            inputText.value = '';
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

    function discard(): void {
        inputText.value = '';
        analysis.value = null;
        error.value = null;
        validationErrors.value = [];
    }

    return {
        advertisement,
        analysis,
        analyzing,
        error,
        validationErrors,
        canAnalyze,
        analyze,
        discard,
    };
}
