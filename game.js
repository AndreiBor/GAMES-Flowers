import { flowerImages, flowerTypes, logoFlower } from "./flower-art.js";

const ROUND_SECONDS = 120;
const rounds = [
  {
    task: "Собери 5 синих цветов",
    target: { blue: 5 },
    voice: "round-1",
  },
  {
    task: "Собери 2 красных и 3 синих цветка",
    target: { red: 2, blue: 3 },
    voice: "round-2",
  },
  {
    task: "Собери 2 красных, 2 синих и 1 зелёный цветок",
    target: { red: 2, blue: 2, green: 1 },
    voice: "round-3",
  },
  {
    task: "Собери 2 красных, 2 синих, 2 зелёных и 3 жёлтых цветка",
    target: { red: 2, blue: 2, green: 2, yellow: 3 },
    voice: "round-4",
  },
];

// A staggered field on wide screens and four rows of six touch targets on phones.
const plot = [
  [19, 54], [29, 53], [40, 50], [52, 55], [62, 51], [74, 53],
  [18, 72], [28, 69], [38, 66], [49, 69], [59, 67], [70, 66],
  [78, 78], [21, 87], [32, 82], [43, 84], [54, 83], [65, 82],
  [10, 96], [27, 97], [39, 95], [51, 97], [64, 96], [80, 94],
];
const plotColors = [
  "blue", "red", "yellow", "green", "blue", "yellow",
  "red", "blue", "green", "yellow", "red", "blue",
  "green", "yellow", "red", "blue", "green", "yellow",
  "blue", "green", "red", "blue", "yellow", "green",
];
const phoneColumns = [9, 25, 42, 58, 75, 91];
const phoneRows = [55, 68, 82, 95.5];
const narrow = matchMedia("(max-width: 680px)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const meadow = document.querySelector("#meadow");
const flowerBed = document.querySelector("#flowers");
const girl = document.querySelector("#girl");
const mom = document.querySelector("#mom");
const timer = document.querySelector("#timer");
const timeText = document.querySelector("#time");
const task = document.querySelector("#task");
const targets = document.querySelector("#targets");
const roundLabel = document.querySelector("#round-label");
const roundSteps = [...document.querySelector("#round-steps").children];
const basketTotal = document.querySelector("#basket-total");
const basketFlowers = document.querySelector("#basket-flowers");
const carriedFlowers = document.querySelector("#carried-flowers");
const actionButton = document.querySelector("#main-action");
const feedback = document.querySelector("#feedback");
const sound = document.querySelector("#sound");
const soundLabel = document.querySelector("#sound-label");
const listen = document.querySelector("#listen");
const voice = document.querySelector("#voice");
const celebration = document.querySelector("#celebration");
const celebrationMom = document.querySelector("#celebration-mom");
const celebrationMessage = document.querySelector("#celebration-message");
const bouquet = document.querySelector("#bouquet");
const nextRound = document.querySelector("#next-round");

let roundIndex = 0;
let phase = "ready";
let flowers = [];
let basket = [];
let muted = false;
let voiceClip = "";
let deadline = 0;
let timerHandle = 0;
let displayedTime = -1;
let feedbackHandle = 0;
let player;
let meadowSize;
let momPosition;
let deliveryPending = false;
let activeMove = null;
let motionFrame = 0;
let lastFrameTime = 0;
const moves = [];
const keysHeld = new Set();
const arrows = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

function flowerNumber(number) {
  const units = number % 10;
  if (number % 100 >= 11 && number % 100 <= 14) return "цветов";
  if (units === 1) return "цветок";
  return units >= 2 && units <= 4 ? "цветка" : "цветов";
}

function makeCount(color, count) {
  const chip = document.createElement("li");
  const image = new Image();
  image.src = flowerImages[color].blossom;
  image.alt = "";
  const word = count === 1 ? flowerTypes[color].singular : flowerTypes[color].plural;
  const label = document.createElement("span");
  label.textContent = count;
  label.setAttribute("aria-hidden", "true");
  chip.className = "flower-count";
  chip.setAttribute("aria-label", `${count} ${word} ${flowerNumber(count)}`);
  chip.append(image, label);
  return chip;
}

function basketCounts() {
  const counts = {};
  for (const color of basket) counts[color] = (counts[color] ?? 0) + 1;
  return counts;
}

function renderBasket() {
  basketTotal.textContent = `${basket.length} ${flowerNumber(basket.length)}`;
  const counts = basketCounts();
  basketFlowers.replaceChildren(...Object.keys(flowerTypes)
    .filter(color => counts[color])
    .map(color => makeCount(color, counts[color])));
  const visibleFlowers = basket.slice(-4);
  carriedFlowers.replaceChildren(...visibleFlowers.map((color, index) => {
    const image = new Image();
    const offset = index - (visibleFlowers.length - 1) / 2;
    image.src = flowerImages[color].blossom;
    image.alt = "";
    image.style.setProperty("--carried-x", `${50 + offset * 24}%`);
    image.style.setProperty("--carried-angle", `${offset * 19}deg`);
    return image;
  }));
}

function renderProgress() {
  roundLabel.textContent = `Раунд ${roundIndex + 1} из ${rounds.length}`;
  roundSteps.forEach((step, index) => {
    const done = index < roundIndex || (index === roundIndex && phase === "celebrating");
    step.classList.toggle("is-done", done);
    if (index === roundIndex && !done) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
    step.setAttribute("aria-label", `Раунд ${index + 1}${done ? ", пройден" : ""}`);
    const mark = step.firstElementChild;
    mark.className = done ? "icon icon-check" : "";
    mark.textContent = done ? "" : index + 1;
    mark.setAttribute("aria-hidden", "true");
  });
}

function renderAction() {
  const ready = phase === "ready";
  actionButton.firstElementChild.className = ready ? "icon icon-play" : "icon icon-gift";
  actionButton.lastElementChild.textContent = ready ? "Начать игру" : "Подарить маме";
  for (const button of [actionButton, mom]) {
    button.setAttribute("aria-disabled", String(deliveryPending));
  }
}

function makeFlower([x, y], index) {
  const color = plotColors[(index + roundIndex * 7) % plotColors.length];
  const mobilePoint = {
    x: phoneColumns[index % phoneColumns.length],
    y: phoneRows[Math.floor(index / phoneColumns.length)] + (index % 2) * 1.25,
  };
  const button = document.createElement("button");
  button.type = "button";
  button.className = "field-flower";
  button.dataset.color = color;
  button.setAttribute("aria-label", flowerTypes[color].name);
  button.style.setProperty("--x", `${x}%`);
  button.style.setProperty("--y", `${y}%`);
  button.style.setProperty("--mx", `${mobilePoint.x}%`);
  button.style.setProperty("--my", `${mobilePoint.y}%`);
  button.style.setProperty("--depth", (.83 + (y - 50) / 165).toFixed(2));
  button.style.setProperty("--sprout-delay", `${(index % 8) * 35}ms`);
  const art = new Image();
  art.src = flowerImages[color].whole;
  art.alt = "";
  art.draggable = false;
  button.append(art);

  const flower = { color, point: { x, y }, mobilePoint, button, collected: false, queued: false };
  button.addEventListener("click", () => queueFlower(flower));
  return flower;
}

function startPosition() {
  return narrow.matches ? { x: 16, y: 43.5 } : { x: 9.6, y: 82 };
}

function measureMeadow() {
  meadowSize = { width: meadow.clientWidth, height: meadow.clientHeight };
  momPosition = {
    x: mom.offsetLeft / meadowSize.width * 100,
    y: mom.offsetTop / meadowSize.height * 100,
  };
}

function renderPlayer(running = false, now = 0) {
  girl.style.setProperty("--girl-x", `${player.x}%`);
  girl.style.setProperty("--girl-y", `${player.y}%`);
  girl.style.setProperty("--facing", player.direction);
  const showStride = running && !reducedMotion.matches;
  girl.style.setProperty("--hop", showStride ? `${-Math.abs(Math.sin(now / 75)) * 5}px` : "0px");
  const pose = showStride ? `run-${1 + Math.floor(now / 105) % 2}` : "stand";
  if (girl.dataset.pose !== pose) girl.dataset.pose = pose;
}

function clearMoves() {
  cancelAnimationFrame(motionFrame);
  motionFrame = 0;
  lastFrameTime = 0;
  activeMove = null;
  moves.length = 0;
  keysHeld.clear();
  deliveryPending = false;
}

function resetField() {
  const focusedFlower = flowerBed.contains(document.activeElement);
  clearMoves();
  player = { ...startPosition(), direction: 1 };
  flowers = plot.map(makeFlower);
  flowerBed.replaceChildren(...flowers.map(flower => flower.button));
  basket = [];
  renderBasket();
  renderAction();
  renderPlayer();
  if (focusedFlower) meadow.focus({ preventScroll: true });
}

function revealMeadow() {
  meadow.classList.remove("is-opening");
  requestAnimationFrame(() => requestAnimationFrame(() => meadow.classList.add("is-opening")));
}

function displayTime(seconds) {
  if (displayedTime === seconds) return;
  displayedTime = seconds;
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  timeText.textContent = time;
  timer.setAttribute("aria-label", `Осталось ${time}`);
  timer.classList.toggle("is-low", seconds <= 20);
  timer.style.setProperty("--timer-progress", `${100 * seconds / ROUND_SECONDS}%`);
}

function showFeedback(message) {
  clearTimeout(feedbackHandle);
  feedback.textContent = message;
  if (message) feedbackHandle = setTimeout(() => { feedback.textContent = ""; }, 4700);
}

function playVoice(clip) {
  if (muted) return;
  voiceClip = clip;
  const source = new URL(`./assets/audio/${clip}.mp3`, import.meta.url).href;
  voice.pause();
  if (voice.src === source) voice.currentTime = 0;
  else voice.src = source;
  voice.play().catch(() => listen.classList.remove("is-speaking"));
}

function updateSound() {
  sound.setAttribute("aria-pressed", String(!muted));
  sound.firstElementChild.className = muted ? "icon icon-muted" : "icon icon-speaker";
  soundLabel.textContent = muted ? "Звук выключен" : "Звук включён";
  if (muted) voice.pause();
}

function prepareRound() {
  clearInterval(timerHandle);
  phase = "ready";
  const round = rounds[roundIndex];
  task.textContent = round.task;
  targets.replaceChildren(...Object.entries(round.target).map(([color, count]) => makeCount(color, count)));
  renderProgress();
  showFeedback("");
  displayTime(ROUND_SECONDS);
  resetField();
  revealMeadow();
}

function restartClock() {
  clearInterval(timerHandle);
  deadline = performance.now() + ROUND_SECONDS * 1000;
  displayTime(ROUND_SECONDS);
  timerHandle = setInterval(checkTime, 150);
}

function startRound() {
  if (phase !== "ready") return;
  phase = "playing";
  restartClock();
  renderAction();
  playVoice(rounds[roundIndex].voice);
}

function retryAttempt(message, clip) {
  resetField();
  restartClock();
  showFeedback(message);
  playVoice(clip);
}

function checkTime(now = performance.now()) {
  if (phase !== "playing") return false;
  const remaining = Math.ceil((deadline - now) / 1000);
  if (remaining <= 0) {
    retryAttempt("Время вышло. Попробуй ещё раз!", "expired");
    return false;
  }
  displayTime(remaining);
  return true;
}

function flowerPoint(flower) {
  return narrow.matches ? flower.mobilePoint : flower.point;
}

function queueFlower(flower) {
  if (flower.queued || flower.collected || deliveryPending) return;
  startRound();
  if (!checkTime()) return;
  flower.queued = true;
  flower.button.classList.add("is-queued");
  moves.push({ kind: "pick", flower });
  requestMotion();
}

function queueDelivery() {
  if (phase === "ready") {
    startRound();
    return;
  }
  if (deliveryPending || !checkTime()) return;
  deliveryPending = true;
  renderAction();
  moves.push({ kind: "deliver" });
  requestMotion();
}

function startOrDeliver(event) {
  if (phase === "ready") {
    startRound();
    if (event.detail === 0) meadow.focus({ preventScroll: true });
  } else {
    queueDelivery();
  }
}

function collect(flower) {
  flower.collected = true;
  flower.button.hidden = true;
  basket.push(flower.color);
  renderBasket();
  if (document.activeElement === flower.button) meadow.focus({ preventScroll: true });
}

function deliver() {
  const round = rounds[roundIndex];
  const counts = basketCounts();
  const correct = basket.length === Object.values(round.target).reduce((sum, count) => sum + count, 0)
    && Object.entries(round.target).every(([color, count]) => counts[color] === count);
  if (correct) {
    celebrate();
  } else if (roundIndex === 0 && basket.length !== 5) {
    retryAttempt("Нужно пять цветов. Попробуй ещё раз!", "need-five");
  } else if (roundIndex === 0) {
    retryAttempt("Нужно пять синих цветов. Попробуй ещё раз!", "need-blue");
  } else {
    retryAttempt(`Попробуй ещё раз. ${round.task}.`, round.voice);
  }
}

function requestMotion() {
  if (!motionFrame) motionFrame = requestAnimationFrame(movePlayer);
}

function pixelsBetween(from, to) {
  return {
    x: (to.x - from.x) * meadowSize.width / 100,
    y: (to.y - from.y) * meadowSize.height / 100,
  };
}

function distanceTo(point) {
  const delta = pixelsBetween(player, point);
  return Math.hypot(delta.x, delta.y);
}

function limitWalk(x, y) {
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(narrow.matches ? 40 : 48, Math.min(97, y)),
  };
}

