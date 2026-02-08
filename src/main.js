import * as THREE from 'three';

// defaults for threejs
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const canvas = document.querySelector("#main");
const renderer = new THREE.WebGLRenderer({canvas}, {antialias: true});

camera.position.z = 3;

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
const coverShape = roundedRectShape(2, 3, 0.1);
const pageShape = roundedRectShape(1.9, 2.8, 0);

// cover pivot
const coverPivot = new THREE.Group();
scene.add(coverPivot);

const backPivot = new THREE.Group();
scene.add(backPivot);

const frontCover = addShapeToScene(coverShape, 0.15, false, 12,"/images/leather.jpg");
frontCover.position.set(-1, 0, -0.1);

const backCover = addShapeToScene(coverShape, 0.15, false, 12,"/images/leather.jpg");
backCover.position.set(1, 0, -0.1);

coverPivot.add(frontCover);
coverPivot.rotation.y = Math.PI; // closed

backPivot.add(backCover);
backPivot.rotation.y = 0; // open

// pages
const pages = [];
const pageCount = 10;

for (let i = 0; i < pageCount; i++) {
  const pagePivot = new THREE.Group();

  const page = addShapeToScene(pageShape, 0.02, false, 12, "/images/paper2.jpg");

  // move page away from pivot so it flips from spine
  page.position.set(-0.95, 0, -0.001 );

  pagePivot.add(page);
  pagePivot.rotation.y = Math.PI; // closed

  scene.add(pagePivot);
  pages.push(pagePivot);
}

// background
const backgroundTexture = new THREE.TextureLoader().load('/images/sky.jpg');
scene.background = backgroundTexture;

// flipping logic
let flipping = false;
let coverFlipped = false;
let currentPage = 0;

window.addEventListener("click", () => {
  if (flipping) return;

  // first click opens cover
  if (!coverFlipped) {
    flipping = "frontCover";
    return;
  }

  // next clicks flip pages
  if (currentPage < pages.length) {
    flipping = "page";
  }

   // next clicks closes back cover
  if (currentPage === pages.length) {
    flipping = "backCover";
  }
});

// update animation each frame
function animateRenderer() {
  requestAnimationFrame(animateRenderer);

  const speed = 0.04;

  // flip cover
  if (flipping === "frontCover") {
    coverPivot.rotation.y +=
      (0 - coverPivot.rotation.y) * speed;

    if (Math.abs(coverPivot.rotation.y) < 0.01) {
      coverPivot.rotation.y = 0;
      coverFlipped = true;
      flipping = false;
    }
  }

  // flip single page
  if (flipping === "page") {
    const page = pages[currentPage];

    page.rotation.y +=
      (0 - page.rotation.y) * speed;

    if (Math.abs(page.rotation.y) < 0.01) {
      page.rotation.y = 0;
      currentPage++;
      flipping = false;
    }
  }

  // flip cover
  if (flipping === "backCover") {
    const targetRotation = -Math.PI;
    backPivot.rotation.y += (targetRotation - backPivot.rotation.y) * speed;
    if (Math.abs(backPivot.rotation.y - targetRotation) < 0.01) {
      backPivot.rotation.y = targetRotation;
      flipping = false;
    }
  }

  renderer.render(scene, camera);
}

animateRenderer();
