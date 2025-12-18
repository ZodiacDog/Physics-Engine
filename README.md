# Advanced Bare-Bones Physics Engine

A production-ready 2D physics engine for game development. Lightweight, efficient, and feature-complete.

## Features

- **Rigid Body Dynamics**: Full 2D physics simulation with linear and angular motion
- **Collision Detection**: Optimized broad-phase (spatial hash) and narrow-phase (SAT) algorithms
- **Multiple Shape Types**: Circles and boxes with easy extension for custom shapes
- **Constraint Solver**: Sequential impulse-based solver with warm starting
- **Spatial Partitioning**: Hash grid for efficient collision detection
- **Sleep System**: Automatic body sleeping for performance optimization
- **Raycast Queries**: Fast raycasting for line-of-sight and projectiles
- **Contact Caching**: Warm starting for stable stacking and better performance

## Quick Start

### Basic Setup

```javascript
// Import the engine
const { Vec2, RigidBody, CircleShape, BoxShape, PhysicsWorld } = require('./PhysicsEngine');

// Create a physics world
const world = new PhysicsWorld({
  gravity: new Vec2(0, 9.81),  // Gravity vector (pixels/s²)
  iterations: 10,              // Solver iterations (higher = more accurate)
  cellSize: 50,                // Spatial hash cell size
  enableSleeping: true         // Enable automatic body sleeping
});

// Create a static ground
const ground = new RigidBody({
  position: new Vec2(400, 550),
  isStatic: true,
  shape: new BoxShape(800, 50),
  restitution: 0.3,
  friction: 0.5
});
world.addBody(ground);

// Create a dynamic box
const box = new RigidBody({
  position: new Vec2(400, 100),
  rotation: 0.3,
  mass: 1,
  inertia: 1,
  shape: new BoxShape(50, 50),
  restitution: 0.5,
  friction: 0.4
});
world.addBody(box);

// Game loop
function update(dt) {
  world.step(dt);  // Update physics
  
  // Render your bodies here
  for (const body of world.bodies) {
    renderBody(body);
  }
}
```

## API Reference

### PhysicsWorld

Main physics simulation container.

**Constructor Options:**
- `gravity`: Vec2 - Gravity acceleration (default: `Vec2(0, 9.81)`)
- `iterations`: number - Constraint solver iterations (default: `10`)
- `cellSize`: number - Spatial hash cell size (default: `50`)
- `enableSleeping`: boolean - Enable body sleeping (default: `true`)

**Methods:**
- `addBody(body)` - Add a rigid body to the world
- `removeBody(body)` - Remove a rigid body from the world
- `step(dt)` - Advance simulation by delta time (handles fixed timestep internally)
- `query(point, radius)` - Find all bodies near a point
- `raycast(origin, direction, maxDistance)` - Cast a ray and return closest hit

### RigidBody

Represents a physical object in the simulation.

**Constructor Options:**
- `position`: Vec2 - Initial position (default: `Vec2(0, 0)`)
- `rotation`: number - Initial rotation in radians (default: `0`)
- `velocity`: Vec2 - Initial velocity (default: `Vec2(0, 0)`)
- `angularVelocity`: number - Initial angular velocity (default: `0`)
- `mass`: number - Body mass (default: `1`)
- `inertia`: number - Rotational inertia (default: `1`)
- `restitution`: number - Bounciness 0-1 (default: `0.5`)
- `friction`: number - Surface friction (default: `0.3`)
- `linearDamping`: number - Velocity damping 0-1 (default: `0.99`)
- `angularDamping`: number - Angular velocity damping 0-1 (default: `0.98`)
- `shape`: Shape - Collision shape (required)
- `isStatic`: boolean - Static bodies don't move (default: `false`)
- `userData`: object - Custom data storage (default: `{}`)

**Methods:**
- `applyForce(force, point)` - Apply a force (accumulated over frame)
- `applyImpulse(impulse, point)` - Apply an immediate impulse
- `getVelocityAtPoint(point)` - Get velocity at a specific point on the body
- `wakeUp()` - Wake sleeping body

**Properties:**
- `position`: Vec2 - Current position
- `rotation`: number - Current rotation
- `velocity`: Vec2 - Linear velocity
- `angularVelocity`: number - Angular velocity
- `isSleeping`: boolean - Whether body is sleeping

### Shapes

#### CircleShape

```javascript
const circle = new CircleShape(radius);
```

#### BoxShape

```javascript
const box = new BoxShape(width, height);
```

**Shape Methods:**
- `computeMassProperties(density)` - Calculate mass and inertia from density
- `getAABB(body)` - Get axis-aligned bounding box

### Vec2

2D vector math utilities.

**Constructor:**
```javascript
const v = new Vec2(x, y);
```

**Methods:**
- `add(v)` - Vector addition
- `sub(v)` - Vector subtraction
- `scale(s)` - Scalar multiplication
- `dot(v)` - Dot product
- `cross(v)` - 2D cross product (returns scalar)
- `length()` - Vector magnitude
- `lengthSq()` - Squared magnitude (faster)
- `normalize()` - Unit vector
- `perp()` - Perpendicular vector

## Integration Examples

### Canvas Rendering

```javascript
function renderBody(ctx, body) {
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.rotation);
  
  if (body.shape.type === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, body.shape.radius, 0, Math.PI * 2);
    ctx.fillStyle = body.isSleeping ? '#666' : '#00f';
    ctx.fill();
  } else if (body.shape.type === 'box') {
    ctx.fillStyle = body.isSleeping ? '#666' : '#f00';
    ctx.fillRect(
      -body.shape.halfWidth,
      -body.shape.halfHeight,
      body.shape.width,
      body.shape.height
    );
  }
  
  ctx.restore();
}
```

