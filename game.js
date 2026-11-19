import { flowerImages, flowerTypes, logoFlower } from "./flower-art.js";
import { Hedgehogs, groundLayer } from "./hedgehog.js?v=7";

const ROUND_SECONDS = 120;
const RUN_POSES = ["run-1", "run-2", "run-3", "run-2"];
const RUN_FRAME_SECONDS = .09;
const FINAL_HEDGEHOG_PACE = 2.457;
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
  {
    task: "Собери по одному цветку каждого цвета",
    target: { red: 1, blue: 1, green: 1, yellow: 1 },
    voice: "round-5",
    hedgehogPace: 1,
  },
  {
    task: "Собери все цветы любого одного цвета",
    goal: "one-color",
    voice: "round-6",
    hedgehogPace: 1.638,
  },
  {
    task: "Собери все цветы, кроме жёлтых",
    goal: "no-yellow",
    voice: "round-7",
    hedgehogPace: FINAL_HEDGEHOG_PACE,
  },
  {
    task: "Собери все цветы, кроме трёх",
    leaveOnMeadow: 3,
    voice: "round-8",
    hedgehogPace: FINAL_HEDGEHOG_PACE,
    hedgehogCount: 3,
  },
  {
    task: "Собери один цветок жёлтого цвета",
    target: { yellow: 1 },
    voice: "round-9",
    hedgehogPace: FINAL_HEDGEHOG_PACE,
    hedgehogCount: 7,
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
const droppedFlowers = document.querySelector("#dropped-flowers");
const hedgehogs = new Hedgehogs(
  document.querySelector("#hedgehogs"),
  document.querySelector("#hedgehog-template"),
  document.querySelector("#mushrooms"),
);
const mom = document.querySelector("#mom");
const timer = document.querySelector("#timer");
const timeText = document.querySelector("#time");
const pauseButton = document.querySelector("#pause-game");
const pauseLabel = document.querySelector("#pause-label");
const task = document.querySelector("#task");
const missionHint = document.querySelector("#mission-hint");
const movementHint = document.querySelector("#movement-hint");
const targets = document.querySelector("#targets");
const roundLabel = document.querySelector("#round-label");
const roundSteps = rounds.map((_, index) => {
  const step = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = index + 1;
  button.addEventListener("click", () => launchRound(index));
  step.append(button);
  return step;
});
document.querySelector("#round-steps").replaceChildren(...roundSteps);
const basketTotal = document.querySelector("#basket-total");
const basketFlowers = document.querySelector("#basket-flowers");
const carriedFlowers = document.querySelector("#carried-flowers");
const actionButton = document.querySelector("#main-action");
const feedback = document.querySelector("#feedback");
const sound = document.querySelector("#sound");
const soundLabel = document.querySelector("#sound-label");
const soundSettings = document.querySelector("#sound-settings");
const soundEnabled = document.querySelector("#sound-enabled");
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
let roundTarget;
let basket = [];
let muted = false;
let voiceClip = "";
let pauseRequested = false;
let pausedAt = null;
let resumeVoice = false;
let deadline = 0;
let timerHandle = 0;
let displayedTime = -1;
let feedbackExpires = 0;
let player;
let meadowSize;
let momPosition;
let deliveryPending = false;
let activeMove = null;
let motionFrame = 0;
let lastFrameTime = 0;
let strideTime = 0;
let startledUntil = 0;
let collisionGraceUntil = 0;
const moves = [];
const keysHeld = new Set();
const completedRounds = new Set();
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

function countColors(colors) {
  const counts = {};
  for (const color of colors) counts[color] = (counts[color] ?? 0) + 1;
  return counts;
}

function renderBasket() {
  basketTotal.textContent = `${basket.length} ${flowerNumber(basket.length)}`;
  const counts = countColors(basket);
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
    const button = step.firstElementChild;
    const done = completedRounds.has(index);
    button.classList.toggle("is-done", done);
    if (index === roundIndex) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
    button.setAttribute("aria-label", `Раунд ${index + 1}${done ? ", пройден" : ""}`);
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
  button.style.setProperty("--ground-layer", groundLayer(y));
  button.style.setProperty("--phone-ground-layer", groundLayer(mobilePoint.y));
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
  hedgehogs.resize(meadowSize);
}

function renderPlayer(running = false, elapsed = 0) {
  girl.style.setProperty("--girl-x", `${player.x}%`);
  girl.style.setProperty("--girl-y", `${player.y}%`);
  girl.style.setProperty("--facing", player.direction);
  girl.style.zIndex = groundLayer(player.y);
  const showStride = running && !reducedMotion.matches;
  const cycle = RUN_POSES.length * RUN_FRAME_SECONDS;
  strideTime = showStride ? (strideTime + elapsed) % cycle : 0;
  const pose = showStride ? RUN_POSES[Math.floor(strideTime / RUN_FRAME_SECONDS)] : "stand";
  const hop = showStride ? -Math.abs(Math.cos(strideTime / cycle * 2 * Math.PI)) * 3.5 : 0;
  girl.style.setProperty("--hop", `${hop}px`);
  if (girl.dataset.pose !== pose) girl.dataset.pose = pose;
}

function stopMotion() {
  cancelAnimationFrame(motionFrame);
  motionFrame = 0;
  lastFrameTime = 0;
  keysHeld.clear();
}

function clearMoves() {
  stopMotion();
  activeMove = null;
  moves.length = 0;
  deliveryPending = false;
}

function clearReaction() {
  if (startledUntil) {
    for (const flower of flowers) {
      if (!flower.collected) continue;
      flower.collected = false;
      flower.button.hidden = false;
    }
  }
  startledUntil = 0;
  girl.classList.remove("is-startled");
  droppedFlowers.replaceChildren();
}

function resetHedgehogs() {
  const { hedgehogPace = 0, hedgehogCount = hedgehogPace ? 1 : 0 } = rounds[roundIndex];
  hedgehogs.reset(hedgehogPace, hedgehogCount, narrow.matches, meadowSize);
}

function resetField() {
  const focusedFlower = flowerBed.contains(document.activeElement);
  clearMoves();
  clearReaction();
  collisionGraceUntil = 0;
  resetHedgehogs();
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
  feedback.textContent = message;
  feedbackExpires = message ? performance.now() + 4700 : 0;
}

function recordingURL(clip) {
  return new URL(`./assets/audio/gentle/${clip}.mp3?v=6`, import.meta.url).href;
}

function playRecording(clip) {
  voiceClip = clip;
  const source = recordingURL(clip);
  voice.pause();
  if (voice.src === source) voice.currentTime = 0;
  else voice.src = source;
  return voice.play();
}

function playVoice(clip) {
  if (!muted) playRecording(clip).catch(() => {});
}

function updateSound() {
  soundEnabled.checked = !muted;
  sound.classList.toggle("is-muted", muted);
  sound.firstElementChild.className = muted ? "icon icon-muted" : "icon icon-speaker";
  soundLabel.textContent = muted ? "Звук выключен" : "Звук";
}

function renderPause() {
  const paused = pausedAt !== null;
  meadow.classList.toggle("is-paused", paused);
  pauseButton.disabled = phase !== "playing";
  pauseButton.classList.toggle("is-resume", pauseRequested);
  pauseLabel.textContent = pauseRequested ? "Продолжить" : "Пауза";
  listen.disabled = paused;
}

function syncPause() {
  if (phase !== "playing") return;
  const shouldPause = pauseRequested || soundSettings.open;
  if (shouldPause === (pausedAt !== null)) return;
  const now = performance.now();
  if (shouldPause) {
    pausedAt = now;
    stopMotion();
    resumeVoice = !voice.paused;
    voice.pause();
  } else {
    const elapsed = now - pausedAt;
    pausedAt = null;
    deadline += elapsed;
    if (feedbackExpires) feedbackExpires += elapsed;
    if (startledUntil) startledUntil += elapsed;
    if (collisionGraceUntil) collisionGraceUntil += elapsed;
    if (resumeVoice && !muted) voice.play().catch(() => {});
    resumeVoice = false;
    if (hedgehogs.pace || activeMove || moves.length) requestMotion();
  }
  renderPause();
}

function togglePause() {
  if (phase !== "playing" || soundSettings.open) return;
  pauseRequested = !pauseRequested;
  syncPause();
}

function prepareRound() {
  clearInterval(timerHandle);
  phase = "ready";
  pauseRequested = false;
  pausedAt = null;
  resumeVoice = false;
  voice.pause();
  renderPause();
  const round = rounds[roundIndex];
  resetField();
  roundTarget = round.target ?? countColors(flowers.map(flower => flower.color));
  if (round.goal === "no-yellow") delete roundTarget.yellow;
  task.textContent = round.task;
  const manyHedgehogs = round.hedgehogCount > 1;
  missionHint.textContent = hedgehogs.pace
    ? `${manyHedgehogs ? "Осторожнее с ёжиками." : "Осторожно, ёжик!"} Отнеси букет маме.`
    : "Потом подари букет маме.";
  movementHint.textContent = hedgehogs.pace
    ? `Чтобы обойти ${manyHedgehogs ? "ёжиков" : "ёжика"}, нажми на лужайку.`
    : "Нажимай на цветы, чтобы собрать их.";
  targets.setAttribute("aria-label", round.goal === "one-color" ? "Выбери один цвет" : "Цветы для букета");
  if (round.leaveOnMeadow) {
    const count = flowers.length - round.leaveOnMeadow;
    const total = document.createElement("li");
    total.className = "flower-count target-total";
    total.textContent = `${count} ${flowerNumber(count)}`;
    targets.replaceChildren(total);
  } else {
    targets.replaceChildren(...Object.keys(flowerTypes)
      .filter(color => roundTarget[color])
      .map(color => makeCount(color, roundTarget[color])));
  }
  renderProgress();
  showFeedback("");
  displayTime(ROUND_SECONDS);
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
  renderPause();
  playVoice(rounds[roundIndex].voice);
  if (hedgehogs.pace) requestMotion();
}

function launchRound(index) {
  roundIndex = index;
  prepareRound();
  startRound();
}

function retryAttempt(message, clip) {
  resetField();
  restartClock();
  showFeedback(message);
  playVoice(clip);
  if (hedgehogs.pace) requestMotion();
}

function checkTime(now = performance.now()) {
  if (phase !== "playing" || pausedAt !== null) return false;
  if (feedbackExpires && now >= feedbackExpires) showFeedback("");
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
  if (flower.queued || flower.collected || deliveryPending || startledUntil) return;
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
  if (deliveryPending || startledUntil || !checkTime()) return;
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

function matchesRoundGoal(round) {
  if (round.leaveOnMeadow) return basket.length === flowers.length - round.leaveOnMeadow;
  const counts = countColors(basket);
  const target = Object.entries(roundTarget);
  if (round.goal === "one-color") {
    return target.some(([color, count]) => basket.length === count && counts[color] === count);
  }
  return basket.length === target.reduce((sum, [, count]) => sum + count, 0)
    && target.every(([color, count]) => counts[color] === count);
}

function deliver() {
  const round = rounds[roundIndex];
  if (matchesRoundGoal(round)) {
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
  const moved = target.x !== player.x || target.y !== player.y;
  Object.assign(player, target);
  return moved;
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
    return moveBy(delta.x * step / distance, delta.y * step / distance);
  }
  if (Math.abs(delta.x) > 1) player.direction = Math.sign(delta.x);
  Object.assign(player, destination);
  activeMove = null;
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
  return moveBy(dx * step / magnitude, dy * step / magnitude);
}

function movePlayer(now) {
  motionFrame = 0;
  if (!checkTime(now)) return;
  const elapsed = lastFrameTime ? Math.min(now - lastFrameTime, 40) / 1000 : 1 / 60;
  lastFrameTime = now;
  const speed = Math.max(395, meadowSize.width * .9) * .576;
  if (hedgehogs.pace) hedgehogs.advance(elapsed, meadowSize);
  if (startledUntil && now >= startledUntil) clearReaction();

  let running = false;
  if (!startledUntil) {
    const playerBefore = { x: player.x, y: player.y };
    activeMove ??= moves.shift();
    const move = activeMove;
    running = move ? followMove(move, speed * elapsed) : followKeys(speed * .7 * elapsed);
    if (hedgehogs.pace && now >= collisionGraceUntil && hedgehogs.crossed(playerBefore, player, meadowSize)) {
      hitHedgehog(now);
      running = false;
    } else if (move && !activeMove) {
      if (move.kind === "pick") collect(move.flower);
      if (move.kind === "deliver") deliver();
    }
  }
  renderPlayer(running, elapsed);

  if (phase === "playing" && (hedgehogs.pace || activeMove || moves.length || keysHeld.size)) {
    requestMotion();
  } else {
    lastFrameTime = 0;
  }
}

function hitHedgehog(now) {
  clearMoves();
  startledUntil = now + 650;
  collisionGraceUntil = now + 1750;
  girl.classList.add("is-startled");
  droppedFlowers.style.left = `${player.x}%`;
  droppedFlowers.style.top = `${player.y}%`;
  droppedFlowers.replaceChildren(...basket.map((color, index) => {
    const flower = new Image();
    flower.src = flowerImages[color].whole;
    flower.alt = "";
    const spread = (index % 7 - 3) * 15 + (index % 3) * 5;
    flower.style.setProperty("--drop-x", `${spread}px`);
    flower.style.setProperty("--drop-y", `${index % 3 * 6 - 7}px`);
    flower.style.setProperty("--drop-angle", `${spread * 2.4}deg`);
    return flower;
  }));
  basket = [];
  for (const flower of flowers) {
    flower.queued = false;
    flower.button.classList.remove("is-queued");
  }
  renderBasket();
  renderAction();
  showFeedback("Ой-й-й! Все цветы упали! Попробую ещё раз!");
  playVoice("flowers-fell");
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
  completedRounds.add(roundIndex);
  renderProgress();
  renderPause();
  const last = roundIndex === rounds.length - 1;
  celebrationMessage.textContent = completedRounds.size === rounds.length
    ? "Все девять букетов собраны!"
    : "Ты собрала нужный букет.";
  nextRound.firstElementChild.textContent = last ? "Играть снова" : "Следующий раунд";
  nextRound.lastElementChild.className = last ? "icon icon-restart" : "icon icon-arrow";
  nextRound.setAttribute("aria-disabled", "true");
  celebrationMom.classList.remove("is-hugging");
  bouquet.replaceChildren(...basket.map((color, index) => {
    const blossom = new Image();
    const fan = basket.length > 1 ? index / (basket.length - 1) * 2 - 1 : 0;
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
    playThanks();
  }, reducedMotion.matches ? 100 : 400);
}

function playThanks() {
  if (muted) {
    setTimeout(() => nextRound.setAttribute("aria-disabled", "false"), 450);
    return;
  }
  function allowNextRound() {
    clearTimeout(fallback);
    voice.removeEventListener("ended", allowNextRound);
    nextRound.setAttribute("aria-disabled", "false");
  }
  const fallback = setTimeout(allowNextRound, 7000);
  voice.addEventListener("ended", allowNextRound);
  playRecording("thanks").catch(allowNextRound);
}

sound.addEventListener("click", () => {
  soundSettings.showModal();
  if (phase === "ready") voice.pause();
  syncPause();
});
soundSettings.addEventListener("close", syncPause);
soundEnabled.addEventListener("change", () => {
  muted = !soundEnabled.checked;
  if (muted) voice.pause();
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
pauseButton.addEventListener("click", togglePause);
mom.addEventListener("click", queueDelivery);
meadow.addEventListener("click", event => {
  if (event.target !== meadow || deliveryPending || startledUntil || !checkTime()) return;
  const rect = meadow.getBoundingClientRect();
  const y = (event.clientY - rect.top) / meadowSize.height * 100;
  if (y < (narrow.matches ? 39 : 42)) return;
  const x = (event.clientX - rect.left) / meadowSize.width * 100;
  moves.push({ kind: "walk", point: limitWalk(x, y) });
  requestMotion();
});

window.addEventListener("keydown", event => {
  if (soundSettings.open || phase === "celebrating" || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === "KeyP" && !event.repeat && phase === "playing") {
    event.preventDefault();
    togglePause();
    return;
  }
  if (pausedAt !== null) return;
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
  resetHedgehogs();
  renderPlayer();
});

celebration.addEventListener("cancel", event => event.preventDefault());
nextRound.addEventListener("click", () => {
  if (nextRound.getAttribute("aria-disabled") === "true") return;
  celebration.close();
  const index = (roundIndex + 1) % rounds.length;
  if (!index) completedRounds.clear();
  launchRound(index);
  meadow.focus({ preventScroll: true });
});

document.querySelector("#brand-flower").src = logoFlower;
document.querySelector('link[rel="icon"]').href = logoFlower;
measureMeadow();
prepareRound();
voice.src = recordingURL(rounds[0].voice);
