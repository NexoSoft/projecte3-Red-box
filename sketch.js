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

// ---------- Càmera i detecció (p5.js + ml5.js) ----------
let video;
let bodyPose;
let poses = [];
let cameraActiva = false;

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
  resizeCanvas(windowWidth, windowHeight);
  loop();
}

function draw() {
  background(0);
  if (!cameraActiva) return;

  // Es veu com un mirall, perquè sigui més fàcil moure's
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);

  if (poses.length > 0) {
    let cos = poses[0];
    for (let punt of cos.keypoints) {
      if (punt.confidence > 0.3) {
        let x = (punt.x * width) / video.width;
        let y = (punt.y * height) / video.height;
        noStroke();
        if (punt.name.includes("wrist")) {
          fill(255, 0, 0);
        } else {
          fill(0, 255, 0);
        }
        circle(x, y, 20);
      }
    }
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}