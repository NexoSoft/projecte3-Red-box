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
  if (!appLlesta) {
    alert("Espera uns segons: s'està carregant el model.");
    return;
  }
  mostrar("joc");
  iniciarCamera();
});

document.getElementById("btnExercici").addEventListener("click", function () {
  iniciarExercici();
});

document.getElementById("btnFinalitzar").addEventListener("click", function () {
  tornarAlMenu();
});

// ---------- Variables ----------
let video;
let bodyPose;
let poses = [];
let cameraActiva = false;
let estat = "menu"; // menu, colocacio, exercici, final
let appLlesta = false;

const DURADA = 30; // segons
let punts = 0;
let tempsInici = 0;
let diana = null;
let audio = null;

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

// ---------- p5.js i ml5.js ----------
function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  pixelDensity(1);
  let c = createCanvas(windowWidth, windowHeight);
  c.parent("joc");
  frameRate(30);
  noLoop();
  appLlesta = true;
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
  document.getElementById("marcador").style.display = "none";
  document.getElementById("final").style.display = "none";
  document.getElementById("missatge").style.display = "block";
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

// ---------- Col·locació ----------
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

// ---------- Esquelet ----------
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

// ---------- Exercici ----------
function iniciarExercici() {
  estat = "exercici";
  punts = 0;
  tempsInici = millis();
  novaDiana();
  document.getElementById("btnExercici").style.display = "none";
  document.getElementById("missatge").style.display = "none";
  document.getElementById("punts").textContent = "0";
  document.getElementById("temps").textContent = DURADA;
  document.getElementById("marcador").style.display = "block";
}

// Posa una diana nova a l'esquerra o a la dreta, lluny de les mans
function novaDiana() {
  let r = height * 0.09;
  let cos = poses.length > 0 ? poses[0] : null;
  for (let intent = 0; intent < 20; intent++) {
    let x = random() < 0.5 ? width * 0.2 : width * 0.8;
    let y = random(height * 0.3, height * 0.7);
    let lluny = true;
    if (cos) {
      for (let nom of ["left_wrist", "right_wrist"]) {
        let m = trobar(cos, nom);
        if (m && dist(m.x, m.y, x, y) < r * 2.5) {
          lluny = false;
        }
      }
    }
    diana = { x: x, y: y, r: r };
    if (lluny) return;
  }
}

function dibuixarDiana() {
  noStroke();
  fill(198, 40, 40);
  circle(diana.x, diana.y, diana.r * 2);
  fill(255);
  circle(diana.x, diana.y, diana.r * 1.4);
  fill(198, 40, 40);
  circle(diana.x, diana.y, diana.r * 0.8);
  fill(255);
  circle(diana.x, diana.y, diana.r * 0.3);
}

// Si un canell toca la diana, suma un punt
function comprovarCop() {
  if (poses.length === 0) return;
  for (let nom of ["left_wrist", "right_wrist"]) {
    let m = trobar(poses[0], nom);
    if (m && dist(m.x, m.y, diana.x, diana.y) < diana.r) {
      punts++;
      document.getElementById("punts").textContent = punts;
      so(600, 0.12, "square");
      novaDiana();
      return;
    }
  }
}

function acabarExercici() {
  estat = "final";
  so(220, 1.2, "sawtooth"); // botzina final
  document.getElementById("marcador").style.display = "none";
  document.getElementById("puntsFinal").textContent = punts;
  document.getElementById("final").style.display = "flex";
}

function tornarAlMenu() {
  document.getElementById("final").style.display = "none";
  bodyPose.detectStop();
  video.remove();
  cameraActiva = false;
  poses = [];
  estat = "menu";
  noLoop();
  clear();
  mostrar("menu");
}

// ---------- So (sense fitxers) ----------
function so(frequencia, durada, tipus) {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  }
  let osc = audio.createOscillator();
  let volum = audio.createGain();
  osc.type = tipus;
  osc.frequency.value = frequencia;
  osc.connect(volum);
  volum.connect(audio.destination);
  volum.gain.setValueAtTime(0.4, audio.currentTime);
  volum.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + durada);
  osc.start();
  osc.stop(audio.currentTime + durada);
}

// ---------- Bucle principal ----------
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

  if (estat === "exercici") {
    let restant = DURADA - (millis() - tempsInici) / 1000;
    if (restant <= 0) {
      document.getElementById("temps").textContent = "0";
      acabarExercici();
      return;
    }
    document.getElementById("temps").textContent = Math.ceil(restant);
    dibuixarDiana();
    comprovarCop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}