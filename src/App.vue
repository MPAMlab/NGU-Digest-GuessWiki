<template>
  <div id="app" :class="{ 'is-god-mode': isGodMode }">
    <div class="app-content">
      <router-view />
    </div>
    <Footer v-if="!isGodMode" />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useRoute } from 'vue-router'
import Footer from '@/components/Footer.vue'

export default defineComponent({
  name: 'App',
  components: {
    Footer
  },
  setup() {
    const route = useRoute()
    const isGodMode = computed(() => route.name === 'GodMode')

    return {
      isGodMode
    }
  }
})
</script>

<style>
#app {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f9fc;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

#app.is-god-mode .app-content {
  overflow: auto;
}
</style>