<script setup lang="ts">
import { Button } from '@/components/ui/button';
defineProps<{ includedCount: number; excludedCount: number; committing: boolean; readyToImport: boolean; replaceExisting: boolean }>();
const emit = defineEmits<{ confirm: []; cancel: []; 'update:replaceExisting': [value: boolean] }>();
</script>

<template>
            <div
                
                class="space-y-4 rounded-md border p-4"
            >
              <h3 class="font-semibold">
                Confirm import
              </h3>
              <p class="text-sm">
                You are about to import
                <strong>{{ includedCount }}</strong>
                jobs into the database and exclude
                <strong>{{ excludedCount }}</strong>
                jobs.
              </p>
              <p class="text-sm text-muted-foreground">
                This operation creates persistent job records.
                Review your selection before proceeding.
              </p>

              <label class="flex items-start gap-3 text-sm">
                <input
                    type="checkbox"
                    class="mt-1"
                    :checked="replaceExisting"
                    :disabled="committing"
                    @change="emit('update:replaceExisting', ($event.target as HTMLInputElement).checked)"
                />
                <span><strong>Replace existing job dataset</strong> — permanently delete all existing jobs and their job-specific skills and language requirements before importing. The skill catalogue and your personal assessments are preserved.</span>
              </label>
              <p v-if="replaceExisting" role="alert" class="text-sm font-semibold text-destructive">
                Warning: All existing jobs will be deleted. This cannot be undone after the import succeeds.
                If importing fails, the original jobs will be restored automatically.
              </p>
              <div class="flex flex-wrap gap-3">
                <Button
                    :disabled="committing || !readyToImport"
                    @click="emit('confirm')"
                >
                  {{
                    committing
                        ? 'Importing...'
                        : 'Confirm import'
                  }}
                </Button>
                <Button
                    variant="outline"
                    :disabled="committing"
                    @click="emit('cancel')"
                >
                  Cancel
                </Button>
              </div>
            </div>
</template>
