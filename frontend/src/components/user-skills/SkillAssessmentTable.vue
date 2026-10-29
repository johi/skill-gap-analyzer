<script setup lang="ts">
import {nextTick} from 'vue';
import {ChartNoAxesColumnIncreasing, CircleHelp} from 'lucide-vue-next';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import type {SkillRow} from '@/composables/useUserSkills';

const emit = defineEmits<{sort: [key: 'name' | 'category' | 'level']}>();

const props = defineProps<{
  rows: SkillRow[];
  sortKey: string;
  sortDescending: boolean;
  loading: boolean;
  savingSkillId: number | null;
  setLevel: (row: SkillRow, value: string) => Promise<void>;
}>();

async function onLevelChange(row: SkillRow, event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const requestedValue = select.value;

  // Wait until the save has either succeeded or failed. The composable
  // catches API errors and leaves the persisted assessment unchanged.
  try {
    await props.setLevel(row, requestedValue);
  } finally {
    // Allow Vue to propagate the latest persisted rows before reading them.
    await nextTick();
    const persistedLevel = props.rows.find(item => item.id === row.id)?.level ?? null;
    select.value = persistedLevel === null ? '' : String(persistedLevel);
  }
}
</script>
<template>
    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div
              class="
                            flex size-9 items-center justify-center
                            rounded-lg bg-muted
                        "
          >
            <ChartNoAxesColumnIncreasing
                class="size-4"
            />
          </div>

          <div>
            <CardTitle>
              Skill assessment
            </CardTitle>

            <CardDescription>
              Rate each skill from 0 to 5 based on
              your current proficiency.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
            v-if="loading"
            class="space-y-3"
        >
          <Skeleton class="h-12 w-full"/>
          <Skeleton class="h-12 w-full"/>
          <Skeleton class="h-12 w-full"/>
          <Skeleton class="h-12 w-full"/>
        </div>

        <div
            v-else-if="rows.length === 0"
            class="
                        flex flex-col items-center justify-center
                        py-12 text-center
                    "
        >
          <div
              class="
                            mb-4 flex size-12 items-center
                            justify-center rounded-full bg-muted
                        "
          >
            <CircleHelp
                class="
                                size-5 text-muted-foreground
                            "
            />
          </div>

          <h2 class="font-medium">
            No skills available
          </h2>

          <p
              class="
                            mt-1 max-w-sm text-sm
                            text-muted-foreground
                        "
          >
            Add skills to the catalogue before
            assessing your proficiency.
          </p>
        </div>

        <div
            v-else
            class="overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-for="column in [{key: 'name', label: 'Skill'}, {key: 'category', label: 'Category'}, {key: 'level', label: 'Proficiency'}] as const" :key="column.key" :class="column.key === 'level' ? 'w-56' : ''" :aria-sort="sortKey === column.key ? (sortDescending ? 'descending' : 'ascending') : 'none'">
                  <button type="button" class="hover:underline" @click="emit('sort', column.key)">{{ column.label }}{{ sortKey === column.key ? (sortDescending ? ' ↓' : ' ↑') : '' }}</button>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow
                  v-for="row in rows"
                  :key="row.id"
              >
                <TableCell class="font-medium">
                  {{ row.name }}
                </TableCell>

                <TableCell>
                  <Badge variant="secondary">
                    {{ row.category }}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div
                      class="
                                            flex items-center gap-3
                                        "
                  >
                    <select
                        :value="row.level ?? ''"
                        :disabled="
                                                savingSkillId ===
                                                row.id
                                            "
                        class="
                                                h-9 w-36
                                                rounded-md border
                                                border-input
                                                bg-background
                                                px-3 py-1
                                                text-sm shadow-xs
                                                outline-none
                                                transition-colors
                                                focus-visible:border-ring
                                                focus-visible:ring-[3px]
                                                focus-visible:ring-ring/50
                                                disabled:cursor-not-allowed
                                                disabled:opacity-50
                                            "
                        @change="
                                                onLevelChange(row, $event)
                                            "
                    >
                      <option value="">
                        Not assessed
                      </option>

                      <option
                          v-for="level in 6"
                          :key="level - 1"
                          :value="String(level - 1)"
                      >
                        {{ level - 1 }}
                      </option>
                    </select>

                    <span
                        v-if="
                                                savingSkillId ===
                                                row.id
                                            "
                        class="
                                                text-xs
                                                text-muted-foreground
                                            "
                    >
                                            Saving...
                                        </span>

                    <Badge
                        v-else-if="
                                                row.level !== null
                                            "
                        variant="outline"
                        class="tabular-nums"
                    >
                      {{ row.level }} / 5
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

</template>
