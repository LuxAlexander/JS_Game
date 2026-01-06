const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 1000;
canvas.height = 500;

/* ================= INPUT ================= */

let isGameOver = false;
let enemiesSlain = 0;
let hasBow = false;
let difficulty = 1;

let leaderboardData = [
    { name: "x", score: 5 },
    { name: "y", score: 10 },
    { name: "z", score: 15 }
];

const keys = {
    left: false, right: false, up: false, down: false,
    attack: false, switch: false
};

window.addEventListener("keydown", e => {
    if (["a", "ArrowLeft"].includes(e.key)) keys.left = true;
    if (["d", "ArrowRight"].includes(e.key)) keys.right = true;
    if (["w", "ArrowUp"].includes(e.key)) keys.up = true;
    if (["s", "ArrowDown"].includes(e.key)) keys.down = true;
    if (e.key === " ") keys.attack = true;
    if (e.key === "q") keys.switch = true;
});

window.addEventListener("keyup", e => {
    if (["a", "ArrowLeft"].includes(e.key)) keys.left = false;
    if (["d", "ArrowRight"].includes(e.key)) keys.right = false;
    if (["w", "ArrowUp"].includes(e.key)) keys.up = false;
    if (["s", "ArrowDown"].includes(e.key)) keys.down = false;
    if (e.key === " ") keys.attack = false;
});

/* ================= HELPERS ================= */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ================= UI UPDATER ================= */
function updateUI(logMsg = null) {
    document.getElementById("slain-count").innerText = enemiesSlain;
    document.getElementById("hp-count").innerText = Math.ceil(player ? player.health : 0);

    if (logMsg) {
        document.getElementById("log").innerText = logMsg;
    }

    if (player) {
        const invList = document.getElementById("inventory-list");
        invList.innerHTML = "";
        player.inventory.weapons.forEach((w, i) => {
            const span = document.createElement("span");
            span.className = "inv-item " + (i === player.inventory.index ? "active-weapon" : "");
            span.innerText = w.name;
            invList.appendChild(span);
        });
    }
}

function updateLeaderboardUI() {
    const list = document.getElementById("leaderboard-list");
    // Sort scores descending
    const sorted = [...leaderboardData].sort((a, b) => b.score - a.score);

    list.innerHTML = sorted.map((entry, i) => `
        <li>
            <span>${i + 1}. ${entry.name}</span>
            <span style="color: deepskyblue">${entry.score}</span>
        </li>
    `).join("");
}

/* ================= TILE ================= */

class Tile {
    constructor(x, y, size, walkable = true) {
        this.x = x; this.y = y;
        this.size = size;
        this.walkable = walkable;
    }
    draw() {
        c.fillStyle = this.walkable ? "#2d2d2d" : "#111";
        c.fillRect(this.x, this.y, this.size, this.size);
    }
}

/* ================= ROOM (LABYRINTH GENERATOR) ================= */

class Room {
    constructor(cols, rows, tileSize) {
        this.tiles = [];
        this.entities = [];
        this.doors = [];
        // Maze generation works best with odd dimensions
        this.cols = cols % 2 === 0 ? cols + 1 : cols;
        this.rows = rows % 2 === 0 ? rows + 1 : rows;
        this.tileSize = tileSize;
        this.generateLabyrinth();
    }