function moveBy(dx, dy) {
  if (Math.abs(dx) > .3) player.direction = Math.sign(dx);
  const target = limitWalk(
    player.x + dx / meadowSize.width * 100,
    player.y + dy / meadowSize.height * 100,
  );
  Object.assign(player, target);
}

function moveDestination(move) {
  if (move.kind === "pick") return flowerPoint(move.flower);
  if (move.kind === "deliver") return { x: momPosition.x - (narrow.matches ? 12 : 6), y: momPosition.y + 1 };
  return move.point;
}

function followMove(move, step) {
  const destination = moveDestination(move);
  const delta = pixelsBetween(player, destination);
  const distance = Math.hypot(delta.x, delta.y);
  if (distance > step) {
    moveBy(delta.x * step / distance, delta.y * step / distance);
    return true;
  }
  if (Math.abs(delta.x) > 1) player.direction = Math.sign(delta.x);
  Object.assign(player, destination);
  activeMove = null;
  if (move.kind === "pick") collect(move.flower);
  if (move.kind === "deliver") deliver();
  return false;
}

function followKeys(step) {
  let dx = 0;
  let dy = 0;
  for (const key of keysHeld) {
    dx += arrows[key][0];
    dy += arrows[key][1];
  }
  const magnitude = Math.hypot(dx, dy);
  if (!magnitude) return false;
  moveBy(dx * step / magnitude, dy * step / magnitude);
  return true;
}

