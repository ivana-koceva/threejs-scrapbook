import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const canvas = document.querySelector("canvas.threejs");
const renderer = new THREE.WebGLRenderer({canvas});

camera.position.z = 5;

renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );


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

const shape = roundedRectShape(4, 3, 0.15);

const geometry = new THREE.ExtrudeGeometry(shape, {
  depth: 0.15,
  bevelEnabled: false,
  curveSegments: 12
});

geometry.center();


const leatherTexture = new THREE.TextureLoader().load('/images/leather.jpg');
leatherTexture.wrapS = leatherTexture.wrapT = THREE.RepeatWrapping;
leatherTexture.repeat.set(1, 1);


const material = new THREE.MeshStandardMaterial({
  map: leatherTexture,
});

const cover = new THREE.Mesh(geometry, material);
scene.add(cover);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const controls = new OrbitControls(camera, renderer.domElement);

const spaceTexture = new THREE.TextureLoader().load('/images/sky.jpg');
scene.background = spaceTexture;

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