    getTile(x, y) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
        return this.tiles[y * this.cols + x];
    }

    generateLabyrinth() {
        // 1. Fill the entire room with walls
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.tiles.push(new Tile(x * this.tileSize, y * this.tileSize, this.tileSize, false));
            }
        }

        // 2. Recursive Backtracker Algorithm
        const stack = [];
        let current = { x: 1, y: 1 };
        const startTile = this.getTile(current.x, current.y);
        if (startTile) startTile.walkable = true;
        stack.push(current);

        while (stack.length > 0) {
            let curr = stack[stack.length - 1];
            const neighbors = [];
            const dirs = [
                { x: 0, y: -2 }, { x: 2, y: 0 },
                { x: 0, y: 2 }, { x: -2, y: 0 }
            ];

            for (let d of dirs) {
                let nx = curr.x + d.x;
                let ny = curr.y + d.y;
                let neighbor = this.getTile(nx, ny);
                // If neighbor is within bounds and is still a wall
                if (neighbor && !neighbor.walkable) {
                    neighbors.push({ x: nx, y: ny, dx: d.x / 2, dy: d.y / 2 });
                }
            }

            if (neighbors.length > 0) {
                // Choose a random neighbor to move to
                let chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
                // Remove the wall between the current cell and the neighbor
                this.getTile(curr.x + chosen.dx, curr.y + chosen.dy).walkable = true;
                // Mark the neighbor as a path
                this.getTile(chosen.x, chosen.y).walkable = true;
                stack.push({ x: chosen.x, y: chosen.y });
            } else {
                stack.pop();
            }
        }

        // 3. Optional: Break a few extra walls to make it less "perfect" and easier to move
        for (let i = 0; i < 175; i++) {
            let rx = Math.floor(Math.random() * (this.cols - 2)) + 1;
            let ry = Math.floor(Math.random() * (this.rows - 2)) + 1;
            this.getTile(rx, ry).walkable = true;
        }
    }

    getSafePos() {
        let found = false;
        let pos = { x: 0, y: 0 };
        while (!found) {
            let tx = Math.floor(Math.random() * this.cols);
            let ty = Math.floor(Math.random() * this.rows);
            let tile = this.getTile(tx, ty);
            if (tile && tile.walkable) {
                // Center the entity in the tile
                pos.x = tile.x + (this.tileSize - 30) / 2;
                pos.y = tile.y + (this.tileSize - 30) / 2;
                found = true;
            }
        }
        return pos;
    }

    isWalkable(x, y, w, h) {
        return !this.tiles.some(t =>
            !t.walkable &&
            x < t.x + t.size &&
            x + w > t.x &&
            y < t.y + t.size &&
            y + h > t.y
        );
    }

    draw() {
        this.tiles.forEach(t => t.draw());
        this.doors.forEach(d => d.draw());
        this.entities = this.entities.filter(e => !e.dead);
        this.entities.forEach(e => e.update());

        const enemiesLeft = this.entities.some(e => e instanceof Enemy);
        const chestExists = this.entities.some(e => e instanceof Chest);

        if (!enemiesLeft && !chestExists) {
            const pos = this.getSafePos();
            this.entities.push(new Chest(pos.x, pos.y));
        }

    }
}

/* ================= UPDATED DUNGEON (Increased Spawn Rates) ================= */

class Dungeon {
    constructor() {
        this.currentRoom = null;
        this.nextLevel();
    }

    nextLevel() {
        const newRoom = new Room(25, 12, 40);
        newRoom.doors.push(new Door(960, 200));

        // Spawn Enemies
        for (let i = 0; i < 4; i++) {
            const pos = newRoom.getSafePos();
            newRoom.entities.push(new Enemy(pos.x, pos.y));
        }

        // INCREASED ITEM SPAWN RATE: Spawn 3 items per level with weighted types
        for (let i = 0; i < 3; i++) {
            const itemPos = newRoom.getSafePos();
            const rand = Math.random();
            let type;

            if (rand < 0.4) {
                type = "health"; // 40% Spawn Rate
            } else if (rand < 0.8) {
                type = "speed";  // 40% Spawn Rate
            } else if (hasBow == false) {
                type = "bow";    // 20% Spawn Rate
            }

            newRoom.entities.push(new Item(itemPos.x, itemPos.y, type));
        }

        this.currentRoom = newRoom;
        if (player) {
            const newPos = this.currentRoom.getSafePos();
            player.pos.x = newPos.x;
            player.pos.y = newPos.y;
        }
    }

    get room() { return this.currentRoom; }
}


/* ================= ENTITY ================= */

class Entity {
    constructor(x, y, w, h, color) {
        this.pos = { x, y };
        this.width = w;
        this.height = h;
        this.color = color;
        this.dead = false;
    }
    draw() {
        c.fillStyle = this.color;
        c.fillRect(this.pos.x, this.pos.y, this.width, this.height);
    }
    update() { this.draw(); }
    destroy() { this.dead = true; }
}

/* ================= UPDATED ITEM (Health Potion added) ================= */

class Item extends Entity {
    constructor(x, y, type) {
        super(x, y, 24, 24, "transparent");
        this.type = type;
    }

