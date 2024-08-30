const eps = 1e-6;
const nearClippingPlane = 0.25;
const farClippingPlane = 10.0
const fov = Math.PI*0.5
const resol = 400;
const player_speed = 2;

class Color {
  r: number;
  g: number;
  b: number;
  a: number;
  constructor(r:number,g:number,b:number,a:number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  tostring(): string {
     return `rgba(`
       + `${Math.floor(this.r*255)},`
       + `${Math.floor(this.g*255)},`
       + `${Math.floor(this.b*255)},`
       + `${this.a})`
  }
  brightness(factor: number): Color {
    return new Color(factor*this.r, factor*this.g, factor*this.b, this.a);
  }
  static red(): Color {return new Color(1,0,0,1);}
  static green(): Color {return new Color(0,1,0,1);}
  static blue(): Color {return new Color(0,0,1,1);}
  static yellow(): Color {return new Color(1,1,0,1);}
  static purple(): Color {return new Color(1,0,1,1);}
  static cyan(): Color {return new Color(0,1,1,1);}
}

class vec2 {
  x: number;
  y: number;

  constructor(x:number, y:number) {
    this.x = x;
    this.y = y;
  }
  static zero(): vec2 {
    return new vec2(0, 0);
  }
  static fromangle(angle: number): vec2 {
    return new vec2(Math.cos(angle), Math.sin(angle));
  }
  add(that: vec2): vec2 {
    return new vec2(this.x+that.x, this.y+that.y);
  }
  sub(that: vec2): vec2 {
    return new vec2(this.x-that.x, this.y-that.y);
  }
  div(that: vec2): vec2 {
    return new vec2(this.x/that.x, this.y/that.y);
  }
  mul(that: vec2):vec2 {
    return new vec2(that.x*this.x, that.y*this.y);
  }
  length(): number {
    return Math.sqrt(this.x*this.x + this.y*this.y)
  }
  norm(): vec2 {
    const one = this.length();
    if (one === 0) return new vec2(0,0);
    return new vec2(this.x/one, this.y/one);
  }
  scale(value: number): vec2 {
    return new vec2(this.x*value, this.y*value)
  }
  rot90(): vec2 {
    return new vec2(-this.y, this.x);
  }
  lerp(that: vec2, t: number): vec2 {
    return that.sub(this).scale(t).add(this);
  }
  dot(that: vec2):number {
    return this.x*that.x + this.y*that.y;
  }
  sqrlen(): number {
    return (this.x*this.x + this.y*this.y)
  }
  squaredist(that: vec2) {
    return that.sub(this).sqrlen();
  }
  array(): [number, number] {
    return [this.x, this.y];
  }
}

function fillcircle(ctx: CanvasRenderingContext2D, center: vec2, radius: number) {
  ctx.fillStyle = "purple"
  ctx.beginPath();
  ctx.arc(...center.array(), radius, 0, 2*Math.PI)
  ctx.fill();
}

function strokeline(ctx: CanvasRenderingContext2D, p1: vec2, p2: vec2) {
  ctx.beginPath();
  ctx.moveTo(...p1.array());
  ctx.lineTo(...p2.array());
  ctx.stroke();
}

function snap(x: number, dx:number): number {
  if (dx > 0) return Math.ceil(x + Math.sign(dx)*eps);
  if (dx < 0) return Math.floor(x + Math.sign(dx)*eps );
  return x;
}

function hitcell(p1: vec2, p2: vec2): vec2 {
  const d = p2.sub(p1);
  return new vec2(Math.floor(p2.x + Math.sign(d.x)*eps),
                  Math.floor(p2.y + Math.sign(d.y)*eps));
}

function raystep(p1: vec2, p2: vec2): vec2 {

  const d = p2.sub(p1);
  let p3 = p2
  if (d.x != 0) {
    const k = d.y/d.x;
    const c = p1.y - k*p1.x;
    {
      const x3 = snap(p2.x, d.x);
      const y3 = x3 * k + c;
      p3 = new vec2(x3,y3);
    }

    if (k !== 0) {
      const y3 = snap(p2.y, d.y);
      const x3 = (y3 - c)/k;
      let p3t = new vec2(x3,y3)
      if (p2.squaredist(p3t) < p2.squaredist(p3)) {
        p3 = p3t;
      }
    }
  } else {
    const y3 = snap(p2.y, d.y);
    const x3 = p2.x
    p3 = new vec2(x3, y3);
  }

  return p3;
}

function castray(scene: Scene, p1: vec2, p2: vec2): vec2 {
  let start = p1;
  while (start.squaredist(p1) < farClippingPlane**2) {
    const c = hitcell(p1,p2);
    if(insidescene(scene, c) && scene[c.y][c.x] !== null) break;
    const p3 = raystep(p1,p2);
    p1 = p2;
    p2 = p3;
  }
  return p2;
}

function canvassize(ctx: CanvasRenderingContext2D): vec2 {
  return new vec2(ctx.canvas.width, ctx.canvas.height);
}

type Scene = Array<Array<Color | null>>;

function scenesize(scene: Scene): vec2 {
  const y = scene.length;
  let x = Number.MIN_VALUE;
  for (let row of scene) {
    x = Math.max(x, row.length);
  }
  return new vec2(x,y);
}

function insidescene(scene: Scene, p: vec2):boolean {
  const size = scenesize(scene)
  return 0 <= p.x && p.x < size.x && 0 <= p.y && p.y < size.y ;
}

class Player {
  position: vec2;
  direction: number;
  constructor(position: vec2, direction: number) {
    this.position = position;
    this.direction = direction;
  }
  fov(): [vec2, vec2] {
    const l = Math.tan(fov*0.5)*nearClippingPlane;
    let p = this.position.add(vec2.fromangle(this.direction).scale(nearClippingPlane));
    const p1 = p.sub(p.sub(this.position).rot90().norm().scale(l));
    const p2 = p.add(p.sub(this.position).rot90().norm().scale(l));
    return [p1, p2]
  }
}

function renderminimap(ctx: CanvasRenderingContext2D, player: Player , position: vec2, size: vec2, scene: Scene) {
  ctx.save();

  const gridsize = scenesize(scene)

  ctx.translate(...position.array());
  ctx.scale(...size.div(gridsize).array());

  ctx.fillStyle = "#181818";
  ctx.fillRect(0,0,...gridsize.array());

  ctx.lineWidth = 0.06;

  for (let y = 0; y < gridsize.y; y++) {
    for(let x = 0; x < gridsize.x; x++) {
      const color = scene[y][x];
      if (color !== null) {
        ctx.fillStyle = color.tostring();
        ctx.fillRect(x,y,1,1);
      }
    }
  }

  ctx.strokeStyle = "#303030"
  for (let i = 0; i <= gridsize.x; i++){
    strokeline(ctx, new vec2(i,0), new vec2(i,gridsize.y))
  }
  for (let i = 0; i <= gridsize.y; i++){
    strokeline(ctx, new vec2(0,i), new vec2(gridsize.x, i))
  }

  ctx.fillStyle = "purple"
  fillcircle(ctx, player.position, 0.2)

  const [p1,p2] = player.fov();

  ctx.strokeStyle = "purple"
  strokeline(ctx, p1, p2)
  strokeline(ctx, player.position, p1)
  strokeline(ctx, player.position, p2)

  ctx.restore();
}

function renderscene(ctx: CanvasRenderingContext2D, player: Player, scene: Scene) {
  const stripwidth = Math.ceil(ctx.canvas.width/resol);
  const [r1,r2] = player.fov();

  for (let x = 0; x < resol; ++x) {
    const p = castray(scene, player.position, r1.lerp(r2, x/resol))
    const c = hitcell(player.position, p)

    if (insidescene(scene, c)) {
      const color = scene[c.y][c.x];
      if (color !== null) {
        const v = p.sub(player.position);
        const d = vec2.fromangle(player.direction);

        const stripheight = ctx.canvas.height/v.dot(d);
        ctx.fillStyle = color.brightness(1/v.dot(d)).tostring();
        ctx.fillRect(x*stripwidth, (ctx.canvas.height - stripheight)*0.5
                     , stripwidth, stripheight);
      }
    }
  }
}


function rendergame(ctx: CanvasRenderingContext2D, player: Player, scene: Scene) {
  const minimappos = vec2.zero().add(canvassize(ctx).scale(0.02));
  const cellsize = ctx.canvas.width*0.02
  const minimapsize = scenesize(scene).scale(cellsize);

  ctx.fillStyle = "#181818";
  ctx.fillRect(0,0, ctx.canvas.width, ctx.canvas.height);

  renderscene(ctx, player, scene);
  renderminimap(ctx, player, minimappos, minimapsize, scene);
}

(() => {
  const game = document.getElementById("game") as (HTMLCanvasElement | null);
  if (game === null ) throw new Error("no game found ");
  const ctx = game.getContext("2d");
  if (ctx === null ) throw new Error("2d ctx is not supported");

  const factor = 100;
  game.width = 16*factor;
  game.height = 9*factor;

  let scene = [
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, Color.cyan(), Color.purple(), null, null, null, null, null],
    [null, null, null, null, Color.yellow(), null, null, null, null, null],
    [null, null, Color.red(), Color.green(), Color.blue(), null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null], 
  ]

  const player = new Player(scenesize(scene).mul( new vec2(0.63, 0.63)),
                            Math.PI*1.25);
  let movingforward = false;
  let movingback = false;
  let turningright = false;
  let turningleft = false;

  window.addEventListener("keydown", (e) => {
    switch (e.code) {
      case 'KeyW': movingforward  = true; break;
      case 'KeyS': movingback     = true; break;
      case 'KeyA': turningleft    = true; break; 
      case 'KeyD': turningright   = true; break; 
    }
  });
  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case 'KeyW': movingforward = false; break;
      case 'KeyS': movingback    = false; break;
      case 'KeyA': turningleft   = false; break; 
      case 'KeyD': turningright  = false; break; 
    }
  });
  
  let prevtime: number = 0;
  const frame = (timestamp: number) => {
    const delta = (timestamp - prevtime)/1000;
    prevtime = timestamp;
    let player_velocity = vec2.zero();
    let angular_velocity:number = 0.0;

    if (movingforward) {
      player_velocity = player_velocity.add(vec2.fromangle(player.direction).scale(player_speed));
    }
    if (movingback) {
      player_velocity = player_velocity.sub(vec2.fromangle(player.direction).scale(player_speed));
    }
    if (turningleft) {
      angular_velocity -= Math.PI;
    }
    if (turningright) {
      angular_velocity += Math.PI;
    }
    player.direction = player.direction + angular_velocity*delta;
    player.position = player.position.add(player_velocity.scale(delta));

    rendergame(ctx, player, scene);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame( (timestamp) => {
    prevtime = timestamp;
    window.requestAnimationFrame(frame);
  });

  rendergame(ctx, player, scene);
})()
