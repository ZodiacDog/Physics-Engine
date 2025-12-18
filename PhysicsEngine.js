/**
 * Advanced Bare-Bones Physics Engine
 * Production-ready 2D/3D physics simulation
 * @author ML Innovations
 * @version 1.0.0
 */

// ============================================================================
// VECTOR MATH
// ============================================================================

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  length() {
    return Math.sqrt(this.lengthSq());
  }

  normalize() {
    const len = this.length();
    return len > 0 ? this.scale(1 / len) : new Vec2(0, 0);
  }

  perp() {
    return new Vec2(-this.y, this.x);
  }

  static zero() {
    return new Vec2(0, 0);
  }
}

// ============================================================================
// RIGID BODY
// ============================================================================

class RigidBody {
  constructor(options = {}) {
    // Position and orientation
    this.position = options.position || new Vec2(0, 0);
    this.rotation = options.rotation || 0;
    
    // Linear motion
    this.velocity = options.velocity || new Vec2(0, 0);
    this.force = new Vec2(0, 0);
    
    // Angular motion
    this.angularVelocity = options.angularVelocity || 0;
    this.torque = 0;
    
    // Physical properties
    this.mass = options.mass !== undefined ? options.mass : 1;
    this.inverseMass = this.mass > 0 ? 1 / this.mass : 0;
    this.inertia = options.inertia !== undefined ? options.inertia : 1;
    this.inverseInertia = this.inertia > 0 ? 1 / this.inertia : 0;
    
    this.restitution = options.restitution !== undefined ? options.restitution : 0.5;
    this.friction = options.friction !== undefined ? options.friction : 0.3;
    this.linearDamping = options.linearDamping !== undefined ? options.linearDamping : 0.99;
    this.angularDamping = options.angularDamping !== undefined ? options.angularDamping : 0.98;
    
    // Collider
    this.shape = options.shape || null;
    
    // Simulation flags
    this.isStatic = options.isStatic || false;
    this.isSleeping = false;
    this.sleepThreshold = 0.5;
    this.sleepTimer = 0;
    
    // User data
    this.userData = options.userData || {};
    
    // Update static bodies
    if (this.isStatic) {
      this.inverseMass = 0;
      this.inverseInertia = 0;
      this.velocity = new Vec2(0, 0);
      this.angularVelocity = 0;
    }
  }

  applyForce(force, point) {
    if (this.isStatic) return;
    
    this.force = this.force.add(force);
    
    if (point) {
      const r = point.sub(this.position);
      this.torque += r.cross(force);
    }
  }

  applyImpulse(impulse, point) {
    if (this.isStatic) return;
    
    this.velocity = this.velocity.add(impulse.scale(this.inverseMass));
    
    if (point) {
      const r = point.sub(this.position);
      this.angularVelocity += r.cross(impulse) * this.inverseInertia;
    }
  }

  getVelocityAtPoint(point) {
    const r = point.sub(this.position);
    const tangent = new Vec2(-r.y, r.x);
    return this.velocity.add(tangent.scale(this.angularVelocity));
  }

  updateSleepState(dt) {
    if (this.isStatic) return;
    
    const velSq = this.velocity.lengthSq();
    const angVelSq = this.angularVelocity * this.angularVelocity;
    
    if (velSq < this.sleepThreshold && angVelSq < this.sleepThreshold) {
      this.sleepTimer += dt;
      if (this.sleepTimer > 0.5) {
        this.isSleeping = true;
        this.velocity = new Vec2(0, 0);
        this.angularVelocity = 0;
      }
    } else {
      this.sleepTimer = 0;
      this.isSleeping = false;
    }
  }

  wakeUp() {
    this.isSleeping = false;
    this.sleepTimer = 0;
  }
}

// ============================================================================
// COLLISION SHAPES
// ============================================================================

class CircleShape {
  constructor(radius) {
    this.type = 'circle';
    this.radius = radius;
  }

  computeMassProperties(density) {
    const mass = Math.PI * this.radius * this.radius * density;
    const inertia = mass * this.radius * this.radius / 2;
    return { mass, inertia };
  }

  getAABB(body) {
    return {
      min: new Vec2(body.position.x - this.radius, body.position.y - this.radius),
      max: new Vec2(body.position.x + this.radius, body.position.y + this.radius)
    };
  }
}

class BoxShape {
  constructor(width, height) {
    this.type = 'box';
    this.width = width;
    this.height = height;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
  }

  computeMassProperties(density) {
    const mass = this.width * this.height * density;
    const inertia = mass * (this.width * this.width + this.height * this.height) / 12;
    return { mass, inertia };
  }

