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
  >
    {{ msg }}
  </div>
</template>
<script setup>
import * as THREE from "three";
import { onMounted, ref } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
const msg = ref("");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new OrbitControls(camera, renderer.domElement);
const loader = new FontLoader(); // 创建字体加载器
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
  addEachText();
}
// 为每个物体添加文字标注
function addEachText() {
  // 遍历场景中的所有物体
  scene.children.forEach((child) => {
    if (child.name.includes("方块")) {
      addText(child);
    }
  });
  console.log("添加文字", scene);
}
// 为指定物体添加文字标注
function addText(obj) {
  loader.load("./font/HONOR_Sans_CN_Regular.json", function (font) {
    const geometry = new TextGeometry(obj.name, {
      font: font,
      size: 0.3, // 字体大小
      height: 0.1, // 挤出文本的厚度
    });
    geometry.center(); // 居中文本
    const materials = new THREE.MeshBasicMaterial({
      color: 0xffffffff,
      transparent: true,
      opacity: 0.5,
    });
    const textMesh = new THREE.Mesh(geometry, materials);
    textMesh.position.copy(obj.position);
    textMesh.position.y = 1.2;
    scene.add(textMesh);
    // 可选：在渲染循环中保持文字面向摄像机
    function animate() {
      requestAnimationFrame(animate);
      textMesh.lookAt(camera.position);
    }
    animate();
  });
}
generateTextCanvas(texts: { str: string; position: THREE.Vector3 }[], color = '#fff') {
    // 设置canvas最大宽度为1000
    const maxWidth = 1000;
    let canvasWidth = 0;

    // 存储文字在canvas中的位置信息
    const positionItems: { start: number; lineNum: number; width: number;str:string }[] = [];
    // 记录当前绘制文字在的行数，从0开始
    let curLine = 0;
    // 记录当前绘制文字在当前行的起始位置
    let curStart = 0;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const lineHeight = 48;
    context.font = `${lineHeight / 2}px sans-serif`;

    for (let i = 0; i < texts.length; i += 1) {
        const measureText = context.measureText(texts[i].str);
        let { width } = measureText;
        width = Math.ceil(width);
        // 绘制的时候如果当前行绘制会超出，记得换行
        if (width + curStart < maxWidth) {
            positionItems.push({ start: curStart, lineNum: curLine, width,str: texts[i].str });
            canvasWidth = Math.max(canvasWidth, curStart + width,str: texts[i].str);
            curStart += width;
        } else {
            curLine += 1;
            positionItems.push({ start: 0, lineNum: curLine, width });
            curStart = width;
            canvasWidth = Math.max(canvasWidth, width);
        }
    }
    const canvasHeight = (curLine + 1) * lineHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    context.fillStyle = color;
    context.font = `${lineHeight / 2}px sans-serif`;
    // 注意这里要设置为middle，并且这里的设置决定 fillText时的y的位置
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    for (let i = 0; i < positionItems.length; i += 1) {
        const { start, lineNum } = positionItems[i];
        context.fillText(texts[i].str, start, lineNum * lineHeight + lineHeight / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return {
        texture,
        canvasWidth,
        canvasHeight,
        positionItems,
    };
}
positionItems.forEach((item, index) => {
    const itemTexture = texture.clone();
    itemTexture.offset.set(
        positionItems[index].start / canvasWidth,
        1 - (positionItems[index].lineNum + 1) / lineLength,
    );
    itemTexture.repeat.set(positionItems[index].width / canvasWidth, 1 / lineLength);
    const material = new THREE.SpriteMaterial({
        map: itemTexture,
        transparent: true,
        // 需要设置，不然文字会有黑色的背景，会遮挡场景中的对象
        depthTest: false,
    });
    const textMesh = new THREE.Sprite(material);
    // 具体缩放多少按实际显示效果去看，但是这里的缩放比例很重要
    textMesh.scale.set(positionItems[index].width / 24, canvasHeight / lineLength / 24, 1);
    textMesh.position.set(item.position.x, item.position.y, item.position.z);
    scene.add(textMesh);
});
</script>
