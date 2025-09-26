<template>
  <footer class="app-footer">
    <div class="footer-content">
      <p>
        (c) NGU Team, MPAM Laboratory. 本项目为 NGU Digest 视频企划中使用的内容，<a href="https://github.com/mpamlab/NGU-Digest-GuessWiki" target="_blank">点此访问[GitHub Repo]</a>
      </p>
      <p>
        本项目灵感来源：<a href="https://xiaoce.fun/baike/" target="_blank">https://xiaoce.fun/baike/</a>，本企划灵感来源：<a href="https://www.youtube.com/watch?v=JXl7-xxhGso" target="_blank">https://www.youtube.com/watch?v=JXl7-xxhGso</a>
      </p>
      <p>
        更多内容请参考本企划 <a href="https://github.com/MPAMlab/NGU-Digest-Documentation" target="_blank">[GitHub文档]</a>
      </p>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Footer'
})
</script>

<style scoped>
.app-footer {
  margin-top: auto;
  padding: 20px;
  background-color: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

.footer-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.footer-content p {
  margin: 8px 0;
}

.footer-content a {
  color: #409eff;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-content a:hover {
  color: #66b1ff;
  text-decoration: underline;
}
</style>