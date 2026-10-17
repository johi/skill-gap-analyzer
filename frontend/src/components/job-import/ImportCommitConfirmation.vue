<script setup lang="ts">
import { Button } from '@/components/ui/button';
defineProps<{ includedCount: number; excludedCount: number; committing: boolean; readyToImport: boolean }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
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
