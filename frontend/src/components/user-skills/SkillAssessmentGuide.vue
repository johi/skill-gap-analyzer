<script setup lang="ts">
import {CircleHelp} from 'lucide-vue-next';
</script>
<template>
<div
        class="
                flex gap-3 rounded-lg border bg-muted/20
                px-4 py-3
            "
    >
      <CircleHelp
          class="
                    mt-0.5 size-4 shrink-0
                    text-muted-foreground
                "
      />

      <p
          class="
                    text-sm leading-relaxed
                    text-muted-foreground
                "
      >
        Use 0 for no practical experience and 5 for
        expert-level proficiency. Select
        <span class="font-medium text-foreground">
                    Not assessed
                </span>
        to remove an existing assessment.
      </p>
    </div>
</template>