    draw() {
        const px = this.width / 8;
        const ox = this.pos.x;
        const oy = this.pos.y;

        if (this.type === "health") {
            // --- PIXEL ART: HEALTH POTION ---
            // Bottle Cork
            c.fillStyle = "#8B4513";
            c.fillRect(ox + 3 * px, oy, 2 * px, px);
            // Glass Rim
            c.fillStyle = "#ADD8E6";
            c.fillRect(ox + 2 * px, oy + px, 4 * px, px);
            // Bottle Body (Glass)
            c.fillStyle = "#F0F8FF";
            c.fillRect(ox + px, oy + 2 * px, 6 * px, 6 * px);
            // Red Liquid Filling
            c.fillStyle = "#FF0000";
            c.fillRect(ox + 2 * px, oy + 4 * px, 4 * px, 3 * px);
            c.fillRect(ox + 3 * px, oy + 3 * px, 2 * px, px);

        } else if (this.type === "bow") {

            // 0. Draw the Bowstring
            c.fillStyle = "white";
            const bowstring = [
                [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8]
            ];
            bowstring.forEach(([x, y]) => c.fillRect(ox + x * px, oy + y * px, px, px));

            // 1. Draw the Brown Bow Body
            c.fillStyle = "brown"; // Brown
            const wood = [
                [1, 0], [2, 0],
                [2, 1], [3, 1],
                [3, 2],
                [4, 2], [4, 3], [4, 4], [4, 5], [4, 6],
                [3, 6],
                [3, 7], [2, 7],
                [2, 8], [1, 8]
            ];
            wood.forEach(([x, y]) => c.fillRect(ox + x * px, oy + y * px, px, px));

            // 2. Draw the Black Arrow & Grip
            c.fillStyle = "black";
            const arrow = [
                [1, 4], [2, 4], [3, 4], // Arrow shaft/Grip
                [5, 3],
                [5, 4],            // Top of arrowhead
                [5, 5],             // Bottom of arrowhead
                [6, 4], [7, 4]        // Tip of arrow
            ];
            arrow.forEach(([x, y]) => c.fillRect(ox + x * px, oy + y * px, px, px));

        } else if (this.type === "speed") {
            // Speed boost visualization
            c.fillStyle = "purple";
            c.fillRect(ox + 2 * px, oy, 4 * px, 8 * px);
            c.fillStyle = "magenta";
            c.fillRect(ox, oy + 2 * px, 8 * px, 4 * px);
        }
    }

    update() {
        if (dist(this.pos, player.pos) < 30) {
            if (this.type === "health") {
                // Heals 50 HP, but not above max
                player.health = Math.min(player.maxHealth, player.health + 50);
                updateUI("Picked up Health Potion");
            }
            if (this.type === "bow") {
                // ONE BOW PER RUN CHECK
                hasBow = player.inventory.weapons.some(w => w instanceof Bow);
                if (!hasBow) {
                    player.inventory.weapons.push(new Bow());
                    updateUI("Picked up a Bow!");
                }
            }
            if (this.type === "speed") {
                player.speed += 0.4;
                updateUI("Speed Increased!");
            }

            this.destroy();
        }
        this.draw();
    }
}


/* ================= LIVING ================= */

class Living extends Entity {
    constructor(x, y, w, h, color) {
        super(x, y, w, h, color);
        this.maxHealth = 100;
        this.health = 100;
        this.speed = 2;
    }
    onHit(dmg) {
        this.health -= dmg;
        if (this.health <= 0) this.destroy();
    }
    drawHealth() {
        c.fillStyle = "black";
        c.fillRect(this.pos.x, this.pos.y - 8, this.width, 5);
        c.fillStyle = "lime";
        if (this.health >= 0) {
            c.fillRect(this.pos.x, this.pos.y - 8, this.width * (this.health / this.maxHealth), 5);
        } else this.destroy();
    }
    update() {
        this.draw();
        this.drawHealth();
    }
}

/* ================= WEAPONS ================= */

class Sword {
    constructor() { this.name = "Sword"; this.damage = 25; this.range = 50; }
    attack(owner, room) {
        room.entities.forEach(e => {
            if (e instanceof Enemy && dist(owner.pos, e.pos) < this.range) {
                e.onHit(this.damage);
            }
        });
        c.beginPath();
        c.arc(owner.pos.x + 15, owner.pos.y + 15, this.range, 0, Math.PI * 2);
        c.strokeStyle = "white";
        c.stroke();
    }
}

class Bow {
    constructor() { this.name = "Bow"; this.damage = 20; this.range = 300; }
    attack(owner, room) {
        arrows.push(new Arrow(owner.pos.x + 15, owner.pos.y + 15, owner.dir));
    }
}

/* ================= PROJECTILES ================= */

class Arrow extends Entity {
    constructor(x, y, dir) {
        super(x, y, 8, 4, "gold");
        this.vel = { x: dir.x * 7, y: dir.y * 7 };
        this.damage = 20;
    }
    update() {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;

        // Check hits against room entities
        dungeon.room.entities.forEach(e => {
            if (e instanceof Enemy && !e.dead && dist(this.pos, e.pos) < 25) {
                e.onHit(this.damage);
                this.destroy();
            }
        });
        super.draw();
    }
}

/* ================= UPDATED PLAYER (Added death check) ================= */

