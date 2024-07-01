<template>
  <div class="hello" ref="canvasBox">
    <canvas class="webgl" ref="webglDom" @mousemove="mouseMove"></canvas>
  </div>
</template>

<script>
// import result from "../mock/data";
// 记得及时dispose相应的对象来释放内存占用。
import * as THREE from "three";
import * as Stats from "stats.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module";
// import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
// import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OrbitControls } from "three-orbitcontrols-ts";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
// import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
const axiosPre = "http://172.16.20.33:8087";
let renderer,
  scene,
  camera,
  groupOfAllModels,
  foundationModel,
  controler,
  composer,
  outlinePass,
  effectFXAA,
  stats,
  gui,
  raycaster,
  animateId,
  selectedNode,
  currentModel,
  activeObjects,
  mouseDown;
let mouseX = 0;
let rotateStart = new THREE.Vector2();
export default {
  name: "HelloWorld",
  data() {
    return {
      // stats: null,
      // renderer: null,
      // scene: null,
      // camera: null,
      circleModel: null, // 圈
      ringModel: null, // 环
      bollsModel: [], // 球
      // foundationModel: null, // 基座
      defaultEleColor: 0x2a81ff,
      defaultCircleTube: 0.004,
      defaultCircleOpacity: 0.3,
      foundationModelStyle: {
        xRadius: 1,
        color: this.defaultEleColor,
        opacity: 0.3,
      },
      centerAxisStyle: {
        topRadius: 0.05,
        z: 1.5,
        floorRadius: 1,
        color: this.defaultEleColor,
        opacity: 0.2,
      },
      // controler: null,
      group: null,
      defaultBoll: [], // 嵌套球
      // groupOfAllModels: null,
      nodes: [
        {
          id: 1,
          color: "rgba(255,255,0,0.2)",
          name: "节点1",
          position: [0, 1, 0],
        },
        {
          id: 2,
          color: "rgba(255,0,0,0.2)",
          name: "节点2",
          position: [1, 0, 0],
        },
        {
          id: 3,
          color: "rgba(,255,0,0.2)",
          name: "节点3",
          position: [0, -1, 0],
        },
      ],
      nodesObj: {
        type: "",
      },
      colorTool: null,
      upgradeBollOuterModelList: [],
      // composer: null, // 后期处理器
      fontLoader: null,
      // raycaster: null, // 射线
      intersects: null, // 选中的物体列表
      mouse: [], // 鼠标坐标
      nodeDatas: new Map(),
      nodeType: [],
      nodeColors: new Map([
        // ["proGroup", "#ef8dff"],
        ["proGroup", "#9138B9"],
        ["project", "#23A89C"],
        ["subsystem", "#B6A12B"],
        ["ability", "#CB5238"],
      ]),
      edgeDatas: null,
      // gui: null,
      modelType: "all",
      showLine: "yes",
      guiParams: {},
      result: {},
      // outlinePass: null,
    };
  },
  created() {},
  async mounted() {
    try {
      this.result = await this.getTotalData();
      this.formatData();
      this.initStats();
      this.colorTool = new THREE.Color();
      this.createRaycaster();
      this.initRenderer();
      this.createGroupOfAllModel();

      this.effect();
      // this.createModel();
      // this.addControler();
      this.animate();
      // this.showAxesHelper();
      this.initGUI();
    } catch (err) {
      console.log(err);
    }

    // addListener();
  },
  methods: {
    initStats() {
      stats = new Stats();
      document.body.appendChild(stats.dom);
    },
    initGUI() {
      gui = new GUI();
      this.params = {
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        modelZ: groupOfAllModels.position.z,
        modelType: this.modelType,
        showLine: true,
        openEvent: false,
        reset: false,
      };
      gui.add(this.params, "fov", 0, 180).onChange((fov) => {
        camera.setFocalLength(fov);
      });
      gui.add(this.params, "x").onChange((x) => {
        camera.position.x = x;
      });
      gui.add(this.params, "y").onChange((y) => {
        camera.position.y = y;
      });
      gui.add(this.params, "z").onChange((z) => {
        camera.position.z = z;
      });
      gui.add(this.params, "modelZ").onChange((modelZ) => {
        groupOfAllModels.position.z = modelZ;
      });
      gui
        .add(this.params, "modelType", [
          "all",
          "proGroup",
          "project",
          "subsystem",
          "ability",
        ])
        .onChange((type) => {
          this.modelType = type;
          this.changeCluster(type);
        });
      gui.add(this.params, "showLine").onChange((showLine) => {
        if (showLine) {
          scene.traverseVisible((object) => {
            if (object.name.includes("line")) {
              object.material.visible = true;
            }
          });
        } else {
          scene.traverseVisible((object) => {
            if (object.name.includes("line")) {
              object.material.visible = false;
            }
          });
        }
      });
      gui.add(this.params, "openEvent").onChange((openEvent) => {
        if (openEvent) {
          this.$refs.webglDom.removeEventListener("click", this.mouseClick);
          this.$refs.webglDom.addEventListener("click", this.mouseClick);
        } else {
          this.$refs.webglDom.removeEventListener("click", this.mouseClick);
        }
      });
      gui.add(this.params, "reset").onChange((reset) => {
        if (reset) {
          this.resetToDefaultStyle();
        }
      });
      gui.open();
    },
    initRenderer() {
      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({
        canvas: this.$refs.webglDom,
        antialias: true,
        alpha: true,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      this.initCamera();
      this.initLight();
      window.addEventListener("resize", this.onWindowResize);
      renderer.domElement.addEventListener(
        "mousedown",
        this.mouseDownFunc,
        true
      );
      renderer.domElement.addEventListener("mouseup", this.mouseUpFunc, true);
      // document.body.appendChild(renderer.domElement);
    },
    initLight() {
      // const light = new THREE.AmbientLight(0xffffff);
      // const pointLight = new THREE.PointLight(0xffffff, 1, 10);
      // pointLight.position.set(50, 50, 50);
      // pointLight.castShadow = true;

      // light.position.set(10, 10, 10); //default; light shining from top
      // light.castShadow = true; // default false
      // scene.add(light);
      // scene.add(pointLight);
      // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      // directionalLight.castShadow = true;
      // scene.add(directionalLight);
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
      hemiLight.position.set(0, 2000, 0);
      // scene.add(hemiLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1);
      dirLight.position.set(10, 10, 10);
      scene.add(dirLight);
    },
    initCamera() {
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 0.27;
      camera.position.x = 2;
      camera.position.y = 2;
      camera.up.set(0, 0, 1);
      camera.lookAt(scene.position);
    },
    async getTotalData() {
      return new Promise((resolve, reject) => {
        this.$axios
          .get(axiosPre + "/api/relation/show")
          .then((res) => {
            let { code, message, data } = res.data;
            if (code == 200) {
              resolve(data);
            } else {
              reject(new Error(message));
            }
          })
          .catch((err) => {
            reject(err);
          });
      });
    },
    createGroupOfAllModel() {
      this.createTextFontLoader();
      groupOfAllModels = new THREE.Group();

      this.createGroup();
      this.createFoundationModel();
      this.createCenterAxis();
      currentModel = this.createUpgradeBollModel("#CB5238");
      groupOfAllModels.position.z = -0.8;
      scene.add(groupOfAllModels);
    },
    createTextFontLoader() {
      this.fontLoader = new THREE.FontLoader();
    },
    addText(obj, radius) {
      this.fontLoader.load("/static/fonts/ZH_CN.json", (font) => {
        const geometry = new THREE.TextGeometry(obj.userData.config.label, {
          font: font,
          size: 0.02, // 字体大小
          height: 0.0001, // 挤出文本的厚度
        });
        geometry.center(); // 居中文本
        const materials = new THREE.MeshBasicMaterial({
          color: 0xffffffff,
          transparent: true,
          // opacity: 0.5,
        });
        const textMesh = new THREE.Mesh(geometry, materials);
        textMesh.position.z = -radius * 2;
        // textMesh.rotation.x = Math.PI / 2;
        textMesh.name = "text";
        textMesh.rotation.x = Math.PI / 2;
        // textMesh.rotation.y = -Math.PI;
        // textMesh.rotation.z = Math.PI / 2;
        // textMesh.position.y = 1.2;

        // textMesh.lookAt(camera.position);
        obj.add(textMesh);
        // this.textAnimate();
      });
    },
    addTextbyCanvas(obj, position) {
      const label = obj.userData.config.label;
      const cluster = obj.userData.config.cluster;
      const textCanvas = document.createElement("canvas");
      const context = textCanvas.getContext("2d");
      const scale = 2;
      context.scale(scale, scale);
      const dimension = context.measureText(label);
      const canvasWidth = dimension.width * 1.8;
      // const canvasWidth =
      //   dimension.actualBoundingBoxRight + dimension.actualBoundingBoxLeft;
      const lineHeight = 36;
      const canvasHeight = lineHeight;

      textCanvas.width = canvasWidth;
      textCanvas.height = canvasHeight;
      context.font = `${lineHeight / 2}px 'sans-serif'`;
      context.fillStyle = "#ffffff";
      context.textBaseline = "middle";
      context.textAlign = "left";
      context.fillText(label, 0, lineHeight / 2);

      const texture = new THREE.CanvasTexture(textCanvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      const textMesh = new THREE.Sprite(material);

      let { x, y, z } = position;
      textMesh.position.set(x, y, z);
      textMesh.scale.set(
        canvasWidth / lineHeight / 18,
        canvasHeight / lineHeight / 18,
        0
      );
      textMesh.name = `text_${cluster}_${label}`;
      return textMesh;
    },
    textAnimate() {
      requestAnimationFrame(this.textAnimate);
      scene.traverseVisible((object) => {
        if (object.name === "text") {
          object.lookAt(camera.position);
        }
      });
    },
    formatData() {
      let { nodes, edges } = this.result;
      nodes.forEach((node) => {
        let { relationId } = node;
        let edgeLists = edges.filter((edge) => {
          return edge.edgeId.includes(relationId);
        });
        node.edgeLists = edgeLists;
        let { layer, cluster } = node;
        if (this.nodeDatas.has(layer)) {
          this.nodeDatas.get(layer).push(node);
        } else {
          this.nodeDatas.set(layer, [node]);
          this.nodeType.push({ layer, cluster });
        }
      });
      this.edgeDatas = edges;
    },
    async createGroup() {
      // layer 是由上到下由0开始逐渐递增。最上层是能力。
      const level = this.nodeType.length;
      const stepH = this.centerAxisStyle.z / level;

      // this.nodeDatas.forEach((value, key) => {
      for (let [key, value] of this.nodeDatas) {
        let type = value[0].cluster;
        let nodeColor = this.nodeColors.get(type);
        let z = this.centerAxisStyle.z - stepH * key;
        let model = new THREE.Group();
        model.name = `${type}_${key}`;
        let circleModel = null;
        let circleRadius = 0;
        let nodeRadius = 0.025;
        try {
          if (type === "proGroup") {
            // 项目群
            circleRadius = 0.8;
            circleModel = this.createCircleModel(circleRadius);
            this.combineModel(
              nodeColor,
              nodeRadius,
              circleModel,
              circleRadius,
              value,
              model,
              z,
              type
            );
          } else if (type === "project") {
            // 项目
            circleRadius = 1;
            const ringModel = await this.createRingModel(circleRadius);
            this.combineModel(
              nodeColor,
              nodeRadius,
              ringModel,
              circleRadius,
              value,
              model,
              z,
              type
            );
            // circleModel =
          } else if (type === "subsystem") {
            // 体系
            circleRadius = 0.5;
            circleModel = this.createCircleModel(circleRadius);
            this.combineModel(
              nodeColor,
              nodeRadius,
              circleModel,
              circleRadius,
              value,
              model,
              z,
              type
            );
          } else if (type === "ability") {
            // 能力
            const nodesLength = value.length;
            circleRadius = nodesLength < 4 ? 0.5 : nodesLength < 10 ? 0.8 : 1.2;
            circleModel = this.createCircleModel(circleRadius);
            this.combineModel(
              nodeColor,
              nodeRadius,
              circleModel,
              circleRadius,
              value,
              model,
              z,
              type
            );
          }
        } catch (error) {
          console.log(error);
        }
      }

      this.edgeDatas.forEach((edge) => {
        let { source, target } = edge;
        // let sourceName = `boll_${source}`;
        let sourceName = `group_${source}`;
        // let targetName = `boll_${target}`;
        let targetName = `group_${target}`;

        let sourceModel = groupOfAllModels.getObjectByName(sourceName);
        let targetModel = groupOfAllModels.getObjectByName(targetName);
        let groupOfSourceModel = sourceModel.parent;

        let groupOfTargetModel = targetModel.parent;
        let startPoint = new THREE.Vector3(
          sourceModel.position.x,
          sourceModel.position.y,
          groupOfSourceModel.position.z
        );
        let endPoint = new THREE.Vector3(
          targetModel.position.x,
          targetModel.position.y,
          groupOfTargetModel.position.z
        );
        console.log("startPoint", startPoint);
        console.log("endPoint", endPoint);
        // sourceModel.getWorldPosition(startPoint);
        // targetModel.getWorldPosition(endPoint);
        // startPoint = [sourceModel.position.x,sourceModel.y,groupOfSourceModel.z];
        // endPoint = targetModel.position;
        let lineModel = this.createLine(startPoint, endPoint, edge);
        groupOfAllModels.add(lineModel);
      });
    },
    combineModel(
      nodeColor,
      nodeRadius,
      circleModel,
      circleRadius,
      nodes,
      model,
      z,
      type
    ) {
      let nodesModel = [];
      let xyCoords = this.getCircleCoords(circleRadius, nodes.length);
      nodes.forEach((nodeObj, index) => {
        let nodeModelGroup = this.createNestBoll(
          nodeColor,
          nodeRadius,
          nodeObj
        );
        let { x, y } = xyCoords[index];
        nodeModelGroup.position.set(x, y, 0);
        nodesModel.push(nodeModelGroup);
      });

      model.add(circleModel);
      nodesModel.forEach((node) => {
        model.add(node);
      });
      model.position.set(0, 0, z);
      model.name = `${type}_group`;
      groupOfAllModels.add(model);
    },
    createModel() {
      this.createCircleModel();
      this.nodes.forEach((node) => {
        let bollModel = this.createBollsModel(node);
        this.bollsModel.push(bollModel);
      });
    },
    // 圈
    createCircleModel(radius) {
      const geometry = new THREE.TorusGeometry(
        radius,
        this.defaultCircleTube,
        16,
        100
      );
      const material = new THREE.MeshLambertMaterial({
        color: this.colorTool.set(this.defaultEleColor),
        emissive: this.colorTool.set(this.defaultEleColor),
        transparent: true,
        opacity: this.defaultCircleOpacity,
      });
      const circleModel = new THREE.Mesh(geometry, material);
      return circleModel;
      // scene.add(this.model);
    },
    //球
    createBollsModel(node) {
      let radius = 0.05;
      const group = new THREE.Group();
      const geometry = new THREE.SphereGeometry(radius, 32, 16);
      const material = new THREE.MeshPhongMaterial({
        color: node.color,
      });
      const sphere = new THREE.Mesh(geometry, material);
      let [x, y, z] = node.position;
      group.add(sphere);
      group.position.set(x, y, z);
      group.name = node.name;
      // this.addText(group, radius);
      return group;
    },
    // 环
    async createRingModel(radius) {
      const color = 0x2a81ff;
      const group = new THREE.Group();
      const circle = new THREE.TorusGeometry(
        radius,
        this.defaultCircleTube,
        16,
        100
      );
      const circleMaterial = new THREE.MeshLambertMaterial({
        color: this.colorTool.set(color),
        emissive: this.colorTool.set(color),
        transparent: true,
        opacity: this.defaultCircleOpacity,
      });
      const circleModel = new THREE.Mesh(circle, circleMaterial);

      // 环
      let ringRadius = radius + 0.03;

      const ring = new THREE.RingGeometry(
        radius - 0.05,
        ringRadius - 0.05,
        100
      );
      const textureLoader = new THREE.TextureLoader();
      THREE.TextureLoader.crossOrigin = "";
      return new Promise((resolve, reject) => {
        textureLoader.load(
          "/static/bigCircle.png",
          (texture) => {
            const ringMaterial = new THREE.MeshBasicMaterial({
              // color: "rgba(0, 255, 255, 0.1)",
              map: texture,
              side: THREE.DoubleSide,
              transparent: true,
              // opacity: 0.5,
            });

            const ringModel = new THREE.Mesh(ring, ringMaterial);
            group.add(circleModel);
            group.add(ringModel);
            // groupOfAllModels.add(group);
            // cb(group);
            resolve(group);
          },
          undefined,
          (error) => {
            reject(error);
          }
        );
      });
    },
    // 基座
    createFoundationModel() {
      let { xRadius, color, opacity } = this.foundationModelStyle;
      const curve = new THREE.EllipseCurve(
        0,
        0, // ax, aY
        xRadius,
        xRadius, // xRadius, yRadius
        0,
        Math.PI / 9, // aStartAngle, aEndAngle
        false, // aClockwise
        Math.PI / 2 // aRotation
      );
      let pointsArr = curve.getPoints(50);
      const geometry = new THREE.LatheGeometry(pointsArr, 100);
      // const geometry = new THREE.CircleGeometry(0.5, 100);
      const textureLoader = new THREE.TextureLoader();
      // const doorColorTexture = textureLoader.load("../assets/bigCircle.png");
      const doorColorTexture = textureLoader.load(
        "/static/foundation.png",
        (texture) => {
          // console.log("loader", texture);
          // console.log("doorColorTexture", doorColorTexture);
          // const uvs = [0, 1, 1, 1, 0, 0, 1, 0];
          // geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
          const material = new THREE.MeshLambertMaterial({
            // map: texture,
            // color: "0x1E457A",
            color: this.colorTool.set(color),
            emissive: this.colorTool.set(color),
            side: THREE.DoubleSide,
            transparent: true,
            opacity,
          });
          // texture.center.set(0, 0);
          foundationModel = new THREE.Mesh(geometry, material);

          foundationModel.rotation.x = -Math.PI / 2;
          foundationModel.position.set(0, 0, xRadius);
          foundationModel.name = "foundationModel";
          groupOfAllModels.add(foundationModel);
        },
        (e) => {
          // console.log("onprogress");
        },
        (err) => {
          console.log("error", err);
        }
      );
    },
    // 中轴
    createCenterAxis() {
      let { topRadius, z, floorRadius, color, opacity } = this.centerAxisStyle;
      const axisPoints = [
        new THREE.Vector2(topRadius, z),
        new THREE.Vector2(topRadius, 0.4),
        new THREE.Vector2(Math.sin(Math.PI / 10) * floorRadius, 0),
      ];

      const axisCuver = new THREE.QuadraticBezierCurve(...axisPoints);
      const axisPointsArr = axisCuver.getPoints(50);
      const geometry = new THREE.LatheGeometry(axisPointsArr, 50);
      const material = new THREE.MeshLambertMaterial({
        // map: texture,
        // color: "0x1E457A",
        color: this.colorTool.set(color),
        emissive: this.colorTool.set(color),
        // side: THREE.DoubleSide,
        transparent: true,
        opacity,
      });
      const centerAxis = new THREE.Mesh(geometry, material);
      centerAxis.rotation.x = Math.PI / 2;
      centerAxis.position.z = floorRadius - Math.cos(Math.PI / 9) * floorRadius;
      centerAxis.name = "centerAxis";
      groupOfAllModels.add(centerAxis);
    },
    // 默认球效果
    createNestBoll(color, radius, config) {
      const group = new THREE.Group();
      const geometry = new THREE.SphereGeometry(radius, 32, 16);
      const innerMaterial = new THREE.MeshPhongMaterial({
        emissive: new THREE.Color(color),
        color: new THREE.Color(color),
        transparent: true,
        opacity: 1,
        // emissiveIntensity: 0.5,
      });
      const innerSphere = new THREE.Mesh(geometry, innerMaterial);
      const scale = 1.3;
      const outerGeometry = geometry.clone(geometry).scale(scale, scale, scale);
      const outerMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0.2,
      });
      const outerSphere = new THREE.Mesh(outerGeometry, outerMaterial);
      // group.position.set(0, 1, 0);
      innerSphere.name = `inner_${config.relationId}`;
      outerSphere.name = `boll_${config.relationId}`;
      outerSphere.userData.config = config;
      group.add(innerSphere);
      group.add(outerSphere);
      group.userData.config = config;
      let textPosition = { x: 0, y: 0, z: -radius * 2 - 0.01 };
      const textMesh = this.addTextbyCanvas(group, textPosition);
      group.name = `group_${config.relationId}`;
      group.add(textMesh);
      this.defaultBoll.push(group);
      return group;
    },
    // 升级版球
    createUpgradeBollModel(color, radius) {
      let bollR = 0.04;
      // let color = new THREE.color(_color);
      const upgradeBollModel = new THREE.Group();
      // 中间球
      const bollGeometry = new THREE.SphereGeometry(bollR, 32, 16);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        transparent: true,
        opacity: 1,
        colorWrite: true,
      });
      const upgradeBoll = new THREE.Mesh(bollGeometry, material);
      // const outerGeometry = new THREE.SphereGeometry(bollR * 1.01, 32, 16);
      // const outerMaterial = new THREE.MeshBasicMaterial({
      //   opacity: 0,
      // });
      // const outerBoll = new THREE.Mesh(outerGeometry, outerMaterial);
      // 外侧环
      for (var i = 0; i < 4; i++) {
        let outerModel = this.createUpgradeBollOuter(
          `outerCircle${i + 1}`,
          color,
          bollR * 1.2,
          0.0015
        );
        this.upgradeBollOuterModelList.push(outerModel);
        outerModel.rotation.y = (i * Math.PI) / 9;
        upgradeBollModel.add(outerModel);
      }
      upgradeBollModel.add(upgradeBoll);
      // upgradeBollModel.add(outerBoll);
      upgradeBollModel.name = "upgradeBoll";
      upgradeBollModel.position.set(0.5, 0.5, 0.5);
      upgradeBollModel.visible = false;
      groupOfAllModels.add(upgradeBollModel);
      return upgradeBollModel;
    },
    // 升级球外侧带球的环
    createUpgradeBollOuter(name, color, radius, tube) {
      const outCircleModel = new THREE.Group();
      outCircleModel.name = name;
      const circleGeometry = new THREE.TorusGeometry(radius, tube, 16, 100);
      const circleMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        transparent: true,
        colorWrite: true,
        // opacity: 0.5,
      });
      let circleModle = new THREE.Mesh(circleGeometry, circleMaterial);
      let revolvingBollRadius = tube * 2.5;
      const revolvingBollGeometry = new THREE.SphereGeometry(
        revolvingBollRadius,
        32,
        16
      );
      const revolvingBollMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        transparent: true,
      });
      let revolvingBollModel = new THREE.Mesh(
        revolvingBollGeometry,
        revolvingBollMaterial
      );
      outCircleModel.add(circleModle);
      outCircleModel.add(revolvingBollModel);
      revolvingBollModel.position.set(radius, 0, 0);
      return outCircleModel;
    },
    createLine(startPoint, endPoint, config) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        startPoint,
        endPoint,
      ]);
      const material = new THREE.LineBasicMaterial({
        // color: 0x4d7fdf,
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
      });
      const line = new THREE.Line(lineGeometry, material);
      line.name = `line_${config.edgeId}`;
      line.userData.config = config;
      return line;
    },
    changeCluster(cluster) {
      // switch(cluster){
      //   case 'all':
      //   scene.traverse((object) => {
      //     object.visible = true;
      //   });
      //   currentModel.visible = false;
      //   break;
      //   case 'proGroup':
      //   groupOfAllModels.traverse(object=>{
      //     if(object.name.includes(cluster)){
      //       object.visible = true;
      //     }
      //   })
      // }
      this.resetToDefaultStyle();
      if (cluster === "all") {
        scene.traverse((object) => {
          object.visible = true;
        });
        currentModel.visible = false;
      } else {
        let selectedNodeGroups = [];
        groupOfAllModels.traverse((object) => {
          if (object.name.includes(`group_${cluster}`)) {
            selectedNodeGroups.push(object);
          }
        });
        groupOfAllModels.children.forEach((child) => {
          if (
            child.name === `${cluster}_group` ||
            child.name === "foundationModel" ||
            child.name === "centerAxis"
          ) {
            child.visible = true;
          } else {
            child.visible = false;
          }
        });
        groupOfAllModels.traverse((object) => {
          if (object.name.includes("line")) {
            object.visible = false;
          }
        });

        selectedNodeGroups.forEach((group) => {
          let edgeLists = group.userData.config.edgeLists;
          edgeLists.forEach((edgeData) => {
            let { source, target, edgeId } = edgeData;
            if (source.includes(cluster) && target.includes(cluster)) {
              let edgeModel = groupOfAllModels.getObjectByName(
                `line_${edgeData.edgeId}`
              );
              edgeModel.visible = true;
            }

            // selectedEdges.push(edge)
          });
        });
        // let selectedEdges =
      }
    },
    // 后期处理-高亮
    effect() {
      // debugger;
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      // const bloomPass = new BloomPass(
      //   new THREE.Vector2(window.innerWidth, window.innerHeight),
      //   1.5,
      //   0.4,
      //   0.85
      // );
      outlinePass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene,
        camera
      );
      outlinePass.edgeStrength = 1.5; // 边框的亮度
      outlinePass.edgeGlow = 1; // 光晕[0,1]
      outlinePass.usePatternTexture = false; // 是否使用父级的材质
      outlinePass.edgeThickness = 1; // 边框宽度
      outlinePass.pulsePeriod = 3; // 呼吸闪烁的速度
      outlinePass.visibleEdgeColor.set(0xff4ecfff);
      outlinePass.hiddenEdgeColor.set(0x00ffff);
      effectFXAA = new ShaderPass(FXAAShader);
      effectFXAA.uniforms["resolution"].value.set(
        1 / window.innerWidth,
        1 / window.innerHeight
      );
      composer.addPass(effectFXAA);
      // outlinePass.clear = true;
      // var ssaaRenderPass = new SSAARenderPass(scene, camera);
      // ssaaRenderPass.sampleLevel = 32;
      // ssaaRenderPass.unbiased = true;
      composer.addPass(renderPass);
      composer.addPass(outlinePass);
      // composer.addPass(ssaaRenderPass);
    },
    createRaycaster() {
      raycaster = new THREE.Raycaster();
    },
    getRelevanceModels(selectedNode) {
      let { cluster, id } = selectedNode.userData.config;
      return this.$axios
        .get(
          `${axiosPre}/api/relation/showHighlightLink?cluster=${cluster}&id=${id}`
        )
        .then((res) => {
          let { code, message, data } = res.data;
          if (code == 200) {
            return data;
          } else {
            return new Error(message);
          }
        });
    },
    mouseClick(event) {
      event.preventDefault();
      if (this.modelType != "all") {
        return;
      }

      activeObjects = { edgeIds: [], nodeIds: [] };
      if (!camera) {
        return;
      }
      console.log("点击事件");
      // 将鼠标坐标归一化
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      // 设置射线起点为鼠标位置，射线的方向为相机视角方向
      raycaster.setFromCamera(this.mouse, camera);
      // 计算射线相交
      const intersects = raycaster.intersectObjects(scene.children, true);
      let ifBoll = intersects.find((item) => {
        return item.object.name && item.object.name.includes("boll");
      });
      if (ifBoll) {
        selectedNode = ifBoll.object;
        let selectedNodeGroup = selectedNode.parent;
        let { x, y } = selectedNodeGroup.position;
        let selectedNodeOfTypeGroup = selectedNodeGroup.parent;
        let { z } = selectedNodeOfTypeGroup.position;
        currentModel.position.x = x;
        currentModel.position.y = y;
        currentModel.position.z = z;
        let currentModelColor = this.nodeColors.get(
          selectedNode.userData.config.cluster
        );
        currentModel.traverseVisible((child) => {
          if (child.type === "Mesh") {
            child.material.color.set(new THREE.Color(currentModelColor));
            child.material.emissive.set(new THREE.Color(currentModelColor));
          }
        });
        currentModel.visible = true;
        // currentModel.material.color.set(currentModelColor);
        groupOfAllModels.traverseVisible((object) => {
          if (object.name.includes("boll")) {
            object.material.opacity = 0.3;
            object.material.color.set(0x000);
          }
          if (object.name.includes("inner")) {
            object.material.opacity = 0.2;
          }
          if (object.name.includes("line")) {
            object.material.opacity = 0.2;
          }
        });
        this.getRelevanceModels(selectedNode).then((data) => {
          activeObjects = data;
          let { edgeIds, nodeIds } = activeObjects;
          edgeIds.forEach((edgeId) => {
            let activeEdge = groupOfAllModels.getObjectByName(`line_${edgeId}`);
            if (activeEdge) {
              activeEdge.material.opacity = 1;
              activeEdge.material.color.set("#38B7FF");
              activeEdge.material.lineWidth = 4;
            }
          });
          nodeIds.forEach((nodeId) => {
            let activeOuterBoll = groupOfAllModels.getObjectByName(
              `boll_${nodeId}`
            );
            if (activeOuterBoll) {
              activeOuterBoll.material.opacity = 0.1;
              activeOuterBoll.material.color.set(0xffffff);
              let innerObjectName = `inner_${nodeId}`;
              let innerObject =
                groupOfAllModels.getObjectByName(innerObjectName);
              innerObject.material.opacity = 1;
            }
          });
        });
      } else {
        // scene.traverseVisible((object) => {
        //   if (object.name.includes("boll")) {
        //     object.material.opacity = 0.2;
        //     object.material.color.set(0xffffff);
        //   }
        //   if (object.name.includes("inner")) {
        //     object.material.opacity = 1;
        //   }
        //   if (object.name.includes("line")) {
        //     object.material.opacity = 0.2;
        //   }
        // });
      }

      // selectedNode = null;
    },
    // getRelevanceModels(model, type) {
    //   if (!model || activeObjects.has(model)) {
    //     return;
    //   }
    //   let config = model.userData.config;
    //   let originalCluster = selectedNode.userData.config.cluster;
    //   let selectedNodeRelationId = selectedNode.userData.config.relationId;
    //   let selectedNodeLayer = selectedNode.userData.config.layer;
    //   if (type === "node") {
    //     let cluster = config.cluster;
    //     if (
    //       activeObjects.size &&
    //       cluster === originalCluster &&
    //       selectedNodeLayer === config.layer
    //     ) {
    //       return;
    //     }
    //     activeObjects.add(model);
    //     let edgeLists = config.edgeLists;
    //     if (cluster === "proGroup" && originalCluster != "proGroup") {
    //       return;
    //     }
    //     edgeLists.forEach((edge) => {
    //       let edgeName = `line_${edge.edgeId}`;
    //       let edgeModel = scene.getObjectByName(edgeName);
    //       this.getRelevanceModels(edgeModel, "edge");
    //     });
    //   } else if (type === "edge") {
    //     if (
    //       config.edgeId.includes(originalCluster) &&
    //       !config.edgeId.includes(selectedNodeRelationId)
    //     ) {
    //       return;
    //     }
    //     activeObjects.add(model);
    //     let { source, target } = config;
    //     let sourceName = `boll_${source}`;
    //     let targetName = `boll_${target}`;
    //     let sourceModel = groupOfAllModels.getObjectByName(sourceName);
    //     let targetModel = groupOfAllModels.getObjectByName(targetName);
    //     this.getRelevanceModels(sourceModel, "node");
    //     this.getRelevanceModels(targetModel, "node");
    //   }
    // },
    mouseMove(event) {
      // console.log("mouseMove");
      event.preventDefault();
      // composer.removePass(outlinePass);
      if (!camera) {
        return;
      }
      // console.log("进入事件");
      // 将鼠标坐标归一化
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      // 设置射线起点为鼠标位置，射线的方向为相机视角方向
      raycaster.setFromCamera(this.mouse, camera);
      // 计算射线相交
      const intersects = raycaster.intersectObjects(scene.children, true);
      let ifBoll = intersects.find((item) => {
        return item.object.name && item.object.name.includes("boll");
      });
      if (mouseDown) {
      } else {
        if (ifBoll) {
          let bollTextModel;
          // let label = ifBoll.object.userData.config.label;
          let { label, cluster } = ifBoll.object.userData.config;
          groupOfAllModels.traverseVisible((object) => {
            if (object.name === `text_${cluster}_${label}`) {
              const canvas = object.material.map.image;
              const context = canvas.getContext("2d");
              const lineHeight = 36;
              context.fillStyle = "#f4ecff";
              context.fillText(label, 0, lineHeight / 2);
              const texture = new THREE.CanvasTexture(canvas);
              object.material.map = texture;
              object.material.needsUpdate = true;
              // console.log("text", object);
              bollTextModel = object;
            }
          });
          // console.log(bollTextModel);
          composer.addPass(outlinePass);
          outlinePass.selectedObjects = [ifBoll.object];
          document.body.style.cursor = "pointer";
        } else {
          let lastSelectedObject = outlinePass.selectedObjects[0];
          if (lastSelectedObject) {
            let { label, cluster } = lastSelectedObject.userData.config;
            groupOfAllModels.traverseVisible((object) => {
              if (object.name === `text_${cluster}_${label}`) {
                const canvas = object.material.map.image;
                const context = canvas.getContext("2d");
                const lineHeight = 36;
                context.fillStyle = "#ffffff";
                context.fillText(label, 0, lineHeight / 2);
                const texture = new THREE.CanvasTexture(canvas);
                object.material.map = texture;
                object.material.needsUpdate = true;
                // console.log("text", object);
              }
            });
          }

          composer.removePass(outlinePass);
          // outlinePass.selectedObjects = [];
          // this.defaultBoll = [];
          document.body.style.cursor = "default";
        }
      }
    },
    mouseMove1(event) {
      event.preventDefault();
      if (mouseDown) {
        document.body.style.cursor = "move";
        let currentMouseX = event.clientX;
        let deltaX = currentMouseX - mouseX;
        mouseX = event.clientX;
        let deg = deltaX / 280;
        groupOfAllModels.rotation.z += deg;
      }
    },
    mouseDownFunc(event) {
      event.preventDefault();
      mouseDown = true;
      mouseX = event.clientX;
      rotateStart.set(event.clientX, event.clientY);
      renderer.domElement.addEventListener("mousemove", this.mouseMove1, false);
    },
    mouseUpFunc(event) {
      event.preventDefault();
      mouseDown = false;
      renderer.domElement.removeEventListener("mousemove", this.mouseMove1);
      document.body.style.cursor = "default";
    },
    animate() {
      if (animateId) {
        window.cancelAnimationFrame(animateId);
      }

      stats.update();
      if (this.group) {
        // this.group.rotation.z += 0.005;
        // this.model.rotation.y += 0.01;
      }
      this.upgradeBollOuterModelList.forEach((outerModel) => {
        if (outerModel && outerModel.visible) {
          outerModel.rotation.z += 0.005;
        }
      });

      // controler.update();
      // if (composer) {
      //   composer.render();
      // }

      renderer.render(scene, camera);
      animateId = requestAnimationFrame(this.animate);
    },
    showAxesHelper() {
      const axesHelper = new THREE.AxesHelper(1);
      scene.add(axesHelper);
    },
    addControler() {
      controler = new OrbitControls(camera, renderer.domElement);
      controler.update();
    },
    onWindowResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer && renderer.setSize(width, height);
      composer && composer.setSize(width, height);
      effectFXAA.uniforms["resolution"].value.set(1 / width, 1 / height);
    },
    resetToDefaultStyle() {
      scene.traverseVisible((object) => {
        if (object.name.includes("boll")) {
          object.material.opacity = 0.2;
          object.material.color.set(0xffffff);
        }
        if (object.name.includes("inner")) {
          object.material.opacity = 1;
        }
        if (object.name.includes("line")) {
          object.material.opacity = 0.2;
        }
        currentModel.visible = false;
      });
    },
    getCircleCoords(radius, segments) {
      var coords = [];
      var angle = 0;
      var increment = (2 * Math.PI) / segments; // 计算每个段所需的弧度增量

      for (var i = 0; i < segments; i++) {
        var x = radius * Math.cos(angle); // 使用弧长公式计算x坐标
        var y = radius * Math.sin(angle); // 使用弧长公式计算y坐标
        coords.push({ x: x, y: y }); // 将坐标对象推入数组
        angle += increment; // 累加弧度以计算下一个点
      }

      return coords;
    },
    disposeScene() {
      // 清除场景中的所有对象
      while (scene.children.length > 0) {
        var object = scene.children[0];
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
        if (object.texture) object.texture.dispose();
        scene.remove(object);
      }

      // 清除渲染器和相机
      renderer.dispose();
      renderer.domElement = null;
      camera = null;
      outlinePass = null;

      composer = null;
      THREE.Cache.clear();
      // 清除事件监听器和动画循环
      window.removeEventListener("resize", this.onWindowResize);

      gui.close();
      stats.end();

      if (animateId) {
        window.cancelAnimationFrame(animateId);
      }
    },
  },

  beforeDestroy() {
    // debugger;
    console.log("beforeDestroy");
    this.disposeScene();
  },
  // watch: {
  //   modelType: {
  //     handler: (type) => {
  //       console.log("curModelType", type);
  //       if (type === "all") {
  //       }
  //     },
  //   },
  // },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.hello {
  background: url("../assets/app-bg.png") center center;
  width: 100%;
  height: 100%;
}
.webgl {
  position: fixed;
  left: 0;
  top: 0;
  outline: none;
  background: transparent;
}
</style>
