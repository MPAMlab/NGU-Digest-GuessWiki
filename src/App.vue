<template>
  <div id="app">
    <GameView />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import GameView from './views/GameView.vue'

export default defineComponent({
  name: 'App',
  components: {
    GameView
  }
})
</script>

<style>
#app {
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
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
</style>