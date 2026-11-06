// Canvia de pantalla (només n'hi ha una d'activa)
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
  alert("Aquí començarà l'exercici (ho farem al pas següent).");
});