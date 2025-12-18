/**
 * Physics Engine Unit Tests
 * Run with: node tests.js
 */

const { Vec2, RigidBody, CircleShape, BoxShape, PhysicsWorld, CollisionDetector } = require('./PhysicsEngine');

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  assertClose(actual, expected, epsilon = 0.001, message = '') {
    if (Math.abs(actual - expected) > epsilon) {
      throw new Error(`${message}: expected ${expected}, got ${actual} (diff: ${Math.abs(actual - expected)})`);
    }
  }

  assertTrue(value, message) {
    if (!value) {
      throw new Error(`${message}: expected true, got ${value}`);
    }
  }

  assertFalse(value, message) {
    if (value) {
      throw new Error(`${message}: expected false, got ${value}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(`${message}: expected non-null value`);
    }
  }

  run() {
    console.log('🧪 Running Physics Engine Tests\n');

    for (const test of this.tests) {
      try {
        test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   ${error.message}\n`);
        this.failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Tests: ${this.tests.length}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log('='.repeat(50));

    return this.failed === 0;
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

const runner = new TestRunner();

// Vector Tests
runner.test('Vec2: Addition', () => {
  const v1 = new Vec2(1, 2);
  const v2 = new Vec2(3, 4);
  const result = v1.add(v2);
  runner.assertEqual(result.x, 4, 'x component');
  runner.assertEqual(result.y, 6, 'y component');
});

runner.test('Vec2: Subtraction', () => {
  const v1 = new Vec2(5, 7);
  const v2 = new Vec2(2, 3);
  const result = v1.sub(v2);
  runner.assertEqual(result.x, 3, 'x component');
  runner.assertEqual(result.y, 4, 'y component');
});

runner.test('Vec2: Scaling', () => {
  const v = new Vec2(2, 3);
  const result = v.scale(3);
  runner.assertEqual(result.x, 6, 'x component');
  runner.assertEqual(result.y, 9, 'y component');
});

runner.test('Vec2: Dot Product', () => {
  const v1 = new Vec2(1, 2);
  const v2 = new Vec2(3, 4);
  const result = v1.dot(v2);
  runner.assertEqual(result, 11, 'dot product');
});

runner.test('Vec2: Length', () => {
  const v = new Vec2(3, 4);
  runner.assertClose(v.length(), 5, 0.001, 'length');
});

runner.test('Vec2: Normalize', () => {
  const v = new Vec2(3, 4);
  const normalized = v.normalize();
  runner.assertClose(normalized.length(), 1, 0.001, 'normalized length');
  runner.assertClose(normalized.x, 0.6, 0.001, 'normalized x');
  runner.assertClose(normalized.y, 0.8, 0.001, 'normalized y');
});

runner.test('Vec2: Perpendicular', () => {
  const v = new Vec2(1, 0);
  const perp = v.perp();
  runner.assertEqual(perp.x, 0, 'perp x');
  runner.assertEqual(perp.y, 1, 'perp y');
});

// Rigid Body Tests
runner.test('RigidBody: Constructor Defaults', () => {
  const body = new RigidBody();
  runner.assertEqual(body.position.x, 0, 'default position x');
  runner.assertEqual(body.position.y, 0, 'default position y');
  runner.assertEqual(body.mass, 1, 'default mass');
  runner.assertFalse(body.isStatic, 'default not static');
});

runner.test('RigidBody: Static Body', () => {
  const body = new RigidBody({ isStatic: true, mass: 10 });
  runner.assertTrue(body.isStatic, 'is static');
  runner.assertEqual(body.inverseMass, 0, 'inverse mass is zero');
  runner.assertEqual(body.inverseInertia, 0, 'inverse inertia is zero');
});

runner.test('RigidBody: Apply Force', () => {
  const body = new RigidBody({ mass: 2 });
  body.applyForce(new Vec2(10, 0));
  runner.assertEqual(body.force.x, 10, 'force applied');
});

runner.test('RigidBody: Apply Impulse', () => {
  const body = new RigidBody({ mass: 2, velocity: new Vec2(0, 0) });
  body.applyImpulse(new Vec2(10, 0));
  runner.assertEqual(body.velocity.x, 5, 'velocity changed by impulse');
});

runner.test('RigidBody: Static Body Ignores Forces', () => {
  const body = new RigidBody({ isStatic: true });
  body.applyForce(new Vec2(100, 100));
  runner.assertEqual(body.force.x, 0, 'force not applied to static');
  runner.assertEqual(body.force.y, 0, 'force not applied to static');
});

// Shape Tests
runner.test('CircleShape: Mass Properties', () => {
  const circle = new CircleShape(10);
  const props = circle.computeMassProperties(1);
  runner.assertClose(props.mass, Math.PI * 100, 0.01, 'circle mass');
  runner.assertTrue(props.inertia > 0, 'circle has inertia');
});

runner.test('BoxShape: Mass Properties', () => {
  const box = new BoxShape(10, 20);
  const props = box.computeMassProperties(1);
  runner.assertEqual(props.mass, 200, 'box mass');
  runner.assertTrue(props.inertia > 0, 'box has inertia');
});

runner.test('CircleShape: AABB', () => {
  const circle = new CircleShape(10);
  const body = new RigidBody({ position: new Vec2(50, 50), shape: circle });
  const aabb = circle.getAABB(body);
  runner.assertEqual(aabb.min.x, 40, 'AABB min x');
  runner.assertEqual(aabb.min.y, 40, 'AABB min y');
  runner.assertEqual(aabb.max.x, 60, 'AABB max x');
  runner.assertEqual(aabb.max.y, 60, 'AABB max y');
});

// Collision Detection Tests
runner.test('Collision: Circle-Circle Collision', () => {
  const bodyA = new RigidBody({
    position: new Vec2(0, 0),
    shape: new CircleShape(10)
  });
  const bodyB = new RigidBody({
    position: new Vec2(15, 0),
    shape: new CircleShape(10)
  });
  
  const manifold = CollisionDetector.detect(bodyA, bodyB);
  runner.assertNotNull(manifold, 'collision detected');
  runner.assertClose(manifold.penetration, 5, 0.01, 'penetration depth');
});

runner.test('Collision: Circle-Circle No Collision', () => {
  const bodyA = new RigidBody({
    position: new Vec2(0, 0),
    shape: new CircleShape(10)
  });
  const bodyB = new RigidBody({
    position: new Vec2(30, 0),
    shape: new CircleShape(10)
  });
  
  const manifold = CollisionDetector.detect(bodyA, bodyB);
  runner.assertEqual(manifold, null, 'no collision');
});

runner.test('Collision: Box-Box Collision', () => {
  const bodyA = new RigidBody({
    position: new Vec2(0, 0),
    shape: new BoxShape(20, 20)
  });
  const bodyB = new RigidBody({
    position: new Vec2(15, 0),
    shape: new BoxShape(20, 20)
  });
  
  const manifold = CollisionDetector.detect(bodyA, bodyB);
  runner.assertNotNull(manifold, 'collision detected');
  runner.assertTrue(manifold.penetration > 0, 'positive penetration');
});

runner.test('Collision: Box-Box No Collision', () => {
  const bodyA = new RigidBody({
    position: new Vec2(0, 0),
    shape: new BoxShape(20, 20)
  });
  const bodyB = new RigidBody({
    position: new Vec2(40, 0),
    shape: new BoxShape(20, 20)
  });
  
  const manifold = CollisionDetector.detect(bodyA, bodyB);
  runner.assertEqual(manifold, null, 'no collision');
});

// Physics World Tests
runner.test('World: Add and Remove Body', () => {
  const world = new PhysicsWorld();
  const body = new RigidBody();
  
  world.addBody(body);
  runner.assertEqual(world.bodies.length, 1, 'body added');
  
  world.removeBody(body);
  runner.assertEqual(world.bodies.length, 0, 'body removed');
});

runner.test('World: Gravity Application', () => {
  const world = new PhysicsWorld({ gravity: new Vec2(0, 10) });
  const body = new RigidBody({
    position: new Vec2(0, 0),
    mass: 1,
    shape: new CircleShape(10)
  });
  world.addBody(body);
  
  const initialY = body.position.y;
  world.step(1 / 60);
  
  runner.assertTrue(body.position.y > initialY, 'body fell under gravity');
});

runner.test('World: Static Body Stays Put', () => {
  const world = new PhysicsWorld({ gravity: new Vec2(0, 100) });
  const body = new RigidBody({
    position: new Vec2(0, 0),
    isStatic: true,
    shape: new CircleShape(10)
  });
  world.addBody(body);
  
  const initialY = body.position.y;
  world.step(1 / 60);
  
  runner.assertEqual(body.position.y, initialY, 'static body did not move');
});

runner.test('World: Simple Collision Response', () => {
  const world = new PhysicsWorld({ gravity: new Vec2(0, 0) });
  
  // Ground
  const ground = new RigidBody({
    position: new Vec2(0, 100),
    isStatic: true,
    shape: new BoxShape(200, 20)
  });
  world.addBody(ground);
  
  // Falling box
  const box = new RigidBody({
    position: new Vec2(0, 50),
    velocity: new Vec2(0, 100),
    mass: 1,
    shape: new BoxShape(20, 20),
    restitution: 0
  });
  world.addBody(box);
  
  // Simulate
  for (let i = 0; i < 60; i++) {
    world.step(1 / 60);
  }
  
  // Box should have stopped on ground
  runner.assertClose(box.velocity.y, 0, 10, 'box stopped falling');
});

runner.test('World: Raycast Hit', () => {
  const world = new PhysicsWorld();
  const body = new RigidBody({
    position: new Vec2(50, 50),
    shape: new BoxShape(20, 20)
  });
  world.addBody(body);
  
  const origin = new Vec2(0, 50);
  const direction = new Vec2(1, 0);
  const result = world.raycast(origin, direction, 100);
  
  runner.assertNotNull(result, 'raycast hit body');
  runner.assertEqual(result.body, body, 'hit correct body');
});

runner.test('World: Raycast Miss', () => {
  const world = new PhysicsWorld();
  const body = new RigidBody({
    position: new Vec2(50, 50),
    shape: new BoxShape(20, 20)
  });
  world.addBody(body);
  
  const origin = new Vec2(0, 0);
  const direction = new Vec2(0, -1);
  const result = world.raycast(origin, direction, 100);
  
  runner.assertEqual(result, null, 'raycast missed');
});

runner.test('World: Query Bodies', () => {
  const world = new PhysicsWorld();
  
  const body1 = new RigidBody({
    position: new Vec2(50, 50),
    shape: new CircleShape(10)
  });
  const body2 = new RigidBody({
    position: new Vec2(55, 55),
    shape: new CircleShape(10)
  });
  const body3 = new RigidBody({
    position: new Vec2(200, 200),
    shape: new CircleShape(10)
  });
  
  world.addBody(body1);
  world.addBody(body2);
  world.addBody(body3);
  
  const results = world.query(new Vec2(50, 50), 20);
  
  runner.assertEqual(results.length, 2, 'found nearby bodies');
  runner.assertTrue(results.includes(body1), 'found body1');
  runner.assertTrue(results.includes(body2), 'found body2');
  runner.assertFalse(results.includes(body3), 'did not find distant body');
});

// Integration Tests
runner.test('Integration: Conservation of Momentum', () => {
  const world = new PhysicsWorld({ gravity: new Vec2(0, 0) });
  
  const bodyA = new RigidBody({
    position: new Vec2(0, 0),
    velocity: new Vec2(100, 0),
    mass: 1,
    shape: new CircleShape(10),
    restitution: 1.0,
    friction: 0
  });
  
  const bodyB = new RigidBody({
    position: new Vec2(50, 0),
    velocity: new Vec2(-100, 0),
    mass: 1,
    shape: new CircleShape(10),
    restitution: 1.0,
    friction: 0
  });
  
  world.addBody(bodyA);
  world.addBody(bodyB);
  
  const initialMomentum = bodyA.velocity.x * bodyA.mass + bodyB.velocity.x * bodyB.mass;
  
  // Simulate until after collision
  for (let i = 0; i < 120; i++) {
    world.step(1 / 60);
  }
  
  const finalMomentum = bodyA.velocity.x * bodyA.mass + bodyB.velocity.x * bodyB.mass;
  
  runner.assertClose(finalMomentum, initialMomentum, 1, 'momentum conserved');
});

runner.test('Integration: Restitution Test', () => {
  const world = new PhysicsWorld({ gravity: new Vec2(0, 980) });
  
  const ground = new RigidBody({
    position: new Vec2(0, 500),
    isStatic: true,
    shape: new BoxShape(1000, 20),
    restitution: 1.0
  });
  world.addBody(ground);
  
  const ball = new RigidBody({
    position: new Vec2(0, 100),
    velocity: new Vec2(0, 0),
    mass: 1,
    shape: new CircleShape(10),
    restitution: 1.0
  });
  world.addBody(ball);
  
  const initialHeight = ball.position.y;
  
  // Let ball fall and bounce
  for (let i = 0; i < 240; i++) {
    world.step(1 / 60);
  }
  
  // With perfect restitution, ball should return close to initial height
  // (Some energy loss is expected due to numerical integration)
  runner.assertTrue(Math.abs(ball.position.y - initialHeight) < 50, 
    'ball bounced back with restitution');
});

runner.test('Integration: Sleeping System', () => {
  const world = new PhysicsWorld({ 
    gravity: new Vec2(0, 100),
    enableSleeping: true 
  });
  
  const ground = new RigidBody({
    position: new Vec2(0, 500),
    isStatic: true,
    shape: new BoxShape(1000, 20)
  });
  world.addBody(ground);
  
  const box = new RigidBody({
    position: new Vec2(0, 400),
    mass: 1,
    shape: new BoxShape(20, 20)
  });
  world.addBody(box);
  
  // Simulate until box settles
  for (let i = 0; i < 300; i++) {
    world.step(1 / 60);
  }
  
  runner.assertTrue(box.isSleeping, 'box went to sleep');
});

// Run all tests
const success = runner.run();
process.exit(success ? 0 : 1);
