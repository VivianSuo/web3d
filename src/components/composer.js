jQuery(document).ready(function (jQuery) {
  drawDemo();
});

function drawDemo() {
  //使用es5规范下，声明变量需要用THREE.，因为没有对这些类进行模块化引入，es6可忽略
  //声明场景
  let scene = new THREE.Scene();
  //声明相机
  let width = window.innerWidth; //窗口宽度
  let height = window.innerHeight; //窗口高度
  let k = width / height; //窗口宽高比
  //创建相机对象（透视相机）
  let camera = new THREE.PerspectiveCamera(90, k, 0.1, 1000, 1);
  //相机位置
  camera.position.set(-200, 200, 200); //设置相机位置
  //相机方向（想象成一条射线，相机位置为起点，lookAt的点位为射线经过的位置，此时射线方向就是相机方向）
  camera.lookAt(scene.position); //设置相机方向(一般都是指向的场景对象（中心）)

  //声明光源
  let light = new THREE.DirectionalLight(new THREE.Color(0xffffff)); //平行光，模拟太阳光
  light.position.set(-200, 200, 200); //光源位置
  light.castShadow = true; //光源是否产生阴影（产生阴影需要将光源、物体、被投射物体（接收阴影的物体）、产生阴影区域、相机、渲染器很多地方全部进行设置，非常蛋疼）
  light.intensity = 1; //光照强度
  //声明渲染器
  let renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight); //渲染范围

  //绑定渲染器与页面的元素，改成自己页面的元素
  document.getElementById("demo").appendChild(renderer.domElement);

  //将元素都添加进场景中
  scene.add(camera);
  scene.add(light);

  let ambientLight = new THREE.AmbientLight(0xffffff);
  ambientLight.intensity = 1;
  scene.add(ambientLight);

  //声明一个演示的几何体（几何体包括两部分，网格模型和材质）
  let geometry = new THREE.BoxGeometry(100, 100, 100); //声明网格模型
  let material = new THREE.MeshLambertMaterial({
    color: "#00BFFF", //颜色
    transparent: true, //是否开启透明
    opacity: 0.75, //透明度
  }); //声明材质

  let cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 0, 0);
  //给几何体设置名称，方便用于监听，非常重要！！！！！，若是模型来自于从模型文件，name是建模时设置的几何体名称
  cube.name = "cube_demo";
  //添加进场景
  scene.add(cube);

  //声明一个轨道控制器
  let orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  //将鼠标事件与控制器绑定
  orbitControls.addEventListener("change", function () {
    renderer.render(scene, camera);
  });

  //渲染
  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.render(scene, camera);

  //示例代码！！！！！！！！！！！

  //给几何体添加事件监听，监听的具体原理见第三章
  let intersects = []; //几何体合集
  let geometrys = [cube]; //需要监听的几何体对象的合集（实际开发中，很多几何体不需要监听，例如地面元素、天空元素、场景中的地面、栅栏等等）
  const pointer = new THREE.Vector2();
  document.addEventListener("pointermove", onPointerMove);
  let raycaster = new THREE.Raycaster();
  let outLineAnimationFrameID = null;
  function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    //geometrys为需要监听的Mesh合集
    //true为不拾取子对象
    intersects = raycaster.intersectObjects(geometrys, true);
    //被射线穿过的几何体为一个集合，越排在前面说明其位置离端点越近，所以直接取[0]就是被监听到的几何体
    if (intersects.length > 0) {
      //给监听到的几何体增加边框发光特效
      //alert(intersects[0].object.name);
      // 创建一个EffectComposer（效果组合器）对象，然后在该对象上添加后期处理通道。
      let composer = new THREE.EffectComposer(renderer);
      // 新建一个场景通道  为了覆盖到原理来的场景上
      let renderPass = new THREE.RenderPass(scene, camera);
      composer.addPass(renderPass);
      //创建物体边缘发光通道
      let outlinePass = new THREE.OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene,
        camera,
        [intersects[0].object]
      );
      //定义样式
      outlinePass.edgeStrength = 3; // 边框的亮度
      outlinePass.edgeGlow = 2; // 光晕
      outlinePass.usePatternTexture = false; // 是否使用父级的材质
      outlinePass.edgeThickness = 2; // 边框宽度
      outlinePass.downSampleRatio = 2; // 边框弯曲度
      outlinePass.pulsePeriod = 2; // 呼吸闪烁的速度
      outlinePass.visibleEdgeColor.set(parseInt("0xff0000")); // 呼吸显示的颜色
      outlinePass.hiddenEdgeColor = new THREE.Color(0, 0, 0); // 呼吸消失的颜色
      outlinePass.clear = true;

      composer.addPass(renderPass);
      composer.addPass(outlinePass);

      effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
      effectFXAA.uniforms.resolution.value.set(
        1 / window.innerWidth,
        1 / window.innerHeight
      );
      effectFXAA.renderToScreen = true;
      composer.addPass(effectFXAA);
      //更新代码挪动到整体动画中
      function render() {
        //一定注意这个地方，每次监听到都会给几何体添加动画，这个动画在js里会一直运行，
        //若不处理动画会越来越卡，所以当动画的ID存在时，先把上一个动画取消
        if (outLineAnimationFrameID) {
          window.cancelAnimationFrame(outLineAnimationFrameID);
        }
        if (composer) {
          composer.render();
        }
        outLineAnimationFrameID = requestAnimationFrame(render);
      }
      render();
    } else {
      //若没有几何体被监听到，可以做一些取消操作
    }
  }
}