function movePlayer(now) {
  motionFrame = 0;
  if (!checkTime(now)) return;
  const elapsed = lastFrameTime ? Math.min(now - lastFrameTime, 40) / 1000 : 1 / 60;
  lastFrameTime = now;
  const speed = Math.max(395, meadowSize.width * .9);
  activeMove ??= moves.shift();
  const running = activeMove ? followMove(activeMove, speed * elapsed) : followKeys(speed * .7 * elapsed);
  renderPlayer(running, now);

  if (phase === "playing" && (activeMove || moves.length || keysHeld.size)) {
    requestMotion();
  } else {
    lastFrameTime = 0;
  }
}

function interactNearby() {
  if (distanceTo(momPosition) < (narrow.matches ? 60 : 90)) {
    queueDelivery();
    return;
  }
  let nearest;
  let nearestDistance = 44;
  for (const flower of flowers) {
    if (flower.collected || flower.queued) continue;
    const distance = distanceTo(flowerPoint(flower));
    if (distance < nearestDistance) {
      nearest = flower;
      nearestDistance = distance;
    }
  }
  if (nearest) queueFlower(nearest);
}

function celebrate() {
  phase = "celebrating";
  clearInterval(timerHandle);
  clearMoves();
  showFeedback("");
  renderProgress();
  const last = roundIndex === rounds.length - 1;
  celebrationMessage.textContent = last ? "Все четыре букета собраны!" : "Ты собрала нужный букет.";
  nextRound.firstElementChild.textContent = last ? "Играть снова" : "Следующий раунд";
  nextRound.lastElementChild.className = last ? "icon icon-restart" : "icon icon-arrow";
  nextRound.setAttribute("aria-disabled", "true");
  celebrationMom.classList.remove("is-hugging");
  bouquet.replaceChildren(...basket.map((color, index) => {
    const blossom = new Image();
    const fan = index / (basket.length - 1) * 2 - 1;
    blossom.src = flowerImages[color].whole;
    blossom.alt = "";
    blossom.style.setProperty("--bloom-size", `${75 - Math.abs(fan) * 18}%`);
    blossom.style.setProperty("--bloom-angle", `${fan * 58}deg`);
    blossom.style.setProperty("--bloom-offset", `${Math.abs(fan) * 13}%`);
    return blossom;
  }));
  voice.pause();
  celebration.showModal();
  setTimeout(() => {
    celebrationMom.classList.add("is-hugging");
    playVoice("thanks");
    setTimeout(() => nextRound.setAttribute("aria-disabled", "false"), muted ? 450 : 1800);
  }, reducedMotion.matches ? 100 : 1050);
}

