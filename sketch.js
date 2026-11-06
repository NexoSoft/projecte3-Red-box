// ---------- Pantalles ----------
function mostrar(id) {
  document.querySelectorAll(".pantalla").forEach(function (p) {
    p.classList.remove("activa");
  });
  document.getElementById(id).classList.add("activa");
}

document.getElementById("btnInstruccions").addEventListener("click", function () {
  mostrar("instruccions");
});

document.getElementById("btnTornar").addEventListener("click", function () {
  mostrar("menu");
});

document.getElementById("btnComencar").addEventListener("click", function () {
  mostrar("joc");
  iniciarCamera();
});

document.getElementById("btnExercici").addEventListener("click", function () {
  estat = "exercici";
  document.getElementById("btnExercici").style.display = "none";
  document.getElementById("missatge").textContent = "Aquí anirà l'exercici (pas següent)";
});

// ---------- Càmera i detecció (p5.js + ml5.js) ----------
let video;
let bodyPose;
let poses = [];
let cameraActiva = false;
let estat = "menu"; // menu, colocacio, exercici

// Parts del cos que es dibuixen (sense la cara)
const ARTICULACIONS = [
  "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_hip", "right_hip",
  "left_knee", "right_knee", "left_ankle", "right_ankle"
];

// Línies que uneixen els punts (l'esquelet)
const OSSOS = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"]
];

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  pixelDensity(1);
  let c = createCanvas(windowWidth, windowHeight);
  c.parent("joc");
  frameRate(30);
  noLoop();
}

function iniciarCamera() {
  if (!cameraActiva) {
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.parent("joc");
    // El navegador mostra el vídeo a pantalla completa, com un mirall
    video.elt.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;transform:scaleX(-1);z-index:0;";
    bodyPose.detectStart(video, function (resultats) {
      poses = resultats;
    });
    cameraActiva = true;
  }
  estat = "colocacio";
  document.getElementById("btnExercici").style.display = "block";
  document.getElementById("btnExercici").disabled = true;
  document.getElementById("btnExercici").classList.remove("llest");
  document.getElementById("missatge").textContent = "Posa't dins del contorn";
  resizeCanvas(windowWidth, windowHeight);
  loop();
}

// Passa un punt de la càmera a la posició de la pantalla (com un mirall)
function pantalla(p) {
  return { x: width - (p.x * width) / video.width, y: (p.y * height) / video.height };
}

// Busca una part del cos pel seu nom. Si no es veu bé, torna null
function trobar(cos, nom) {
  for (let p of cos.keypoints) {
    if (p.name === nom && p.confidence > 0.3) {
      return pantalla(p);
    }
  }
  return null;
}

// Mira si l'usuari està ben col·locat
function comprovarPosicio() {
  if (poses.length === 0) {
    return { ok: false, text: "No et veig. Posa't davant de la càmera." };
  }
  let cos = poses[0];
  let nas = trobar(cos, "nose");
  let esp1 = trobar(cos, "left_shoulder");
  let esp2 = trobar(cos, "right_shoulder");
  let m1 = trobar(cos, "left_wrist");
  let m2 = trobar(cos, "right_wrist");

  if (!nas || !esp1 || !esp2 || !m1 || !m2) {
    return { ok: false, text: "Allunya't una mica: han de sortir el cap, les espatlles i les mans." };
  }
  if (Math.abs(nas.x - width / 2) > width * 0.12) {
    return { ok: false, text: "Posa't al centre de la pantalla." };
  }
  let ample = Math.abs(esp1.x - esp2.x);
  if (ample < width * 0.08) {
    return { ok: false, text: "Apropa't una mica a la càmera." };
  }
  if (ample > width * 0.38) {
    return { ok: false, text: "Allunya't una mica de la càmera." };
  }
  return { ok: true, text: "Molt bé! Ja pots prémer COMENÇAR!" };
}

// Dibuixa el contorn de referència (cap, espatlles i braços)
function dibuixarContorn() {
  noFill();
  stroke(255, 255, 255, 220);
  strokeWeight(6);
  drawingContext.setLineDash([20, 15]);
  ellipse(width / 2, height * 0.3, height * 0.2, height * 0.26);
  line(width / 2 - width * 0.14, height * 0.5, width / 2 + width * 0.14, height * 0.5);
  line(width / 2 - width * 0.14, height * 0.5, width / 2 - width * 0.2, height * 0.8);
  line(width / 2 + width * 0.14, height * 0.5, width / 2 + width * 0.2, height * 0.8);
  drawingContext.setLineDash([]);
}

// Dibuixa l'esquelet: línies entre els punts i les articulacions
function dibuixarEsquelet() {
  if (poses.length === 0) return;
  let cos = poses[0];

  stroke(0, 230, 255);
  strokeWeight(8);
  for (let os of OSSOS) {
    let a = trobar(cos, os[0]);
    let b = trobar(cos, os[1]);
    if (a && b) {
      line(a.x, a.y, b.x, b.y);
    }
  }
  // Coll: del nas al mig de les espatlles
  let nas = trobar(cos, "nose");
  let e1 = trobar(cos, "left_shoulder");
  let e2 = trobar(cos, "right_shoulder");
  if (nas && e1 && e2) {
    line(nas.x, nas.y, (e1.x + e2.x) / 2, (e1.y + e2.y) / 2);
  }

  noStroke();
  for (let nom of ARTICULACIONS) {
    let p = trobar(cos, nom);
    if (p) {
      if (nom.includes("wrist")) {
        fill(255, 0, 0);
        circle(p.x, p.y, 26);
      } else {
        fill(0, 255, 0);
        circle(p.x, p.y, 14);
      }
    }
  }
}

function draw() {
  clear(); // el canvas és transparent: el vídeo el mostra el navegador
  if (!cameraActiva) return;

  if (estat === "colocacio") {
    dibuixarContorn();
  }
  dibuixarEsquelet();

  if (estat === "colocacio") {
    let r = comprovarPosicio();
    document.getElementById("missatge").textContent = r.text;
    document.getElementById("btnExercici").disabled = !r.ok;
    document.getElementById("btnExercici").classList.toggle("llest", r.ok);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}