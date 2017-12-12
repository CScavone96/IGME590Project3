const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const xxh = require('xxhashjs');

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const spaceShip = fs.readFileSync(`${__dirname}/../hosted/Spaceship.png`);

const ad = fs.readFileSync(`${__dirname}/../hosted/skyscraperad.png`);

const handler = (req, res) => {
  if (req.url === '/Spaceship.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(spaceShip);
  } else if (req.url === '/skyscraperad.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(ad);
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
    const t = Math.floor((Math.random() * 3) + 1);
    powerUps[i] = { x: xPos, y: yPos, height: 16, width: 16, type: t };
  }
};

createPowerUps(180);

const checkBullets = () => { // Manages collisions and distribution for powerups
  const bullKeys = Object.keys(bullets);
  const shipKeys = Object.keys(ships);
  for (let i = 0; i < bullKeys.length; i++) {
    const bullet = bullets[bullKeys[i]];
    if (typeof bullet !== 'undefined') {
      bullet.life--;
      if (bullet.dir === 0) { // Up 0
        bullet.y -= bullet.speed;
      } else if (bullet.dir === 1) { // Up-right 1
        bullet.x += bullet.speed;
        bullet.y -= bullet.speed;
      } else if (bullet.dir === 2) { // Right 2
        bullet.x += bullet.speed;
      } else if (bullet.dir === 3) { // Down-right 3
        bullet.x += bullet.speed;
        bullet.y += bullet.speed;
      } else if (bullet.dir === 4) { // Down 4
        bullet.y += bullet.speed;
      } else if (bullet.dir === 5) { // Down-left 5
        bullet.y += bullet.speed;
        bullet.x -= bullet.speed;
      } else if (bullet.dir === 6) { // Left 6
        bullet.x -= bullet.speed;
      } else if (bullet.dir === 7) { // Up-left 7
        bullet.x -= bullet.speed;
        bullet.y -= bullet.speed;
      }
      for (let k = 0; k < shipKeys.length; k++) {
        const ship = ships[shipKeys[k]];
        if (ship.hash !== bullet.creator) {
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
          // console.log('powerup!!');
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
    name: 'SOCKETNAMEDEFAULT',
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
    spreadPower: 0,
    hp: 3,
    points: 0,
  };
  socket.square.x = Math.floor((Math.random() * 3546) - 1532);
  socket.square.y = Math.floor((Math.random() * 1980) - 862);
  socket.square.destX = socket.square.x;
  socket.square.destY = socket.square.y;
  ships[socket.square.hash] = socket.square;
  socket.emit('joined', socket.square);
  socket.emit('setStars', stars);
  socket.emit('setPowerUps', powerUps);
  socket.emit('setWorld', world);
  socket.on('setName', (data) => {
    let nameTaken = false;
    for (let i = 0; i < ships.length; i++) {
      if (ships[i].name === data.name) {
        nameTaken = true;
      }
    }
    if (!nameTaken) {
      socket.square.name = data.name;
      socket.name = data.name;
      ships[socket.square.hash].name = data.name;
    } else {
      socket.name = 'NAMETAKEN';
      socket.emit('nameTaken');
      socket.disconnect();
    }
  });
  socket.on('movementUpdate', (data) => { // Updates health and location of ships
    socket.square = data;
    if (ships[socket.square.hash]) {
      socket.square.points = ships[socket.square.hash].points;
    }
    if (socket.square.hash) {
      socket.square.spreadPower = ships[socket.square.hash].spreadPower;
    }
    if (socket.square.hash) {
      socket.square.speed = ships[socket.square.hash].speed;
    }
    socket.square.lastUpdate = new Date().getTime();
    if (socket.square.hp < 0 && socket.square.hp > -60) {
      socket.square.hp--;
      io.sockets.in('room1').emit('updatedHP', socket.square);
    }
    if (socket.square.hp === 0) {
      socket.square.hp = -1;
      socket.square.x = Math.floor((Math.random() * 3546) - 1532);
      socket.square.y = Math.floor((Math.random() * 1980) - 862);
      socket.square.destX = socket.square.x;
      socket.square.destY = socket.square.y;
      io.sockets.in('room1').emit('respawn', socket.square);
    }
    if (socket.square.hp === -60) {
      socket.square.hp = 3;
      socket.square.lastUpdate = new Date().getTime();
      io.sockets.in('room1').emit('updatedHP', socket.square);
    }
    io.sockets.in('room1').emit('updatedScore', socket.square);
    socket.square.lastUpdate = new Date().getTime();
    ships[socket.square.hash] = socket.square;
    socket.square.lastUpdate = new Date().getTime();
    socket.broadcast.to('room1').emit('updatedMovement', socket.square);
  });

  socket.on('shoot', (data) => { // Handles shooting from socket
    let spread = false;
    if (ships[socket.square.hash].spreadPower > 0) {
      ships[socket.square.hash].spreadPower--;
      spread = true;
    }
    if (!spread) {
      bullets[bulletCount] = {
        x: data.x + (data.width / 2),
        y: data.y + (data.height / 2),
        dir: data.dir,
        speed: data.bulletSpeed,
        count: bulletCount,
        height: 10,
        width: 10,
        creator: data.hash,
        life: 180,
        spread: 0 };
      io.sockets.in('room1').emit('newBullet', bullets[bulletCount]);
      bulletCount++;
    } else {
      for (let i = 0; i < 8; i++) {
        bullets[bulletCount] = {
          x: data.x + (data.width / 2),
          y: data.y + (data.height / 2),
          dir: i,
          speed: data.bulletSpeed,
          count: bulletCount,
          height: 10,
          width: 10,
          creator: data.hash,
          life: 180,
          spread: 1 };
        io.sockets.in('room1').emit('newBullet', bullets[bulletCount]);
        bulletCount++;
      }
    }
  });

  socket.on('spreadPower', (data) => { // Handles points
    const ship = ships[data.hash];
    ship.spreadPower += data.spreadPower;
  });

  socket.on('changeSpeed', (data) => { // Handles points
    const ship = ships[data.hash];
    ship.speed += data.speed;
  });

  socket.on('changePoints', (data) => { // Handles points
    const ship = ships[data.hash];
    ship.points += 1;
  });

  socket.on('disconnect', () => { // Handles socket disconnecting
    io.sockets.in('room1').emit('left', socket.square.hash);
    console.log(`${socket.square.name} left`);
    socket.leave('room1');
  });
});

console.log(`listening on port ${PORT}`);

setInterval(checkBullets, 12);
setInterval(checkPowerUps, 17);