sound.addEventListener("click", () => {
  muted = !muted;
  updateSound();
});
listen.addEventListener("click", () => {
  muted = false;
  updateSound();
  playVoice(rounds[roundIndex].voice);
});
voice.addEventListener("playing", () => {
  listen.classList.toggle("is-speaking", voiceClip === rounds[roundIndex].voice);
});
for (const event of ["pause", "ended", "error"]) {
  voice.addEventListener(event, () => listen.classList.remove("is-speaking"));
}

actionButton.addEventListener("click", startOrDeliver);
mom.addEventListener("click", queueDelivery);
meadow.addEventListener("click", event => {
  if (event.target !== meadow || deliveryPending || !checkTime()) return;
  const rect = meadow.getBoundingClientRect();
  const y = (event.clientY - rect.top) / meadowSize.height * 100;
  if (y < (narrow.matches ? 39 : 42)) return;
  const x = (event.clientX - rect.left) / meadowSize.width * 100;
  moves.push({ kind: "walk", point: limitWalk(x, y) });
  requestMotion();
});

window.addEventListener("keydown", event => {
  if (phase === "celebrating" || event.altKey || event.ctrlKey || event.metaKey) return;
  if (Object.hasOwn(arrows, event.key)) {
    event.preventDefault();
    startRound();
    if (checkTime()) {
      keysHeld.add(event.key);
      requestMotion();
    }
  } else if ((event.code === "Space" || event.key === "Enter") && document.activeElement === meadow) {
    event.preventDefault();
    if (phase === "ready") startRound();
    else if (!event.repeat && checkTime()) interactNearby();
  }
});
window.addEventListener("keyup", event => keysHeld.delete(event.key));
window.addEventListener("blur", () => keysHeld.clear());
new ResizeObserver(measureMeadow).observe(meadow);
narrow.addEventListener("change", () => {
  Object.assign(player, phase === "ready" ? startPosition() : limitWalk(player.x, player.y));
  renderPlayer();
});

celebration.addEventListener("cancel", event => event.preventDefault());
nextRound.addEventListener("click", () => {
  if (nextRound.getAttribute("aria-disabled") === "true") return;
  celebration.close();
  roundIndex = (roundIndex + 1) % rounds.length;
  prepareRound();
  startRound();
  meadow.focus({ preventScroll: true });
});

document.querySelector("#brand-flower").src = logoFlower;
document.querySelector('link[rel="icon"]').href = logoFlower;
measureMeadow();
prepareRound();
