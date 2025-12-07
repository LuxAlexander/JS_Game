const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
/*
canvas.width=window.innerWidth-2;
canvas.height=window.innerHeight-2;*/

canvas.width = 1000;
canvas.height = 500;


let keys = {
    right: {
        pressed: false
    },
    left: {
        pressed: false
    },
    up: {
        pressed: false
    },
    down: {
        pressed: false
    },
    shoot:{
        pressed: false
    }
}

class Player {
    constructor(color) {
        this.width = 50;
        this.height = 50;
        this.color = color;
        this.pos = {
            x: 100,
            y: 200
        };
        this.velocity = {
            x: 0,
            y: 0
        };

    }
    draw() {
        c.beginPath();
        c.rect(this.pos.x, this.pos.y, this.width, this.height);
        c.fillStyle = this.color;
        c.fill();
    }

    update() {
        this.pos.x += this.velocity.x;
        this.pos.y += this.velocity.y;

        if (keys.right.pressed&& this.pos.x + this.width <= canvas.width) {
            this.velocity.x = 5;
            this.color = "blue";
        } else if (keys.left.pressed&& this.pos.x >= 0) {
            this.velocity.x = -5;
            this.color = "green";
        } else {
            this.velocity.x = 0;
            this.color = "red";
        }

        if (keys.up.pressed && this.pos.y >= 0) {
            this.velocity.y = -5;
        } else if (keys.down.pressed && this.pos.y + this.height <= canvas.height) {
            this.velocity.y = 5;
        } else {
            this.velocity.y = 0;
        }
        this.draw();
    }

}

const player = new Player("red");

function animate() {
    c.clearRect(0, 0, canvas.width, canvas.height);
    player.update();
    requestAnimationFrame(animate);
}

animate();


window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "a":
            keys.left.pressed = true;
            break; 
        case "d":
            keys.right.pressed = true;
            break;
        case "w":
            keys.up.pressed = true;
            break;
        case "s":
            keys.down.pressed = true;
            break;
        case " ":
            keys.shoot.pressed = true;
            break;
    }
    console.log(event.key);
});

window.addEventListener("keyup", (event) => {  
    switch (event.key) {
        case "a":
            keys.left.pressed = false;
            break;
        case "d":
            keys.right.pressed = false;
            break;
        case "w":
            keys.up.pressed = false;
            break;
        case "s":
            keys.down.pressed = false;
            break;
        case " ":
            keys.shoot.pressed = false;
            break;

    }
    console.log(event.key);
});