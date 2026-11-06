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

function preload() {
  bodyPose = ml5.bodyPose();
}

function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.parent("joc");
  noLoop();
}

function iniciarCamera() {
  if (!cameraActiva) {
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
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

function dibuixarPunts() {
  if (poses.length === 0) return;
  noStroke();
  for (let punt of poses[0].keypoints) {
    if (punt.confidence > 0.3) {
      let p = pantalla(punt);
      if (punt.name.includes("wrist")) {
        fill(255, 0, 0);
      } else {
        fill(0, 255, 0);
      }
      circle(p.x, p.y, 20);
    }
  }
}

function draw() {
  background(0);
  if (!cameraActiva) return;

  // La càmera es veu com un mirall
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  dibuixarPunts();

  if (estat === "colocacio") {
    dibuixarContorn();
    let r = comprovarPosicio();
    document.getElementById("missatge").textContent = r.text;
    document.getElementById("btnExercici").disabled = !r.ok;
    document.getElementById("btnExercici").classList.toggle("llest", r.ok);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}