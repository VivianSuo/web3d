<template>
  <div class="home">
    <div class="leftBox">
      <button
        @click="
          () => {
            show = !show;
          }
        "
      >
        显示
      </button>
      <select name="type" v-model="type" @change="changeType">
        <option v-for="item in modelType" :value="item" :key="item">
          {{ item }}
        </option>
      </select>
      <select name="nodeId" v-model="nodeId" @change="changeNode">
        <option v-for="item in nodeIds" :value="item" :key="item">
          {{ item }}
        </option>
      </select>
    </div>
    <div class="rightBox" ref="rightBox">
      <canvas-box
        v-show="show"
        @moveOnNode="moveOnNode"
        ref="canvasBox"
      ></canvas-box>
      <div
        v-show="showTool"
        class="toolBox"
        :style="{ left: `${toolLeft}px`, top: `${toolTop - 50}px` }"
        ref="toolBox"
      >
        去分析
      </div>
    </div>
  </div>
</template>
<script>
import CanvasBox from "./HelloWorld.vue";
export default {
  components: { CanvasBox },
  data() {
    return {
      show: true,
      modelType: ["all", "proGroup", "project", "subsystem", "ability"],
      type: "all",
      nodeIds: [
        "proGroup:7",
        "project:24",
        "project:27",
        "project:29",
        "subsystem:7",
        "subsystem:9",
        "ability:7",
        "ability:8",
      ],
      nodeId: "",
      showTool: false,
      toolLeft: 0,
      toolTop: 0,
    };
  },
  mounted() {
    let width = this.$refs.rightBox.clientWidth;
    let height = this.$refs.rightBox.clientHeight;
    this.$refs.canvasBox.initRenderer(width, height);
    console.log("mounted");
  },
  methods: {
    // 切换显示内容类型
    changeType() {
      this.$refs.canvasBox.changeCluster(this.type);
    },
    // 切换选中点
    changeNode() {
      this.$refs.canvasBox.highlightEvent(this.nodeId);
    },
    moveOnNode({ x, y, nodeId, isOnNode }) {
      if (isOnNode) {
        console.log("x", x);
        console.log("y", y);
        console.log("nodeId", nodeId);
        this.toolLeft = x;
        this.toolTop = y;
        this.showTool = true;
      } else {
        console.log("out");
        this.showTool = false;
      }
    },
  },
  beforeDestroy() {
    console.log("destroy");
    this.$refs.canvasBox.disposeScene();
  },
};
</script>
<style>
.home {
  width: 100%;
  height: 100%;
  background-color: #ccc;
  /* display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left; */
}
.leftBox {
  height: 100%;
  width: 200px;
  background-color: rosybrown;
}
.rightBox {
  height: 100%;
  width: calc(100% - 200px);
  background-color: red;
  position: absolute;
  left: 200px;
  top: 0;
}
/* .toolBox {
  width: 100px;
  height: 50px;
  border: 1px solid red;
  position: absolute;
  background: #ccc;
} */
</style>
