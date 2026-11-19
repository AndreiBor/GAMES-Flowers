const wideTrail = [[24, 58], [43, 76], [65, 57], [74, 81], [51, 91], [31, 77]];
const phoneTrail = [[27, 65], [45, 86], [67, 62], [79, 82], [57, 94], [28, 87]];

export function groundLayer(y) {
  return Math.floor(y * 100);
}

export class Hedgehogs {
  constructor(spriteBed, spriteTemplate, mushroomBed) {
    this.spriteBed = spriteBed;
    this.spriteTemplate = spriteTemplate;
    this.mushroomBed = mushroomBed;
    this.actors = [];
  }

  reset(pace, count, compact, size) {
    this.pace = pace;
    this.distance = 0;
    this.length = 0;
    this.actors = Array.from({ length: count }, (_, index) => {
      const sprite = this.spriteTemplate.content.firstElementChild.cloneNode(true);
      if (index) sprite.removeAttribute("id");
      return { sprite, spacing: index / count, stride: index / count * 2 * Math.PI };
    });
    this.spriteBed.replaceChildren(...this.actors.map(actor => actor.sprite));

    this.trail = count ? (compact ? phoneTrail : wideTrail).map(([x, y]) => ({ x, y })) : [];
    this.mushrooms = this.trail.slice(1).map(({ x, y }) => {
      const mushroom = document.createElement("span");
      mushroom.className = "wood-mushroom";
      mushroom.style.left = `${x}%`;
      mushroom.style.top = `${y}%`;
      return mushroom;
    });
    this.mushroomBed.replaceChildren(...this.mushrooms);
    this.resize(size);
    for (const actor of this.actors) this.renderStride(actor);
  }

  resize({ width, height }) {
    if (!this.actors.length) return;
    const progress = this.length ? this.distance / this.length : 0;
    this.length = 0;
    this.segments = this.trail.map((from, index) => {
      const nextStop = (index + 1) % this.trail.length;
      const to = this.trail[nextStop];
      const length = Math.hypot((to.x - from.x) * width, (to.y - from.y) * height) / 100;
      this.length += length;
      return { from, to, length, end: this.length, nextStop };
    });
    this.distance = progress * this.length;
    if (this.length) for (const actor of this.actors) this.place(actor);
  }

  place(actor) {
    // Space the hedgehogs by traveled distance, including along diagonal legs.
    const distance = (this.distance + actor.spacing * this.length) % this.length;
    const { from, to, nextStop, end, length } = this.segments.find(segment => distance < segment.end);
    const fraction = 1 - (end - distance) / length;
    const x = from.x + (to.x - from.x) * fraction;
    const y = from.y + (to.y - from.y) * fraction;
    actor.position = { x, y };
    actor.nextStop = nextStop;
    actor.sprite.style.left = `${x}%`;
    actor.sprite.style.top = `${y}%`;
    actor.sprite.style.zIndex = groundLayer(y);
    actor.sprite.style.setProperty("--hedgehog-direction", Math.sign(to.x - from.x));
  }

  advance(seconds, { width }) {
    if (!this.length) return;
    const step = Math.max(26, width * .065) * this.pace * seconds;
    this.distance += step;
    if (this.distance >= this.length) {
      this.distance %= this.length;
      for (const mushroom of this.mushrooms) mushroom.hidden = false;
    }
    const strideLength = Math.min(28, Math.max(17, width * .028));
    for (const actor of this.actors) {
      const nextStop = actor.nextStop;
      actor.previous = actor.position;
      this.place(actor);
      if (nextStop && actor.nextStop !== nextStop) this.mushrooms[nextStop - 1].hidden = true;
      actor.stride = (actor.stride + step / strideLength * 2 * Math.PI) % (2 * Math.PI);
      this.renderStride(actor);
    }
  }

  renderStride({ sprite, stride }) {
    // The planted paws push backward. The rig mirrors this motion when turning.
    const swing = -Math.sin(stride);
    const lift = Math.cos(stride);
    sprite.style.setProperty("--paw-swing", `${swing * 28}deg`);
    sprite.style.setProperty("--paw-lift", `${-Math.max(0, lift) * 20}%`);
    sprite.style.setProperty("--opposite-paw-lift", `${-Math.max(0, -lift) * 20}%`);
    sprite.style.setProperty("--hedgehog-bob", `${-Math.abs(swing) * 1.7}px`);
  }

  crossed(playerBefore, playerAfter, { width, height }) {
    // Test the relative movement over the whole frame, including fast crossings.
    const radius = Math.min(26, Math.max(17, width * .03));
    return this.actors.some(({ position, previous }) => {
      if (!previous) return false;
      const x = (playerBefore.x - previous.x) * width / 100;
      const y = (playerBefore.y - previous.y) * height / 100;
      const dx = (playerAfter.x - position.x) * width / 100 - x;
      const dy = (playerAfter.y - position.y) * height / 100 - y;
      const lengthSquared = dx * dx + dy * dy;
      const closest = lengthSquared ? Math.max(0, Math.min(1, -(x * dx + y * dy) / lengthSquared)) : 0;
      return Math.hypot(x + closest * dx, y + closest * dy) <= radius;
    });
  }
}
