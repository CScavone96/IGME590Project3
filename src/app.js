const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const xxh = require('xxhashjs');

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const spaceShip = fs.readFileSync(`${__dirname}/../hosted/Spaceship.png`);

const handler = (req, res) => {
  if(req.url === '/Spaceship.png') {
    res.writeHead(200, {'Content-Type': 'image/png'});
    res.end(spaceShip);
  }
  else if (req.url === '/bundle.js') {
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

let stars = [];
let world = {width: 5120, height: 2880};
let bullets = {};
let bulletCount = 0;

const createStars = (starCount) => {
    for(let i = 0; i < starCount; i++){
        let xPos = Math.floor((Math.random() * world.width*2) -world.width);
        let yPos = Math.floor((Math.random() * world.height*2) -world.height);
        stars[i] = {x: xPos, y: yPos}
    }
};

createStars(3000);

io.on('connection', (sock) => {
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
    speed: 4,
    bulletSpeed: 7,
    shoot: false,
    canShoot: true,
  };

  socket.emit('joined', socket.square);
  socket.emit('setStars', stars);
  socket.emit('setWorld', world);
  socket.on('movementUpdate', (data) => {
    socket.square = data;
    socket.square.lastUpdate = new Date().getTime();
    //io.sockets.in('room1').emit('updatedMovement', socket.square);
    socket.broadcast.to('room1').emit('updatedMovement', socket.square);
  });

  socket.on('shoot', (data) => {
    bullets[bulletCount] = {x: data.x+data.width/2, y: data.y+data.height/2, dir: data.dir, speed: data.bulletSpeed, count: bulletCount};
    io.sockets.in('room1').emit('newBullet', bullets[bulletCount]);
    bulletCount++;
  });
  
  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('left', socket.square.hash);
    socket.leave('room1');
  });
});

console.log(`listening on port ${PORT}`);