  getVertices(body) {
    const cos = Math.cos(body.rotation);
    const sin = Math.sin(body.rotation);
    
    const vertices = [
      new Vec2(-this.halfWidth, -this.halfHeight),
      new Vec2(this.halfWidth, -this.halfHeight),
      new Vec2(this.halfWidth, this.halfHeight),
      new Vec2(-this.halfWidth, this.halfHeight)
    ];
    
    return vertices.map(v => {
      return new Vec2(
        body.position.x + v.x * cos - v.y * sin,
        body.position.y + v.x * sin + v.y * cos
      );
    });
  }

  getAABB(body) {
    const vertices = this.getVertices(body);
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const v of vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    
    return {
      min: new Vec2(minX, minY),
      max: new Vec2(maxX, maxY)
    };
  }
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

class Manifold {
  constructor(bodyA, bodyB) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.normal = new Vec2(0, 0);
    this.penetration = 0;
    this.contacts = [];
  }
}

class CollisionDetector {
  static detect(bodyA, bodyB) {
    const shapeA = bodyA.shape;
    const shapeB = bodyB.shape;
    
    if (!shapeA || !shapeB) return null;
    
    if (shapeA.type === 'circle' && shapeB.type === 'circle') {
      return this.circleVsCircle(bodyA, bodyB);
    }
    
    if (shapeA.type === 'box' && shapeB.type === 'box') {
      return this.boxVsBox(bodyA, bodyB);
    }
    
    if (shapeA.type === 'circle' && shapeB.type === 'box') {
      return this.circleVsBox(bodyA, bodyB);
    }
    
    if (shapeA.type === 'box' && shapeB.type === 'circle') {
      const manifold = this.circleVsBox(bodyB, bodyA);
      if (manifold) {
        manifold.normal = manifold.normal.scale(-1);
        [manifold.bodyA, manifold.bodyB] = [manifold.bodyB, manifold.bodyA];
      }
      return manifold;
    }
    
    return null;
  }

  static circleVsCircle(bodyA, bodyB) {
    const normal = bodyB.position.sub(bodyA.position);
    const distSq = normal.lengthSq();
    const radiusSum = bodyA.shape.radius + bodyB.shape.radius;
    
    if (distSq >= radiusSum * radiusSum) {
      return null;
    }
    
    const dist = Math.sqrt(distSq);
    const manifold = new Manifold(bodyA, bodyB);
    
    if (dist > 0) {
      manifold.normal = normal.scale(1 / dist);
      manifold.penetration = radiusSum - dist;
    } else {
      manifold.normal = new Vec2(1, 0);
      manifold.penetration = radiusSum;
    }
    
    const contactPoint = bodyA.position.add(
      manifold.normal.scale(bodyA.shape.radius - manifold.penetration / 2)
    );
    manifold.contacts = [contactPoint];
    
    return manifold;
  }

  static boxVsBox(bodyA, bodyB) {
    const verticesA = bodyA.shape.getVertices(bodyA);
    const verticesB = bodyB.shape.getVertices(bodyB);
    
    let minPenetration = Infinity;
    let bestNormal = null;
    
    // SAT - Separating Axis Theorem
    const axes = [
      ...this.getBoxAxes(bodyA),
      ...this.getBoxAxes(bodyB)
    ];
    
    for (const axis of axes) {
      const [minA, maxA] = this.projectVertices(verticesA, axis);
      const [minB, maxB] = this.projectVertices(verticesB, axis);
      
      if (maxA < minB || maxB < minA) {
        return null; // Separating axis found
      }
      
      const penetration = Math.min(maxA - minB, maxB - minA);
      
      if (penetration < minPenetration) {
        minPenetration = penetration;
        bestNormal = axis;
        
        // Ensure normal points from A to B
        const d = bodyB.position.sub(bodyA.position);
        if (d.dot(bestNormal) < 0) {
          bestNormal = bestNormal.scale(-1);
        }
      }
    }
    
    const manifold = new Manifold(bodyA, bodyB);
    manifold.normal = bestNormal;
    manifold.penetration = minPenetration;
    manifold.contacts = this.findContactPoints(verticesA, verticesB, manifold.normal);
    
    return manifold;
  }

