<script setup lang="ts">
const { state, accept, cancel } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="state.open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="cancel" />

        <!-- Dialog -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="state.open" class="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 class="text-base font-semibold text-gray-900">{{ state.options.title }}</h3>
            <p v-if="state.options.message" class="text-sm text-gray-500 mt-1.5">{{ state.options.message }}</p>

            <div class="flex justify-end gap-2 mt-6">
              <button
                class="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                @click="cancel"
              >
                {{ state.options.cancelText ?? 'Cancel' }}
              </button>
              <button
                :class="[
                  'text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors',
                  state.options.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                ]"
                @click="accept"
              >
                {{ state.options.confirmText ?? 'Confirm' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
