const canvas = document.getElementById('space');
const ctx = canvas.getContext('2d');

let drawing = false;

canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
});

canvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
});

canvas.addEventListener('mouseup', () => {
  drawing = false;
  ctx.closePath();
});


function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function angle(p1, p2) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}


// Example pseudocode for drawing with brush image
for (let d = 0; d <= distance(start, end); d += 1) {
  const x = start.x + Math.cos(theta) * d;
  const y = start.y + Math.sin(theta) * d;
  ctx.drawImage(brush, x - brush.width/2, y - brush.height/2);
}