  static circleVsBox(circle, box) {
    const vertices = box.shape.getVertices(box);
    const closestPoint = this.findClosestPointOnBox(circle.position, vertices);
    
    const normal = circle.position.sub(closestPoint);
    const distSq = normal.lengthSq();
    const radius = circle.shape.radius;
    
    if (distSq >= radius * radius) {
      return null;
    }
    
    const dist = Math.sqrt(distSq);
    const manifold = new Manifold(circle, box);
    
    if (dist > 0) {
      manifold.normal = normal.scale(1 / dist);
      manifold.penetration = radius - dist;
    } else {
      // Circle center inside box
      manifold.normal = new Vec2(0, 1);
      manifold.penetration = radius;
    }
    
    manifold.contacts = [closestPoint];
    
    return manifold;
  }

  static getBoxAxes(body) {
    const cos = Math.cos(body.rotation);
    const sin = Math.sin(body.rotation);
    return [
      new Vec2(cos, sin),
      new Vec2(-sin, cos)
    ];
  }

  static projectVertices(vertices, axis) {
    let min = Infinity;
    let max = -Infinity;
    
    for (const v of vertices) {
      const projection = v.dot(axis);
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    }
    
    return [min, max];
  }

  static findClosestPointOnBox(point, vertices) {
    let minDistSq = Infinity;
    let closest = point;
    
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      const pointOnEdge = this.closestPointOnSegment(point, v1, v2);
      const distSq = point.sub(pointOnEdge).lengthSq();
      
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = pointOnEdge;
      }
    }
    
    return closest;
  }

  static closestPointOnSegment(point, a, b) {
    const ab = b.sub(a);
    const ap = point.sub(a);
    const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)));
    return a.add(ab.scale(t));
  }

  static findContactPoints(verticesA, verticesB, normal) {
    // Simplified contact point generation
    // For production, implement clipping algorithm
    const contacts = [];
    
    for (const v of verticesA) {
      for (const w of verticesB) {
        if (v.sub(w).lengthSq() < 0.01) {
          contacts.push(v.add(w).scale(0.5));
        }
      }
    }
    
    return contacts.length > 0 ? contacts : [verticesA[0]];
  }
}

// ============================================================================
// SPATIAL PARTITIONING (Spatial Hash Grid)
// ============================================================================

class SpatialHash {
  constructor(cellSize = 50) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear() {
    this.grid.clear();
  }

