const state = { answer: "Sì, volentieri!", date: "Sabato 16 novembre", place: "Cena in un posticino carino" };
const form = document.querySelector("#date-form");
const steps = [...document.querySelectorAll(".form-step")];
const indicators = [...document.querySelectorAll(".progress-step")];
const progressBar = document.querySelector("#progress-bar");

function showStep(number) {
  steps.forEach((step) => step.classList.toggle("active", step.dataset.step === String(number)));
  indicators.forEach((indicator) => indicator.classList.toggle("active", Number(indicator.dataset.stepIndicator) <= number));
  progressBar.style.width = `${((number - 1) / 2) * 100}%`;
  document.querySelector(".steps-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelector(".start-button").addEventListener("click", () => {
  document.querySelector(".steps-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector(".answer-yes").addEventListener("click", () => {
  state.answer = "Sì";
  document.querySelector(".answer-yes").classList.add("selected");
  document.querySelector("#step-1").classList.remove("active");
  document.querySelector("#yes-screen").classList.add("visible");
});

document.querySelector(".answer-no").addEventListener("pointerenter", (event) => {
  const button = event.currentTarget;
  const x = Math.round((Math.random() * 2 - 1) * 260);
  const y = Math.round((Math.random() * 2 - 1) * 140);
  button.style.transform = `translate(${x}px, ${y}px)`;
});

document.querySelector("#continue-after-yes").addEventListener("click", () => {
  document.querySelector("#yes-screen").classList.remove("visible");
  showStep(2);
});

document.querySelectorAll("[data-date]").forEach((button) => {
  button.addEventListener("click", () => {
    state.date = button.dataset.date;
    document.querySelectorAll("[data-date]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });
});

document.querySelector("#custom-date").addEventListener("change", (event) => {
  if (!event.target.value) return;
  const date = new Date(`${event.target.value}T12:00:00`);
  state.date = date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  document.querySelectorAll("[data-date]").forEach((item) => item.classList.remove("selected"));
});

document.querySelectorAll("[data-place]").forEach((button) => {
  button.addEventListener("click", () => {
    state.place = button.dataset.place;
    document.querySelectorAll("[data-place]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  });
});

document.querySelectorAll(".next-button").forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.next))));
document.querySelectorAll(".back-button").forEach((button) => button.addEventListener("click", () => {
  const current = Number(document.querySelector(".form-step.active").dataset.step);
  showStep(current - 1);
}));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#summary-answer").textContent = state.answer;
  document.querySelector("#summary-date").textContent = state.date;
  document.querySelector("#summary-place").textContent = state.place;
  form.style.display = "none";
  document.querySelector(".progress-track").style.display = "none";
  document.querySelector("#success-screen").classList.add("visible");
  document.querySelector("#confetti").innerHTML = Array.from({ length: 28 }, (_, index) =>
    `<i style="left:${Math.random() * 100}%;animation-delay:${Math.random() * .5}s;background:${index % 2 ? "#eaa188" : "#c8b3a5"}"></i>`).join("");
});

document.querySelector("#whatsapp-button").addEventListener("click", () => {
  const message = `Ciao! Ho preparato un'idea per noi ✨\n\n${state.answer}\n📅 ${state.date}\n📍 ${state.place}\n\nTi va?`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});

document.querySelector("#restart-button").addEventListener("click", () => {
  form.reset();
  form.style.display = "";
  document.querySelector(".progress-track").style.display = "";
  document.querySelector("#success-screen").classList.remove("visible");
  document.querySelector("#yes-screen").classList.remove("visible");
  document.querySelectorAll(".selected").forEach((item) => item.classList.remove("selected"));
  document.querySelector(".answer-no").style.transform = "";
  state.answer = "Sì, volentieri!";
  state.date = "Sabato 16 novembre";
  state.place = "Cena in un posticino carino";
  showStep(1);
});
