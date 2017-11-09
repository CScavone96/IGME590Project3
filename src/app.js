const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const xxh = require('xxhashjs');

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const spaceShip = fs.readFileSync(`${__dirname}/../hosted/Spaceship.png`);

const handler = (req, res) => {
  if (req.url === '/Spaceship.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(spaceShip);
  } else if (req.url === '/bundle.js') {
    fs.readFile(`${__dirname}/../hosted/bundle.js`, (err, data) => {
      if (err) {
        throw err;
      }
      res.writeHead(200);
      res.end(data);
    });
  } else {
    fs.readFile(`${__dirname}/../hosted/index.html`, (err, data) => {
      if (err) {
        throw err;
      }
      res.writeHead(200);
      res.end(data);
    });
  }
};

const app = http.createServer(handler);
const io = socketio(app);


app.listen(PORT);

const stars = [];
const powerUps = [];
const ships = {};
const world = { width: 5120, height: 2880 };
const bullets = {};

let bulletCount = 0;

const checkColl = (square1, square2) => { // returns collisions between squares
  if (square1.x < square2.x + square2.width &&
    square1.x + square1.width > square2.x &&
    square1.y < square2.y + square2.height &&
    square1.height + square1.y > square2.y) {
    return true;
  }

  return false;
};


const checkCollision = (ship, bullet) => { // handles with collisions between ships and bullets
  if (checkColl(ship, bullet)) {
    const newShip = ship;
    delete bullets[bullet.count];
    newShip.hp--;
    const data = { ship: newShip, bullet };
    io.sockets.in('room1').emit('bulletHit', data);
    return true;
  }

  return false;
};

const createStars = (starCount) => { // Creates stars 
  for (let i = 0; i < starCount; i++) {
    const xPos = Math.floor((Math.random() * world.width * 2) - world.width);
    const yPos = Math.floor((Math.random() * world.height * 2) - world.height);
    const s = Math.floor((Math.random() * 8) + 4);
    stars[i] = { x: xPos, y: yPos, size: s };
  }
};

createStars(3500);


const createPowerUps = (starCount) => { // Creates power ups 
  for (let i = 0; i < starCount; i++) {
    const xPos = Math.floor((Math.random() * world.width * 2) - world.width);
    const yPos = Math.floor((Math.random() * world.height * 2) - world.height);
    const t = Math.floor((Math.random() * 1) + 1);
    powerUps[i] = { x: xPos, y: yPos, height: 16, width: 16, type: t };
  }
};

createPowerUps(35);

const checkBullets = () => { // Manages collisions and distribution for powerups
  const bullKeys = Object.keys(bullets);
  const shipKeys = Object.keys(ships);
  for (let i = 0; i < bullKeys.length; i++) {
    const bullet = bullets[bullKeys[i]];
    if (typeof bullet !== 'undefined') {
      bullet.life--;
      if (bullet.dir === 0) {
        bullet.y -= bullet.speed;
      } else if (bullet.dir === 1) {
        bullet.x += bullet.speed;
        bullet.y -= bullet.speed;
      } else if (bullet.dir === 2) {
        bullet.x += bullet.speed;
      } else if (bullet.dir === 3) {
        bullet.x += bullet.speed;
        bullet.y += bullet.speed;
      } else if (bullet.dir === 4) {
        bullet.y += bullet.speed;
      } else if (bullet.dir === 5) {
        bullet.y += bullet.speed;
        bullet.x -= bullet.speed;
      } else if (bullet.dir === 6) {
        bullet.x -= bullet.speed;
      } else if (bullet.dir === 7) {
        bullet.x -= bullet.speed;
        bullet.y -= bullet.speed;
      }
      for (let k = 0; k < shipKeys.length; k++) {
        const ship = ships[shipKeys[k]];
        if (ship.hash !== bullet.creator) {
          console.log(`${ship.hash} ${bullet.creator}`);
          checkCollision(ship, bullet);
        }
      }
      if (bullet.life < 1) {
        delete bullets[bullet.count];
      }
    }
  }
  io.sockets.in('room1').emit('bulletUpdate', bullets);
};

