import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

// supabase connection
const URL   = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(URL, KEY);

// defaults for threejs
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const canvas = document.querySelector("#main");
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
const leftButton = document.querySelector("#left");
const rightButton = document.querySelector("#right");
const shareButton = document.querySelector("#share");
leftButton.style.display = "none";
rightButton.style.display = "none";
shareButton.style.display = "none";

camera.position.z = 3;

// loading spinner
const loadingOverlay = document.querySelector("#loading-overlay");
const loadingText = document.querySelector("#loading-text");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function toggleLoader(show, text = "Loading") {
  loadingOverlay.style.display = show ? "flex" : "none";
  loadingText.textContent = text;
}

// get uploaded images
const imageForm = document.querySelector("#image-form");
const imageInput = document.querySelector("#image-input");

let currentScrapbookId = null;

// upload to supabase
imageForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // stop page refresh

  const files = Array.from(imageInput.files);

  if (files.length < requiredPhotos) {
    alert(`Please select at least ${requiredPhotos} photos.`);
    return;
  }

  toggleLoader(true, `Uploading photos`);

  // upload images to bucket
  const uploadPromises = files.slice(0, requiredPhotos).map(async (file) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data } = await supabase.storage.from('scrapbook-photos').upload(fileName, file);
    if (data) {
      const { data: publicUrl } = supabase.storage.from('scrapbook-photos').getPublicUrl(fileName);
      return publicUrl.publicUrl;
    }
  });
  const photoUrls = (await Promise.all(uploadPromises)).filter(url => url !== undefined);

  // save urls to table
  const { data, error } = await supabase
    .from('scrapbook')
    .insert([{ photos: photoUrls }])
    .select();

  if (data) {
    currentScrapbookId = data[0].id;
    loadingText.textContent = "Almost there";
    await sleep(1500);
    loadPhotosIntoBook(photoUrls);
  } else {
    toggleLoader(false);
  }
});

// add uploaded photos to pages
function loadPhotosIntoBook(urls) {
  let loadedCount = 0;

  urls.forEach((url, index) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(url, (texture) => {
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

          const isLandscape = texture.image.width > texture.image.height;

          // center the transform pivot (rotate and scale from the middle)
          texture.center.set(0.5, 0.5);

          texture.rotation = isLandscape ? Math.PI / 2 : 0;

          // plane aspect = exact geometry size
          const pageAspect = 1.9 / 2.8;
          const imageAspect = isLandscape 
            ? texture.image.height / texture.image.width 
            : texture.image.width / texture.image.height;

          // "object-fit: cover"
          if (imageAspect > pageAspect) {
            texture.repeat.set(pageAspect / imageAspect, 1);
          } else {
            texture.repeat.set(1, imageAspect / pageAspect);
          }
          
          texture.offset.set(0, 0);

          photoMaterial.map = texture;
          photoMaterial.needsUpdate = true;

          loadedCount++;

          // reveal book when all iamges
          if (loadedCount === urls.length) {
            bookGroup.visible = true;
            toggleLoader(false);
            // hide form after upload and show buttons
            document.querySelector("#upload").style.display = "none";
            leftButton.style.display = "flex";
            rightButton.style.display = "flex";
            shareButton.style.display = "flex";
          }
        }
      });
  });
};

async function checkUrlForScrapbook() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');

  if (bookId) {
    // hide upload form immediately
    document.querySelector("#upload").style.display = "none";

    toggleLoader(true, "Fetching your memories");
    const { data, error } = await supabase
      .from('scrapbook')
      .select('photos')
      .eq('id', bookId)
      .single();

    if (data) {
      await sleep(1000);
      loadPhotosIntoBook(data.photos);
      shareButton.style.display = "flex";
    } else {
      toggleLoader(false);
    }
  }
}

checkUrlForScrapbook();

shareButton.addEventListener("click", () => {
  // check for id in url
  const urlParams = new URLSearchParams(window.location.search);
  const idToShare = currentScrapbookId || urlParams.get('id');

  if (!idToShare) {
    alert("No scrapbook ID found to share!");
    return;
  }

  // construct the URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?id=${idToShare}`;

  // copy to clipboard
  navigator.clipboard.writeText(shareUrl).then(() => {
    // Visual feedback
    const originalText = shareButton.innerHTML;
    shareButton.innerHTML = "Copied!";
    shareButton.style.backgroundColor = "white"; 
    shareButton.style.color = "black"; // feedback
    
    setTimeout(() => {
      shareButton.innerHTML = originalText;
      shareButton.style.backgroundColor = ""; 
      shareButton.style.color = "white"; // reset to default
    }, 2000);
  }).catch(err => {
    console.error("Could not copy text: ", err);
  });
});

// create group to rotate book object
const bookGroup = new THREE.Group();
scene.add(bookGroup);
bookGroup.visible = false;

renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );

// crying lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.9));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(2, 4, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
fillLight.position.set(-3, 2, 2);
scene.add(fillLight);

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

const frontCover = addShapeToScene(coverShape, 0.15, false, 12,"/images/paper.jpg");
frontCover.position.set(-1, 0, -0.1);

const backCover = addShapeToScene(coverShape, 0.15, false, 12,"/images/paper.jpg");
backCover.position.set(1, 0, -0.1);

coverPivot.add(frontCover);
coverPivot.rotation.y = Math.PI; // closed

backPivot.add(backCover);
backPivot.rotation.y = 0; // open

// pages
const pages = [];
const pageSurfaces = []; 
const pageCount = 2;
const requiredPhotos = pageCount * 2;

for (let i = 0; i < pageCount; i++) {
  const pagePivot = new THREE.Group();
  const page = addShapeToScene(pageShape, 0.02, false, 12, "/images/paper.jpg");

  // offset page to rotate around spine
  page.position.set(-0.95, 0, -0.001 + i * 0.002);

  pagePivot.add(page);
  pagePivot.rotation.y = Math.PI; // start closed (on the right side)

  bookGroup.add(pagePivot);
  pages.push(pagePivot);

  const photoGeo = new THREE.PlaneGeometry(1.9, 2.8);
  const frontPhoto = new THREE.Mesh(photoGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 }));
  const backPhoto = new THREE.Mesh(photoGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 }));
  
  frontPhoto.position.set(0, 0, 0.011);
  backPhoto.rotation.y = Math.PI;
  backPhoto.position.set(0, 0, -0.011);

  page.add(frontPhoto);
  page.add(backPhoto);
  pageSurfaces.push({ front: frontPhoto, back: backPhoto });
}

// background
const backgroundTexture = new THREE.TextureLoader().load('/images/gradient.jpg');
backgroundTexture.colorSpace = THREE.SRGBColorSpace;
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

  const speed = 0.06;

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