class Player extends Living {
    constructor(x, y) {
        super(x, y, 30, 30, "deepskyblue");
        this.inventory = { weapons: [new Sword()], index: 0 };
        this.dir = { x: 1, y: 0 };
        this.speedModifier = 1;
        this.speed = 4;
        this.cooldown = 0;

    }

    get weapon() { return this.inventory.weapons[this.inventory.index]; }

    movement() {
        let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        let mag = Math.hypot(dx, dy) || 1;

        dx /= mag; dy /= mag;

        let sp = this.speed * this.speedModifier;
        this.speedModifier = 1;

        let nx = this.pos.x + dx * sp;
        let ny = this.pos.y + dy * sp;
        if (dungeon.room.isWalkable(nx, ny, this.width, this.height)) {
            this.pos.x = nx; this.pos.y = ny;
            if (dx || dy) this.dir = { x: dx, y: dy };
        }
    }
    draw() {
        const px = this.width / 6;
        const py = this.height / 6;

        c.fillStyle = "#1e90ff"; // body
        c.fillRect(this.pos.x + px, this.pos.y + py * 2, px * 4, py * 3);

        c.fillStyle = "#ffd1a9"; // head
        c.fillRect(this.pos.x + px * 2, this.pos.y, px * 2, py * 2);

        c.fillStyle = "black"; // eyes
        c.fillRect(this.pos.x + px * 2.3, this.pos.y + py, px * 0.4, py * 0.4);
        c.fillRect(this.pos.x + px * 3.3, this.pos.y + py, px * 0.4, py * 0.4);
    }

    update() {
        if (this.health <= 0) {
            this.dead = true;
            isGameOver = true;
            return;
        }
        this.movement();
        if (keys.switch) {
            this.inventory.index = (this.inventory.index + 1) % this.inventory.weapons.length;
            keys.switch = false;
            updateUI("Switched to " + this.weapon.name);
        }
        if (keys.attack && this.cooldown <= 0) {
            this.weapon.attack(this, dungeon.room);
            this.cooldown = 20;
        }
        if (this.cooldown > 0) this.cooldown--;
        super.update();
    }
}

/* ================= ENEMY (SLIME) ================= */

class Enemy extends Living {
    constructor(x, y) {
        super(x, y, 35, 30, "#00ff77"); // Slightly wider for slime look
        this.state = "PATROL";
        this.dir = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
        this.maxHealth = 100 * difficulty;
        this.health = this.maxHealth;
        this.speed = 1.5 + difficulty * 0.1;

    }
    destroy() {
        if (!this.dead) {
            enemiesSlain++;
            difficulty += 0.05;
            updateUI("Enemy Slain!");
        }
        super.destroy();
    }


    // DRAWING THE SLIME BASED ON YOUR PICTURE
    draw() {
        const px = this.width / 8;  // Divide enemy width into "pixels"
        const py = this.height / 6; // Divide enemy height into "pixels"

        c.fillStyle = "#00ff77"; // Main slime green

        // Simple pixel-map for the slime body
        // Row 1
        c.fillRect(this.pos.x + px * 2, this.pos.y, px * 4, py);
        // Row 2
        c.fillRect(this.pos.x + px, this.pos.y + py, px * 6, py);
        // Row 3 (Eyes row)
        c.fillRect(this.pos.x, this.pos.y + py * 2, px * 8, py);
        // Row 4
        c.fillRect(this.pos.x, this.pos.y + py * 3, px * 8, py);
        // Row 5
        c.fillRect(this.pos.x + px, this.pos.y + py * 4, px * 6, py);

        // Draw Black Eyes
        c.fillStyle = "black";
        c.fillRect(this.pos.x + px * 2, this.pos.y + py * 2, px, py); // Left Eye
        c.fillRect(this.pos.x + px * 5, this.pos.y + py * 2, px, py); // Right Eye
    }

    update() {
        const d = dist(this.pos, player.pos);
        if (d < 200) {
            this.dir.x = player.pos.x - this.pos.x;
            this.dir.y = player.pos.y - this.pos.y;
        } else if (Math.random() < 0.02) {
            this.dir = { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 };
        }
        //Shooting Goo
        if (Math.random() < 0.005) {
            const dir = {
                x: player.pos.x - this.pos.x,
                y: player.pos.y - this.pos.y
            };
            let mag = Math.hypot(dir.x, dir.y) || 1;
            dir.x /= mag; dir.y /= mag;

            arrows.push(new GooShot(this.pos.x + 15, this.pos.y + 15, dir));
        }


        let mag = Math.hypot(this.dir.x, this.dir.y) || 1;
        let nx = this.pos.x + (this.dir.x / mag) * this.speed;
        let ny = this.pos.y + (this.dir.y / mag) * this.speed;

        if (dungeon.room.isWalkable(nx, ny, this.width, this.height)) {
            this.pos.x = nx; this.pos.y = ny;
        }

        if (dist(this.pos, player.pos) < 30) player.onHit(0.5);

        this.draw();
        this.drawHealth();
    }
}
class GooShot extends Entity {
    constructor(x, y, dir) {
        super(x, y, 10, 10, "lime");
        this.vel = { x: dir.x * 3, y: dir.y * 3 };
    }

