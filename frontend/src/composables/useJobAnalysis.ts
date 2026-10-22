import { computed, ref } from 'vue';
import { analyzeJobAdvertisement, analyzeJobAdvertisementUrl } from '@/api/job-analysis';
import { ApiError } from '@/api/client';
import type { JobAdvertisementAnalysis } from '@/schemas/job-analysis';

export function useJobAnalysis() {
    const inputText = ref('');
    const inputUrl = ref('');
    const analysis = ref<JobAdvertisementAnalysis | null>(null);
    const analyzing = ref(false);
    const error = ref<string | null>(null);
    const validationErrors = ref<string[]>([]);

    function invalidate(): void {
        analysis.value = null;
        error.value = null;
        validationErrors.value = [];
    }

    // Only user edits invalidate an analysis. Clearing inputs after a successful
    // request must not discard the returned originalText and sourceUrl.
    const advertisement = computed({
        get: () => inputText.value,
        set: (value: string) => {
            inputText.value = value;
            invalidate();
        },
    });
    const url = computed({
        get: () => inputUrl.value,
        set: (value: string) => {
            inputUrl.value = value;
            invalidate();
        },
    });

    const canAnalyze = computed(() =>
        advertisement.value.trim().length >= 50 &&
        advertisement.value.trim().length <= 30_000 &&
        !analyzing.value
    );
    const canAnalyzeUrl = computed(() => {
        try {
            const parsed = new URL(url.value.trim());
            return ['http:', 'https:'].includes(parsed.protocol) &&
                url.value.length <= 2048 && !analyzing.value;
        } catch {
            return false;
        }
    });

    async function execute(request: () => Promise<JobAdvertisementAnalysis>): Promise<void> {
        analyzing.value = true;
        invalidate();
        try {
            const result = await request();
            analysis.value = result;
            inputText.value = '';
            inputUrl.value = '';
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

    async function analyze(): Promise<void> {
        if (!canAnalyze.value) return;
        const sourceUrl = canAnalyzeUrl.value ? url.value.trim() : undefined;
        await execute(() => sourceUrl
            ? analyzeJobAdvertisement(advertisement.value.trim(), sourceUrl)
            : analyzeJobAdvertisement(advertisement.value.trim()));
    }

    async function analyzeUrl(): Promise<void> {
        if (!canAnalyzeUrl.value) return;
        await execute(() => analyzeJobAdvertisementUrl(url.value.trim()));
    }

    function discard(): void {
        inputText.value = '';
        inputUrl.value = '';
        invalidate();
    }

    return {
        advertisement,
        url,
        analysis,
        analyzing,
        error,
        validationErrors,
        canAnalyze,
        canAnalyzeUrl,
        analyze,
        analyzeUrl,
        discard,
    };
}