const checkPowerUps = () => { // Manages collisions and distribution for powerups
  const shipKeys = Object.keys(ships);
  for (let i = 0; i < powerUps.length; i++) {
    const powerUp = powerUps[i];
    if (typeof powerUp !== 'undefined') {
      for (let k = 0; k < shipKeys.length; k++) {
        const ship = ships[shipKeys[k]];
        if (checkColl(ship, powerUp)) {
          const xPos = Math.floor((Math.random() * world.width * 2) - world.width);
          const yPos = Math.floor((Math.random() * world.height * 2) - world.height);
          powerUps[i].x = xPos;
          powerUps[i].y = yPos;
          const data = { ship, powerUp };
          io.sockets.in('room1').emit('powerUp', data);
          io.sockets.in('room1').emit('setPowerUps', powerUps);
          console.log('powerup!!');
        }
      }
    }
  }
};


io.on('connection', (sock) => { // Handles setting up socket connection
  const socket = sock;


  socket.join('room1');

  socket.square = {
    hash: xxh.h32(`${socket.id}${Date.now()}`, 0xB105F00D).toString(16),
    lastUpdate: new Date().getTime(),
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    destX: 0,
    destY: 0,
    alpha: 0,
    height: 35,
    width: 37,
    moveLeft: false,
    moveRight: false,
    moveDown: false,
    moveUp: false,
    dir: 0,
    speed: 3,
    bulletSpeed: 5,
    shoot: false,
    canShoot: true,
    hp: 3,
  };
  // socket.square.x = Math.floor((Math.random() * 3546) - 1532);
  // socket.square.y = Math.floor((Math.random() * 1980) - 862);
  socket.square.destX = socket.square.x;
  socket.square.destY = socket.square.y;
  ships[socket.hash] = socket.square;
  socket.emit('joined', socket.square);
  socket.emit('setStars', stars);
  socket.emit('setPowerUps', powerUps);
  socket.emit('setWorld', world);
  socket.on('movementUpdate', (data) => { // Updates health and location of ships
    socket.square = data;
    if (socket.square.hp < 0) {
      socket.square.hp--;
    }
    if (socket.square.hp === 0) {
      socket.square.hp = -1;
    }
    if (socket.square.hp < -120) {
      socket.square.x = Math.floor((Math.random() * 3546) - 1532);
      socket.square.y = Math.floor((Math.random() * 1980) - 862);
      socket.square.destX = socket.square.x;
      socket.square.destY = socket.square.y;
      socket.square.prevX = socket.square.x;
      socket.square.prevY = socket.square.y;
      io.sockets.in('room1').emit('respawn', socket.square);
      socket.square.hp = 3;
    }
    console.log(socket.square.hp);
    socket.broadcast.to('room1').emit('updatedHP', socket.square);
    ships[socket.hash] = socket.square;
    socket.square.lastUpdate = new Date().getTime();
    // io.sockets.in('room1').emit('updatedMovement', socket.square);
    socket.broadcast.to('room1').emit('updatedMovement', socket.square);
    // io.sockets.in('room1').emit('updatedMovement', socket.square);
  });

  socket.on('shoot', (data) => { // Handles shooting from socket
    bullets[bulletCount] = {
      x: data.x + (data.width / 2),
      y: data.y + (data.height / 2),
      dir: data.dir,
      speed: data.bulletSpeed,
      count: bulletCount,
      height: 10,
      width: 10,
      creator: data.hash,
      life: 180 };

    io.sockets.in('room1').emit('newBullet', bullets[bulletCount]);
    bulletCount++;
  });

  socket.on('disconnect', () => { // Handles socket disconnecting
    io.sockets.in('room1').emit('left', socket.square.hash);
    socket.leave('room1');
  });
});

console.log(`listening on port ${PORT}`);

setInterval(checkBullets, 10);
setInterval(checkPowerUps, 10);
