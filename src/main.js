import * as THREE from 'three';

// defaults for threejs
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const canvas = document.querySelector("#main");
const renderer = new THREE.WebGLRenderer({canvas}, {antialias: true});

const leftButton = document.querySelector("#left");
const rightButton = document.querySelector("#right");

camera.position.z = 3;

// get uploaded images
const imageForm = document.querySelector("#image-form");
const imageInput = document.querySelector("#image-input");

imageForm.addEventListener("submit", (e) => {
  e.preventDefault(); // stop page refresh

  const files = Array.from(imageInput.files);
  
  if (files.length === 0) {
    alert("Please select some photos first!");
    return;
  }

  const photosToProcess = files.slice(0, pageCount * 2);

  photosToProcess.forEach((file, index) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(event.target.result, (texture) => {
      const sheetIndex = Math.floor(index / 2);
      const isFront = index % 2 === 0;

      if (pageSurfaces[sheetIndex]) {
        const targetMesh = isFront
          ? pageSurfaces[sheetIndex].front
          : pageSurfaces[sheetIndex].back;

          const photoMaterial = targetMesh.material;

          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.colorSpace = THREE.SRGBColorSpace;

          // plane aspect = exact geometry size
          const pageAspect = 1.9 / 2.8;
          const imageAspect = texture.image.width / texture.image.height;

          texture.repeat.set(1, 1);
          texture.offset.set(0, 0);

          // "object-fit: cover"
          if (imageAspect > pageAspect) {
            const scale = pageAspect / imageAspect;
            texture.repeat.set(scale, 1);
            texture.offset.set((1 - scale) / 2, 0);
          } else {
            const scale = imageAspect / pageAspect;
            texture.repeat.set(1, scale);
            texture.offset.set(0, (1 - scale) / 2);
          }

          photoMaterial.map = texture;
          photoMaterial.needsUpdate = true;
        }
      });
    };
    reader.readAsDataURL(file);
  });

  // hide form after upload
  document.querySelector("#upload").style.display = "none";
});

// create group to rotate book object
const bookGroup = new THREE.Group();
scene.add(bookGroup);

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
  const geo = new THREE.ExtrudeGeometry(object, {
    depth: depth,
    bevelEnabled: bevel,
    curveSegments: curves
  }).center();

  // VERY IMPORTANT:
  // materialIndex 0 = sides
  // materialIndex 1 = front/back caps

  geo.groups.forEach(g => {
    if (g.materialIndex === 0) {
      g.materialIndex = 0; // keep paper on edges
    } else {
      g.materialIndex = 1; // caps will use photo material
    }
  });

  return geo;
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
bookGroup.add(coverPivot);

const backPivot = new THREE.Group();
scene.add(backPivot);
bookGroup.add(backPivot);

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
const pageSurfaces = []; 
const pageCount = 10;

for (let i = 0; i < pageCount; i++) {
  const pagePivot = new THREE.Group();
  const page = addShapeToScene(pageShape, 0.02, false, 12, "/images/paper2.jpg");

  // offset page to rotate around spine
  page.position.set(-0.95, 0, -0.001 + i * 0.002);

  pagePivot.add(page);
  pagePivot.rotation.y = Math.PI; // start closed (on the right side)

  bookGroup.add(pagePivot);
  pages.push(pagePivot);

  const photoGeo = new THREE.PlaneGeometry(1.9, 2.8);
  const frontPhoto = new THREE.Mesh(photoGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
  const backPhoto = new THREE.Mesh(photoGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
  
  frontPhoto.position.set(0, 0, 0.011);
  backPhoto.rotation.y = Math.PI;
  backPhoto.position.set(0, 0, -0.011);

  page.add(frontPhoto);
  page.add(backPhoto);
  pageSurfaces.push({ front: frontPhoto, back: backPhoto });
}

// background
const backgroundTexture = new THREE.TextureLoader().load('/images/sky.jpg');
scene.background = backgroundTexture;

// flipping logic
let flipping = false;
let coverFlipped = false;
let currentPage = 0;
let backwards = false;

rightButton.addEventListener("click", () => {
  if (flipping) return;

  backwards = false;

  // first click opens cover
  if (!coverFlipped) {
    flipping = "frontCover";
    return;
  }

  // next click flip pages
  if (currentPage < pages.length) {
    flipping = "page";
    return;
  }

  // next click closes back cover
  if (currentPage === pages.length) {
    flipping = "backCover";
  }
});

leftButton.addEventListener("click", () => {
  if (flipping) return;

  backwards = true;
  
  // next clicks opens back cover
  if (currentPage === pages.length && Math.abs(backPivot.rotation.y) > 1) {
    flipping = "backCover";
    return;
  }

  // next clicks flip pages
  if (currentPage > 0) {
    currentPage--;
    flipping = "page";
    return;
  }

  // next clicks closes cover
  if (coverFlipped && currentPage === 0) {
    flipping = "frontCover";
    return;
  }
});

function animateRenderer() {
  requestAnimationFrame(animateRenderer);

  const speed = 0.09;

  // flip front cover
  if (flipping === "frontCover") {
    const target = backwards ? Math.PI : 0;
    coverPivot.rotation.y += (target - coverPivot.rotation.y) * speed;

    if (Math.abs(coverPivot.rotation.y - target) < 0.01) {
      coverPivot.rotation.y = target;
      coverFlipped = !backwards;
      flipping = false;
    }
  }

  // flip single page
  if (flipping === "page") {
    const page = pages[currentPage];
    const target = backwards ? Math.PI : 0;
    
    page.rotation.y += (target - page.rotation.y) * speed;

    if (Math.abs(page.rotation.y - target) < 0.01) {
      page.rotation.y = target;
      if (!backwards) currentPage++; 
      flipping = false;
    }
  }

  // flip back cover
  if (flipping === "backCover") {
    const target = backwards ? 0 : -Math.PI;
    backPivot.rotation.y += (target - backPivot.rotation.y) * speed;

    if (Math.abs(backPivot.rotation.y - target) < 0.01) {
      backPivot.rotation.y = target;
      flipping = false;
    }
  }

  renderer.render(scene, camera);
}

animateRenderer();

function layoutBook() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  
  camera.position.z = 3;
  
  camera.updateProjectionMatrix();

  // scale relative to screen
  const minDimension = Math.min(width, height);
  let scale = minDimension / 1200;
  scale = THREE.MathUtils.clamp(scale, 0.4, 0.9);
  
  bookGroup.scale.set(scale, scale, scale);

  // if on mobile rotate book
  const isPortrait = height > width;
  bookGroup.rotation.z = isPortrait ? -Math.PI / 2 : 0;
}

window.addEventListener("resize", layoutBook);
layoutBook();
