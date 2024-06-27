<template>
  <div
    style="
      font-size: 24px;
      color: #ffffff;
      text-align: center;
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translate(-50%, -50%);
    "
  ></div>
</template>
<script setup>
import * as THREE from "three";
import { onMounted, ref } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
const msg = ref("");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
const controls = new OrbitControls(camera, renderer.domElement);
onMounted(() => {
  init();
});
function init() {
  camera.position.set(0, 0, 5);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material1 = new THREE.MeshBasicMaterial({
    color: 0xff00a2d7,
    transparent: true,
    opacity: 0.5,
  });
  const material2 = new THREE.MeshBasicMaterial({
    color: 0xffd3e3fd,
    transparent: true,
    opacity: 0.5,
  });
  const cube1 = new THREE.Mesh(geometry, material1);
  const cube2 = new THREE.Mesh(geometry, material2);
  scene.add(cube1, cube2);
  cube1.position.set(0, 0, 0);
  cube1.name = "方块1";
  cube2.position.set(2, 0, 0);
  cube2.name = "方块2";
  cube1.position.x = -2;
  controls.update();
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    cube1.rotation.y += 0.01;
    cube2.rotation.y -= 0.01;
    renderer.render(scene, camera);
  }
  animate();
  outlineanimate();
}
// 创建射线投射器
const raycaster = new THREE.Raycaster();
// 鼠标位置
const mouse = new THREE.Vector2();
// 记录上一个被点击的对象
let lastSelectedObject = null;
let outlineComposer = new EffectComposer(renderer); // 轮廓渲染器
//物体发光通道
let outlinePass = null;
let renderPass = new RenderPass(scene, camera);
// 新建一个场景通道  为了覆盖到原理来的场景上
outlineComposer.addPass(renderPass);
// 鼠标点击事件监听
window.addEventListener("click", mouseClick, false);
function mouseClick(event) {
  console.log("点击事件");
  // 将鼠标坐标归一化
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  // 设置射线起点为鼠标位置，射线的方向为相机视角方向
  raycaster.setFromCamera(mouse, camera);
  // 计算射线相交
  const intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    // 如果之前有选中的物体，将其颜色恢复为初始状态
    if (lastSelectedObject) {
      lastSelectedObject.material.color.set(lastSelectedObject.initialColor);
    }
    // 选中物体
    const selectedObject = intersects[0].object;
    msg.value = `${selectedObject.name}发光`;
    // 记录当前选中物体的状态
    selectedObject.initialColor = selectedObject.material.color.clone();
    lastSelectedObject = selectedObject;
    selectedObject.material.color.set(0xff62e258);
    outlineObj([selectedObject]);
  } else {
    // 如果没有新的物体被选中，恢复上一个选中物体的颜色（如果存在的话）
    if (lastSelectedObject) {
      lastSelectedObject.material.color.set(lastSelectedObject.initialColor);
      msg.value = "";
    }
    if (outlinePass) {
      outlineComposer.removePass(outlinePass);
      outlinePass = null;
    }
  }
}
// 绘制轮廓线
function outlineObj(selectedObjects) {
  if (outlinePass) {
    outlineComposer.removePass(outlinePass);
    outlinePass = null;
  }
  // 物体边缘发光通道
  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 5; // 边框的亮度
  outlinePass.edgeGlow = 1; // 光晕[0,1]
  outlinePass.edgeThickness = 5; // 边框宽度
  outlinePass.pulsePeriod = 3; // 呼吸闪烁的速度
  outlinePass.visibleEdgeColor.set(0xff4ecfff);
  outlinePass.hiddenEdgeColor.set(0x00ffff);
  outlinePass.selectedObjects = selectedObjects;
  outlineComposer.addPass(outlinePass);
  // 自定义的着色器通道 作为参数
}
// 渲染循环
function outlineanimate() {
  requestAnimationFrame(outlineanimate);
  outlineComposer.render();
}
</script>