    update() {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;

        // Hit ground → create puddle
        if (!dungeon.room.isWalkable(this.pos.x, this.pos.y, this.width, this.height)) {
            dungeon.room.entities.push(new GooPuddle(this.pos.x, this.pos.y));
            this.destroy();
        }

        this.draw();
    }
}

class GooPuddle extends Entity {
    constructor(x, y) {
        super(x, y, 40, 40, "rgba(0,255,0,0.4)");
        this.timer = 600; // lasts ~10s
    }

    update() {
        this.timer--;
        if (this.timer <= 0) this.destroy();

        // Slow player
        if (
            player.pos.x < this.pos.x + this.width &&
            player.pos.x + player.width > this.pos.x &&
            player.pos.y < this.pos.y + this.height &&
            player.pos.y + player.height > this.pos.y
        ) {
            player.speedModifier = 0.5;
        }

        this.draw();
    }
}
/* Loot Chest */
class Chest extends Entity {
    constructor(x, y) {
        super(x, y, 32, 32, "gold");
    }

    update() {
        if (dist(this.pos, player.pos) < 30) {
            player.gold = (player.gold || 0) + 50;
            updateUI("Found 50 gold!");
        }
        this.draw();
    }
}



/* ================= DOOR ================= */

class Door {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = 40; this.h = 80;
    }
    draw() {
        c.fillStyle = "green";
        c.fillRect(this.x, this.y, this.w, this.h);

        if (
            player.pos.x + player.width > this.x - 5 &&
            player.pos.y < this.y + this.h &&
            player.pos.y + player.height > this.y
        ) {
            // Trigger new room creation
            dungeon.nextLevel();
            updateUI("Entering new floor...");
            player.health = 100;
        }
    }
}


/* ================= GAME STATE MANAGEMENT ================= */

let dungeon, player, arrows;

function initGame() {
    isGameOver = false;
    enemiesSlain = 0;
    arrows = [];
    dungeon = new Dungeon();
    const start = dungeon.currentRoom.getSafePos();
    player = new Player(start.x, start.y);
    updateUI("Labyrinth Resetted.");
    updateLeaderboardUI();
}

/* ================= LOOP ================= */

function animate() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    if (!isGameOver) {
        dungeon.room.draw();
        player.update();

        // Draw arrows
        for (let i = arrows.length - 1; i >= 0; i--) {
            arrows[i].update();
            if (arrows[i].dead) arrows.splice(i, 1);
        }
    } else {
        // Still draw the room so it's visible behind the popup
        dungeon.room.draw();
        onGameOver();
    }

    requestAnimationFrame(animate);
}

// Replace your existing onGameOver and listener with this:

function onGameOver() {
    isGameOver = true;
    const overlay = document.getElementById("game-over-overlay");
    const scoreDisplay = document.getElementById("final-score");
    
    scoreDisplay.innerText = enemiesSlain;
    overlay.style.display = "block"; // Show the HTML input
}

async function submitAndRetry() {
    const nameInput = document.getElementById("player-name");
    const name = nameInput.value.trim() || "Unknown";

    // AJAX Call to Node.js Backend
    try {
        await fetch('http://localhost:3000/submit-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: name, score: enemiesSlain })
        });
        
        // Refresh leaderboard after saving
        loadLeaderboardFromServer();
    } catch (err) {
        console.error("Could not save score:", err);
    }

    // Reset Game
    document.getElementById("game-over-overlay").style.display = "none";
    nameInput.value = "";
    initGame(); 
}

// Fetch from Backend
async function loadLeaderboardFromServer() {
    try {
        const res = await fetch('http://localhost:3000/leaderboard');
        const data = await res.json();
        
        const list = document.getElementById("leaderboard-list");
        list.innerHTML = data.map((entry, i) => `
            <li>
                <span>${i + 1}. ${entry.name}</span>
                <span style="color: deepskyblue">${entry.score}</span>
            </li>
        `).join("");
    } catch (err) {
        console.log("Offline mode: showing local data only.");
    }
}

// Event Listeners
document.getElementById("retry-btn").addEventListener("click", submitAndRetry);

// Initialize and start
initGame();
loadLeaderboardFromServer();
animate();