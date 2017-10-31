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
let ships = {};
let world = {width: 5120, height: 2880};
let bullets = {};
let bulletIntervals = {};
let bulletCount = 0;

const createStars = (starCount) => {
    for(let i = 0; i < starCount; i++){
        let xPos = Math.floor((Math.random() * world.width*2) -world.width);
        let yPos = Math.floor((Math.random() * world.height*2) -world.height);
        stars[i] = {x: xPos, y: yPos}
    }
};

createStars(3000);

const checkBullets = () => {
    const bullKeys = Object.keys(bullets);
    const shipKeys = Object.keys(ships);
    for(let i = 0; i < bullKeys.length; i++) {
    const bullet = bullets[bullKeys[i]];
        if(typeof bullet !== 'undefined'){
            bullet.life--;
            if(bullet.dir == 0){
            bullet.y -= bullet.speed;
            }    
            else if(bullet.dir == 1){
            bullet.x += bullet.speed;
            bullet.y -= bullet.speed;
            }
            else if(bullet.dir == 2){
            bullet.x += bullet.speed;
            }
            else if(bullet.dir == 3){
            bullet.x += bullet.speed;
            bullet.y += bullet.speed;
            }
            else if(bullet.dir == 4){
            bullet.y += bullet.speed;
            }
            else if(bullet.dir == 5){
            bullet.y += bullet.speed;
            bullet.x -= bullet.speed;
            }
            else if(bullet.dir == 6){
            bullet.x -= bullet.speed;
            }
            else if(bullet.dir == 7){
            bullet.x -= bullet.speed;
            bullet.y -= bullet.speed;
            }
            //io.sockets.in('room1').emit('bulletUpdate', bullet);
            for(let i = 0; i < shipKeys.length; i++) {
                const ship = ships[shipKeys[i]];
                if(ship.hash !== bullet.creator){
                    checkCollision(ship, bullet);
                }
            };
            if(bullet.life < 1){
                delete bullets[bullet.count];
            }
        }
    }
    io.sockets.in('room1').emit('bulletUpdate', bullets);
}


const checkCollision = (ship, bullet) => { 
    if(ship.x < bullet.x + bullet.width &&
    ship.x + ship.width > bullet.x &&
    ship.y < bullet.y + bullet.height &&
    ship.height + ship.y > bullet.y)
    {
        delete bullets[bullet.count];
        let data = {ship: ship, bullet: bullet};
        io.sockets.in('room1').emit('bulletHit', data);
        return true;
    }
};

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
    bulletSpeed: 5,
    shoot: false,
    canShoot: true,
  };
  //socket.square.x = Math.floor((Math.random() * 3546) - 1532);
  //socket.square.y = Math.floor((Math.random() * 1980) - 862);
  socket.square.destX = socket.square.x;
  socket.square.destY = socket.square.y;
  ships[socket.hash] = socket.square;
  socket.emit('joined', socket.square);
  socket.emit('setStars', stars);
  socket.emit('setWorld', world);
  socket.on('movementUpdate', (data) => {
    socket.square = data;
    ships[socket.hash] = socket.square;   
    socket.square.lastUpdate = new Date().getTime();
    //io.sockets.in('room1').emit('updatedMovement', socket.square);
    socket.broadcast.to('room1').emit('updatedMovement', socket.square);
  });

  socket.on('shoot', (data) => {
    bullets[bulletCount] = {x: data.x+data.width/2, y: data.y+data.height/2, dir: data.dir, speed: data.bulletSpeed, count: bulletCount, height: 7, width: 7, creator: data.hash, life: 180};
    //bulletIntervals[bulletCount] = setInterval(checkBulletCollision.bind(null, bullets[bulletCount]), 20);
    io.sockets.in('room1').emit('newBullet', bullets[bulletCount]);
    bulletCount++;
  });
  
  socket.on('disconnect', () => {
    io.sockets.in('room1').emit('left', socket.square.hash);
    socket.leave('room1');
  });
});

console.log(`listening on port ${PORT}`);

setInterval(checkBullets, 10);