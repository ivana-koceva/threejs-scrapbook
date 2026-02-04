import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// defaults for threejs
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const canvas = document.querySelector("#main");
const renderer = new THREE.WebGLRenderer({canvas});

camera.position.z = 5;

renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// draw rounded rectangle in 2d
function roundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();

  shape.moveTo(radius, 0);
  shape.lineTo(width - radius, 0);
  shape.quadraticCurveTo(width, 0, width, radius);
  shape.lineTo(width, height - radius);
  shape.quadraticCurveTo(width, height, width - radius, height);
  shape.lineTo(radius, height);
  shape.quadraticCurveTo(0, height, 0, height - radius);
  shape.lineTo(0, radius);
  shape.quadraticCurveTo(0, 0, radius, 0);

  return shape;
}

// add geometry to object
function createExtrudeGeometry(object, depth, bevel, curves) {
  return new THREE.ExtrudeGeometry(object, {
    depth: depth,
    bevelEnabled: bevel,
    curveSegments: curves
  }).center();
}

// add repeating texture to object
function createRepeatingTextureMesh(path) {
  const texture = new THREE.TextureLoader().load(path);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);

  return new THREE.MeshStandardMaterial({
  map: texture,
  });
}

// create object meshes and add them to scene
function addShapeToScene(shape, depth, bevel, curves, path) {
  const object = new THREE.Mesh(createExtrudeGeometry(shape, depth, bevel, curves), createRepeatingTextureMesh(path));
  scene.add(object);
  return object;
}

// add objects
const shape = roundedRectShape(4, 3, 0.15);
const shape2 = roundedRectShape(1.9, 2.8, 0);

addShapeToScene(shape, 0.15, false, 12,"/images/leather.jpg");
const pageOne = addShapeToScene(shape2, 0.05, false, 12,"/images/paper2.jpg");
pageOne.position.x = 0.9;
pageOne.position.z = 0.1;

const pageTwo = addShapeToScene(shape2, 0.05, false, 12,"/images/paper2.jpg");
pageTwo.position.x = -0.9;
pageTwo.position.z = 0.1;



const controls = new OrbitControls(camera, renderer.domElement);

const spaceTexture = new THREE.TextureLoader().load('/images/sky.jpg');
scene.background = spaceTexture;

// update animation each second
function animateRenderer() {
  requestAnimationFrame(animateRenderer);
  controls.update();
  renderer.render(scene, camera);
}

animateRenderer();