### Character Controller

```javascript
class Player {
  constructor(world, x, y) {
    this.body = new RigidBody({
      position: new Vec2(x, y),
      mass: 1,
      shape: new CircleShape(20),
      friction: 0.8
    });
    world.addBody(this.body);
  }
  
  update(input) {
    const moveForce = 300;
    const jumpImpulse = 500;
    
    if (input.left) {
      this.body.applyForce(new Vec2(-moveForce, 0));
    }
    if (input.right) {
      this.body.applyForce(new Vec2(moveForce, 0));
    }
    if (input.jump && this.isGrounded()) {
      this.body.applyImpulse(new Vec2(0, -jumpImpulse));
    }
  }
  
  isGrounded() {
    // Raycast down to check if on ground
    const origin = this.body.position.add(new Vec2(0, 20));
    const result = world.raycast(origin, new Vec2(0, 1), 5);
    return result !== null;
  }
}
```

### Explosion Effect

```javascript
function createExplosion(world, center, radius, force) {
  const bodies = world.query(center, radius);
  
  for (const body of bodies) {
    if (body.isStatic) continue;
    
    const dir = body.position.sub(center).normalize();
    const dist = body.position.sub(center).length();
    const falloff = 1 - (dist / radius);
    
    body.applyImpulse(dir.scale(force * falloff));
    body.wakeUp();
  }
}
```

### Projectile System

```javascript
class Projectile {
  constructor(world, position, velocity) {
    this.body = new RigidBody({
      position: position,
      velocity: velocity,
      mass: 0.1,
      shape: new CircleShape(5),
      restitution: 0.6
    });
    world.addBody(this.body);
    this.lifetime = 5; // seconds
  }
  
  update(dt) {
    this.lifetime -= dt;
    return this.lifetime > 0;
  }
}
```

## Performance Optimization

### Tuning Parameters

**Spatial Hash Cell Size:**
```javascript
// Optimal: slightly larger than average body size
const world = new PhysicsWorld({ cellSize: 64 });
```

**Solver Iterations:**
```javascript
// More iterations = more accurate but slower
// 10 is good balance for most games
const world = new PhysicsWorld({ iterations: 10 });
```

**Enable Sleeping:**
```javascript
// Disable for very dynamic scenes
const world = new PhysicsWorld({ enableSleeping: false });
```

### Best Practices

1. **Use static bodies for immovable objects** - They skip integration and are cheaper to process

2. **Batch body creation** - Create all bodies before starting simulation

3. **Limit collision checks** - Use spatial queries to limit what can collide

4. **Adjust cell size** - Match to your game's scale for optimal spatial hashing

5. **Profile your game** - Use browser devtools to identify bottlenecks

6. **Consider body count** - 200-500 active bodies is reasonable for 60fps

### Memory Management

```javascript
// Reuse bodies instead of creating/destroying
const bodyPool = [];

function getBody() {
  return bodyPool.pop() || new RigidBody({ /* config */ });
}

function releaseBody(body) {
  world.removeBody(body);
  body.velocity = Vec2.zero();
  bodyPool.push(body);
}
```

## Advanced Features

### Custom Shapes

Extend the collision system:

```javascript
class PolygonShape {
  constructor(vertices) {
    this.type = 'polygon';
    this.vertices = vertices;
  }
  
  getAABB(body) {
    // Calculate AABB from transformed vertices
  }
}

// Extend CollisionDetector with new detection methods
```

### Joints and Constraints

Implement distance constraints:

```javascript
class DistanceJoint {
  constructor(bodyA, bodyB, length) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.length = length;
  }
  
  solve() {
    const delta = this.bodyB.position.sub(this.bodyA.position);
    const dist = delta.length();
    const correction = (dist - this.length) / dist;
    
    const move = delta.scale(correction * 0.5);
    
    if (!this.bodyA.isStatic) {
      this.bodyA.position = this.bodyA.position.add(move);
    }
    if (!this.bodyB.isStatic) {
      this.bodyB.position = this.bodyB.position.sub(move);
    }
  }
}
```

### Triggers and Sensors

```javascript
const trigger = new RigidBody({
  position: new Vec2(400, 300),
  shape: new CircleShape(50),
  userData: { isTrigger: true }
});

// In your game loop
for (const manifold of world.contacts) {
  if (manifold.bodyA.userData.isTrigger) {
    onTriggerEnter(manifold.bodyA, manifold.bodyB);
  }
}
```

## Troubleshooting

### Bodies pass through each other
- Increase solver iterations
- Check time step isn't too large
- Verify shapes are properly sized

### Unstable stacking
- Increase restitution to add energy
- Adjust friction values
- Use position correction (enabled by default)

### Poor performance
- Reduce body count
- Increase spatial hash cell size
- Enable sleeping
- Profile to find bottlenecks

### Bodies vibrate/jitter
- Reduce restitution
- Increase damping
- Check for very small masses

## License

MIT License - Use freely in your games, commercial or otherwise.

## Contributing

This is a production-ready foundation. Extend it with:
- More shape types (polygons, capsules)
- 3D physics
- Fluid simulation
- Rope/cloth simulation
- Advanced joints (revolute, prismatic, etc.)

## Credits

Built by ML aka ZodiacDog
Physics algorithms based on industry-standard methods: Sequential Impulse, SAT, Spatial Hashing
