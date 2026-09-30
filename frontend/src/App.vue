<script setup lang="ts">
import {
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  ListChecks,
} from 'lucide-vue-next';

import {
  RouterLink,
  RouterView,
  useRoute,
} from 'vue-router';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const route = useRoute();

const navigation = [
  {
    name: 'Jobs',
    route: 'jobs',
    icon: BriefcaseBusiness,
  },
  {
    name: 'Skills',
    route: 'skills',
    icon: ListChecks,
  },
  {
    name: 'My Skills',
    route: 'user-skills',
    icon: ChartNoAxesColumnIncreasing,
  },
];

function isActive(routeName: string): boolean {
  const currentRoute = String(route.name ?? '');

  if (routeName === 'jobs') {
    return currentRoute === 'jobs' ||
        currentRoute.startsWith('job-');
  }

  return currentRoute === routeName;
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="flex min-h-screen">
      <aside
          class="
                    hidden w-64 shrink-0 border-r bg-muted/20
                    md:flex md:flex-col
                "
      >
        <div class="px-6 py-6">
          <div class="flex items-center gap-3">
            <div
                class="
                                flex size-9 items-center justify-center
                                rounded-lg bg-primary text-primary-foreground
                            "
            >
              <ChartNoAxesColumnIncreasing
                  class="size-5"
              />
            </div>

            <div>
              <div class="font-semibold leading-none">
                Skill Gap
              </div>

              <div
                  class="
                                    mt-1 text-xs
                                    text-muted-foreground
                                "
              >
                Analyzer
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <nav class="flex flex-col gap-1 p-3">
          <Button
              v-for="item in navigation"
              :key="item.route"
              :variant="
                            isActive(item.route)
                                ? 'secondary'
                                : 'ghost'
                        "
              class="justify-start"
              as-child
          >
            <RouterLink
                :to="{ name: item.route }"
            >
              <component
                  :is="item.icon"
                  class="size-4"
              />

              {{ item.name }}
            </RouterLink>
          </Button>
        </nav>

        <div class="mt-auto p-4">
          <Separator class="mb-4" />

          <p
              class="
                            text-xs leading-relaxed
                            text-muted-foreground
                        "
          >
            Analyze job requirements and identify
            the skills worth developing next.
          </p>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header
            class="
                        flex h-16 items-center border-b px-4
                        md:hidden
                    "
        >
          <div class="flex items-center gap-2 font-semibold">
            <ChartNoAxesColumnIncreasing
                class="size-5"
            />

            Skill Gap Analyzer
          </div>
        </header>

        <nav
            class="
                        flex gap-1 overflow-x-auto border-b p-2
                        md:hidden
                    "
        >
          <Button
              v-for="item in navigation"
              :key="item.route"
              :variant="
                            isActive(item.route)
                                ? 'secondary'
                                : 'ghost'
                        "
              size="sm"
              as-child
          >
            <RouterLink
                :to="{ name: item.route }"
            >
              <component
                  :is="item.icon"
                  class="size-4"
              />

              {{ item.name }}
            </RouterLink>
          </Button>
        </nav>

        <main class="flex-1">
          <div
              class="
                            mx-auto w-full max-w-7xl
                            px-4 py-6 sm:px-6 lg:px-8 lg:py-8
                        "
          >
            <RouterView />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>