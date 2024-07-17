<template>
  <div class="tween" ref="canvasBox">
    <canvas
      class="webgl"
      ref="webglDom"
      :width="canvasWidth"
      :height="canvasHeight"
      @mousemove="mouseMove"
    ></canvas>
    <div class="tooltip" ref="toolTip">显示我</div>
  </div>
</template>
<script>
export default {
  name: "UseTween",
  data: {},
};
</script>