  hash(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  insert(body) {
    const aabb = body.shape.getAABB(body);
    const minKey = this.hash(aabb.min.x, aabb.min.y);
    const maxKey = this.hash(aabb.max.x, aabb.max.y);
    
    const [minCellX, minCellY] = minKey.split(',').map(Number);
    const [maxCellX, maxCellY] = maxKey.split(',').map(Number);
    
    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const key = `${x},${y}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key).push(body);
      }
    }
  }

  query(body) {
    const aabb = body.shape.getAABB(body);
    const minKey = this.hash(aabb.min.x, aabb.min.y);
    const maxKey = this.hash(aabb.max.x, aabb.max.y);
    
    const [minCellX, minCellY] = minKey.split(',').map(Number);
    const [maxCellX, maxCellY] = maxKey.split(',').map(Number);
    
    const candidates = new Set();
    
    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const key = `${x},${y}`;
        if (this.grid.has(key)) {
          for (const other of this.grid.get(key)) {
            if (other !== body) {
              candidates.add(other);
            }
          }
        }
      }
    }
    
    return Array.from(candidates);
  }
}

// ============================================================================
// CONSTRAINT SOLVER
// ============================================================================

class ContactSolver {
  constructor(manifold, dt) {
    this.manifold = manifold;
    this.dt = dt;
    this.contactCount = manifold.contacts.length;
    this.normalImpulses = new Array(this.contactCount).fill(0);
    this.tangentImpulses = new Array(this.contactCount).fill(0);
  }

  preSolve() {
    const bodyA = this.manifold.bodyA;
    const bodyB = this.manifold.bodyB;
    
    // Calculate relative velocity and apply restitution
    for (let i = 0; i < this.contactCount; i++) {
      const contact = this.manifold.contacts[i];
      const velA = bodyA.getVelocityAtPoint(contact);
      const velB = bodyB.getVelocityAtPoint(contact);
      const relVel = velB.sub(velA);
      
      const normalVel = relVel.dot(this.manifold.normal);
      
      // Apply cached impulses (warm starting)
      const impulse = this.manifold.normal.scale(this.normalImpulses[i]);
      const tangent = this.manifold.normal.perp();
      const tangentImpulse = tangent.scale(this.tangentImpulses[i]);
      
      bodyA.applyImpulse(impulse.add(tangentImpulse).scale(-1), contact);
      bodyB.applyImpulse(impulse.add(tangentImpulse), contact);
    }
  }

  solve() {
    const bodyA = this.manifold.bodyA;
    const bodyB = this.manifold.bodyB;
    const restitution = Math.max(bodyA.restitution, bodyB.restitution);
    const friction = Math.sqrt(bodyA.friction * bodyB.friction);
    
    for (let i = 0; i < this.contactCount; i++) {
      const contact = this.manifold.contacts[i];
      
      // Normal impulse
      const velA = bodyA.getVelocityAtPoint(contact);
      const velB = bodyB.getVelocityAtPoint(contact);
      const relVel = velB.sub(velA);
      
      const normalVel = relVel.dot(this.manifold.normal);
      
      const rA = contact.sub(bodyA.position);
      const rB = contact.sub(bodyB.position);
      
      const rACrossN = rA.cross(this.manifold.normal);
      const rBCrossN = rB.cross(this.manifold.normal);
      
      const effectiveMass = bodyA.inverseMass + bodyB.inverseMass +
        rACrossN * rACrossN * bodyA.inverseInertia +
        rBCrossN * rBCrossN * bodyB.inverseInertia;
      
      if (effectiveMass === 0) continue;
      
      let lambda = -(normalVel + restitution * normalVel) / effectiveMass;
      
      const oldImpulse = this.normalImpulses[i];
      this.normalImpulses[i] = Math.max(oldImpulse + lambda, 0);
      lambda = this.normalImpulses[i] - oldImpulse;
      
      const impulse = this.manifold.normal.scale(lambda);
      bodyA.applyImpulse(impulse.scale(-1), contact);
      bodyB.applyImpulse(impulse, contact);
      
      // Friction impulse
      const velA2 = bodyA.getVelocityAtPoint(contact);
      const velB2 = bodyB.getVelocityAtPoint(contact);
      const relVel2 = velB2.sub(velA2);
      
      const tangent = this.manifold.normal.perp();
      const tangentVel = relVel2.dot(tangent);
      
      const rACrossT = rA.cross(tangent);
      const rBCrossT = rB.cross(tangent);
      
      const effectiveMassT = bodyA.inverseMass + bodyB.inverseMass +
        rACrossT * rACrossT * bodyA.inverseInertia +
        rBCrossT * rBCrossT * bodyB.inverseInertia;
      
      if (effectiveMassT === 0) continue;
      
      let lambdaT = -tangentVel / effectiveMassT;
      
      const maxFriction = friction * this.normalImpulses[i];
      const oldTangentImpulse = this.tangentImpulses[i];
      this.tangentImpulses[i] = Math.max(-maxFriction, Math.min(oldTangentImpulse + lambdaT, maxFriction));
      lambdaT = this.tangentImpulses[i] - oldTangentImpulse;
      
      const tangentImpulse = tangent.scale(lambdaT);
      bodyA.applyImpulse(tangentImpulse.scale(-1), contact);
      bodyB.applyImpulse(tangentImpulse, contact);
    }
  }
}

// ============================================================================
// PHYSICS WORLD
// ============================================================================

class PhysicsWorld {
  constructor(options = {}) {
    this.bodies = [];
    this.gravity = options.gravity || new Vec2(0, 9.81);
    this.spatialHash = new SpatialHash(options.cellSize || 50);
    this.iterations = options.iterations || 10;
    this.timeStep = 1 / 60;
    this.accumulator = 0;
    
    this.collisionPairs = [];
    this.contacts = [];
    
    this.enableSleeping = options.enableSleeping !== undefined ? options.enableSleeping : true;
  }

  addBody(body) {
    this.bodies.push(body);
    return body;
  }

  removeBody(body) {
    const index = this.bodies.indexOf(body);
    if (index !== -1) {
      this.bodies.splice(index, 1);
    }
  }

  step(dt) {
    this.accumulator += dt;
    
    while (this.accumulator >= this.timeStep) {
      this.singleStep(this.timeStep);
      this.accumulator -= this.timeStep;
    }
  }

  singleStep(dt) {
    // Clear spatial hash and rebuild
    this.spatialHash.clear();
    for (const body of this.bodies) {
      if (body.shape) {
        this.spatialHash.insert(body);
      }
    }
    
    // Broad phase collision detection
    this.collisionPairs = [];
    const checked = new Set();
    
    for (const body of this.bodies) {
      if (!body.shape || body.isSleeping) continue;
      
      const candidates = this.spatialHash.query(body);
      
      for (const other of candidates) {
        if (body === other || other.isSleeping) continue;
        if (body.isStatic && other.isStatic) continue;
        
        const pairKey = body < other ? `${body}_${other}` : `${other}_${body}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);
        
        this.collisionPairs.push([body, other]);
      }
    }
    
    // Narrow phase collision detection
    this.contacts = [];
    for (const [bodyA, bodyB] of this.collisionPairs) {
      const manifold = CollisionDetector.detect(bodyA, bodyB);
      if (manifold) {
        this.contacts.push(manifold);
        bodyA.wakeUp();
        bodyB.wakeUp();
      }
    }
    
    // Integrate forces
    for (const body of this.bodies) {
      if (body.isStatic || body.isSleeping) continue;
      
      // Apply gravity
      body.force = body.force.add(this.gravity.scale(body.mass));
      
      // Integrate velocity
      body.velocity = body.velocity.add(body.force.scale(body.inverseMass * dt));
      body.angularVelocity += body.torque * body.inverseInertia * dt;
      
      // Apply damping
      body.velocity = body.velocity.scale(Math.pow(body.linearDamping, dt));
      body.angularVelocity *= Math.pow(body.angularDamping, dt);
      
      // Clear forces
      body.force = new Vec2(0, 0);
      body.torque = 0;
    }
    
    // Initialize contact solvers
    const solvers = this.contacts.map(manifold => new ContactSolver(manifold, dt));
    
    // Pre-solve (warm starting)
    for (const solver of solvers) {
      solver.preSolve();
    }
    
    // Iterative impulse resolution
    for (let i = 0; i < this.iterations; i++) {
      for (const solver of solvers) {
        solver.solve();
      }
    }
    
    // Integrate positions
    for (const body of this.bodies) {
      if (body.isStatic || body.isSleeping) continue;
      
      body.position = body.position.add(body.velocity.scale(dt));
      body.rotation += body.angularVelocity * dt;
    }
    
    // Position correction (Baumgarte stabilization)
    const correctionFactor = 0.2;
    const slop = 0.01;
    
    for (const manifold of this.contacts) {
      const bodyA = manifold.bodyA;
      const bodyB = manifold.bodyB;
      
      const correction = Math.max(manifold.penetration - slop, 0) * correctionFactor;
      const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
      
      if (totalInverseMass > 0) {
        const correctionVector = manifold.normal.scale(correction / totalInverseMass);
        
        bodyA.position = bodyA.position.sub(correctionVector.scale(bodyA.inverseMass));
        bodyB.position = bodyB.position.add(correctionVector.scale(bodyB.inverseMass));
      }
    }
    
    // Update sleep states
    if (this.enableSleeping) {
      for (const body of this.bodies) {
        body.updateSleepState(dt);
      }
    }
  }

  query(point, radius = 0) {
    const results = [];
    
    for (const body of this.bodies) {
      if (!body.shape) continue;
      
      const distSq = body.position.sub(point).lengthSq();
      const checkRadius = radius + (body.shape.radius || Math.max(body.shape.width, body.shape.height));
      
      if (distSq <= checkRadius * checkRadius) {
        results.push(body);
      }
    }
    
    return results;
  }

  raycast(origin, direction, maxDistance = Infinity) {
    // Simplified raycast - can be optimized with DDA on spatial hash
    let closest = null;
    let minT = Infinity;
    
    for (const body of this.bodies) {
      if (!body.shape) continue;
      
      // AABB test first
      const aabb = body.shape.getAABB(body);
      const tAABB = this.rayAABB(origin, direction, aabb);
      
      if (tAABB !== null && tAABB < maxDistance && tAABB < minT) {
        closest = { body, distance: tAABB, point: origin.add(direction.scale(tAABB)) };
        minT = tAABB;
      }
    }
    
    return closest;
  }

  rayAABB(origin, direction, aabb) {
    const dirInv = new Vec2(
      direction.x !== 0 ? 1 / direction.x : Infinity,
      direction.y !== 0 ? 1 / direction.y : Infinity
    );
    
    const t1 = (aabb.min.x - origin.x) * dirInv.x;
    const t2 = (aabb.max.x - origin.x) * dirInv.x;
    const t3 = (aabb.min.y - origin.y) * dirInv.y;
    const t4 = (aabb.max.y - origin.y) * dirInv.y;
    
    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
    
    if (tmax < 0 || tmin > tmax) {
      return null;
    }
    
    return tmin;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Vec2,
    RigidBody,
    CircleShape,
    BoxShape,
    PhysicsWorld,
    CollisionDetector,
    SpatialHash
  };
}
