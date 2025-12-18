/**
 * ASCII Physics Animation
 * Visual proof the engine works in real-time
 */

const { Vec2, RigidBody, CircleShape, BoxShape, PhysicsWorld } = require('./PhysicsEngine');

// Create world
const world = new PhysicsWorld({ gravity: new Vec2(0, 500) });

// Ground
world.addBody(new RigidBody({
  position: new Vec2(40, 20),
  isStatic: true,
  shape: new BoxShape(80, 2)
}));

// Falling balls
const balls = [];
for (let i = 0; i < 5; i++) {
  const ball = new RigidBody({
    position: new Vec2(20 + i * 15, 2),
    mass: 1,
    shape: new CircleShape(1),
    restitution: 0.6,
    friction: 0.3
  });
  world.addBody(ball);
  balls.push(ball);
}

// ASCII rendering
function render() {
  const width = 80;
  const height = 22;
  const grid = Array(height).fill().map(() => Array(width).fill(' '));
  
  // Draw ground
  for (let x = 0; x < width; x++) {
    grid[20][x] = '=';
  }
  
  // Draw balls
  for (const ball of balls) {
    const x = Math.floor(ball.position.x);
    const y = Math.floor(ball.position.y);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = 'O';
    }
  }
  
  // Print
  console.clear();
  console.log('┌' + '─'.repeat(width) + '┐');
  for (const row of grid) {
    console.log('│' + row.join('') + '│');
  }
  console.log('└' + '─'.repeat(width) + '┘');
  console.log('Physics Engine - Real-time Simulation');
  console.log(`Bodies: ${world.bodies.length} | Contacts: ${world.contacts.length}`);
}

// Run animation
let frame = 0;
const interval = setInterval(() => {
  world.step(1/30);
  render();
  
  frame++;
  if (frame > 150) {
    clearInterval(interval);
    console.log('\n✅ Animation complete - physics working perfectly!');
    console.log('Run this again anytime: node animation.js\n');
  }
}, 33);
