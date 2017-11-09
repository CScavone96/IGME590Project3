"use strict";

let canvas;
let ctx;
let squares = {};
var socket = void 0;
var hash = void 0;
let userFocus = true;
let stars = [];
let powerUps = [];
let world = {};
let bullets={};
let keyState = {};
let spaceShip = null;
window.addEventListener('keydown',function(e){ keyState[e.keyCode || e.which] = true; },true);    
window.addEventListener('keyup',function(e){ keyState[e.keyCode || e.which] = false; },true);

const modifyFocus = (foc) => //Changes focus var
{
    userFocus = foc;
}

const updateHP = (data) => {
   if(!squares[data.hash]) {
	squares[data.hash] = data;
	return;
  }
  
  const square = squares[data.hash]; 
  
  if(squares[data.hash].lastUpdate >= data.lastUpdate) {
	return;
  } 
  square.lastUpdate = data.lastUpdate;
  square.hp = data.hp;
}


const respawn = (data) => { //Sets the players position for respawns
   if(!squares[data.hash]) {
	squares[data.hash] = data;
	return;
  }
  
  const square = squares[data.hash]; 
  
  square.lastUpdate = data.lastUpdate;
  square.x = data.x;
  square.y = data.y;
  square.destX = data.destX;
  square.destY = data.destY;
  square.alpha = 0;
  square.hp = data.hp;
}

const update = (data) => { //Updates square/ship data
  if(!squares[data.hash]) {
	squares[data.hash] = data;
	return;
  }
  
  const square = squares[data.hash]; 
  
  if(squares[data.hash].lastUpdate >= data.lastUpdate) {
	return;
  }

  square.lastUpdate = data.lastUpdate;
  square.prevX = data.prevX;
  square.prevY = data.prevY;
  square.destX = data.destX;
  square.destY = data.destY;
  square.alpha = 0;
  square.direction = data.direction;
  square.moveUp = data.moveUp;
  square.moveDown = data.moveDown;
  square.moveLeft = data.moveLeft;
  square.moveRight = data.moveRight;
  square.dir = data.dir;
  square.speed = data.speed;
  square.bulletSpeed = data.bulletSpeed;
  square.shoot = data.shoot;
  square.canShoot = data.canShoot;
  square.hp = data.hp;
};

const removeUser = (hash) => { //Removes a user from the 
  if(squares[hash]) {
	delete squares[hash];
  }
};

const setUser = (data) => {
  hash = data.hash;
  squares[hash] = data;
  setInterval(keyHandler, 20);
  requestAnimationFrame(redraw);
};

const setWorld = (data) => { //Sets world data from server
    world = data;
};

const setStars = (data) => { //Sets stars from server
    stars = data;
};

const setPowerUps = (data) => { //Sets powerups from server
    powerUps = data;
};


const lerp = (v0, v1, alpha) => { //Linear interpolation
  return (1 - alpha) * v0 + alpha * v1;
};

const updatePosition = () => { //Updates positions
  const square = squares[hash];

  square.prevX = square.x;
  square.prevY = square.y;
  if(square.moveLeft && square.destX > -1532) {
	square.destX -= square.speed;
  }
  if(square.moveRight && square.destX < 3546) {
	square.destX += square.speed;
  }
  if(square.moveDown && square.destY < 1980){
    square.destY += square.speed;
  }
  if(square.moveUp && square.destY > -862){
    square.destY -= square.speed;
  }
  square.alpha = 0;
  socket.emit('movementUpdate', square);
};

const clamp = (value, min, max) => { //Clamp two values
    if(value < min) return min;
    else if(value > max) return max;
    return value;
}

const powerUp = (data) => { //Handles power up collision
    squares[data.ship.hash].hp++;
}

const newBullet = (data) => { //Handles a new bullet
  bullets[data.count] = data;
}

const bulletHit = (data) => { //Handles a bullet collision
    squares[data.ship.hash].hp = data.ship.hp;
    delete bullets[data.bullet.count];
}

const bulletUpdate = (data) => { //Updates bullets collection
    bullets = data;
}


const redraw = (time) => { //Draws the game to the canvas and requests animation frames
  updatePosition();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle="#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let playerDraw = false;
  let playerSquare = squares[hash];
  var camX = clamp(-playerSquare.x + canvas.width/2 - playerSquare.width/2, -world.width/2, world.width/2 - canvas.width);
  var camY = clamp(-playerSquare.y + canvas.height/2 - playerSquare.height/2, -world.height/2, world.height/2 - canvas.height);
  ctx.translate( camX, camY );  
  
  for(let i = 0; i < stars.length; i++) {
    if(Math.hypot(playerSquare.x-stars[i].x, playerSquare.y-stars[i].y) < canvas.width){
        ctx.fillStyle="#ffffff";
        ctx.fillRect(stars[i].x, stars[i].y, stars[i].size, stars[i].size);  
    }  
  }      
  
  for(let i = 0; i < powerUps.length; i++) {
    if(Math.hypot(playerSquare.x-powerUps[i].x, playerSquare.y-powerUps[i].y) < canvas.width){
        ctx.fillStyle="#55d661";
        ctx.beginPath();
        ctx.arc(powerUps[i].x, powerUps[i].y,8,0,2*Math.PI);
        ctx.fill();
    }  
  }      
  
  const keys = Object.keys(squares);
  for(let i = 0; i < keys.length; i++) {

	const square = squares[keys[i]];

	if(square.alpha < 1) square.alpha += 0.05;

	if(square.hash === hash) {
      playerDraw = true;
	}
    
	square.x = lerp(square.prevX, square.destX, square.alpha);
	square.y = lerp(square.prevY, square.destY, square.alpha);
    if(playerDraw){
        playerDraw = false;
    }
    else{
        if(square.hp > 0)
        {
            ctx.font = '10px Verdana';
            ctx.textAlign="center";
            ctx.fillStyle="#00ffff";
            ctx.fillText(square.hp, square.x+ square.width/2, square.y + 50);
            ctx.filter = "hue-rotate(40deg)";
            ctx.fillStyle="#00ffff";
            drawRotated((square.dir)*(360/8), square);        
            ctx.strokeStyle="#ff00ff";
        }
    }
  }
  
  const bulls = Object.keys(bullets);
  for(let i = 0; i < bulls.length; i++) {
	let bullet = bullets[bulls[i]];
    ctx.fillStyle="#ff0000";
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);  
  }
   if(playerSquare.hp > 0)
    {
      ctx.filter = "none"
      ctx.font = '10px Verdana';
      ctx.textAlign="center";
      ctx.fillStyle="#ff00ff";
      ctx.fillText(playerSquare.hp, playerSquare.x + playerSquare.width/2, playerSquare.y + 50);
      ctx.fillStyle="#00ffff";
      drawRotated((playerSquare.dir)*(360/8), playerSquare);
      ctx.strokeStyle="#ff00ff";
    }
    requestAnimationFrame(redraw);
};

const drawRotated = (degrees, square) => { //Draws an image rotated
    ctx.save();
    let squareWidth = square.width*1//.25;
    let squareHeight = square.height*1//.25;
    ctx.translate(square.x+squareWidth/2, square.y+squareHeight/2 );
    ctx.rotate(degrees*Math.PI/180);
    ctx.drawImage(spaceShip, -squareWidth/2, -squareHeight/2);
    ctx.restore();
}

const keyHandler = () => { //Handles keys for movement shooting
	const square = squares[hash];
    if(square.hp > 0)
    {
        if(keyState[65] || keyState[37]) {
          square.moveLeft = true;
          square.dir = 6;
        }
        else{
          square.moveLeft = false;
        }
        if(keyState[68] || keyState[39]) {
          square.moveRight = true;
          square.dir = 2;
        }
        else{
          square.moveRight = false;
        }
        if(keyState[87] || keyState[38]) {
          square.moveUp = true;
          if(square.moveRight){
              square.dir = 1;
          }
          else if(square.moveLeft){
              square.dir = 7;
          }
          else{
              square.dir = 0;  
          }
        }
        else{
          square.moveUp = false;
        }
        if(keyState[83] || keyState[40]) {
          square.moveDown = true;
          if(square.moveRight){
              square.dir = 3;
          }
          else if(square.moveLeft){
              square.dir = 5;
          }
          else{
              square.dir = 4;
          }
        }
        else{
          square.moveDown = false;
        }
        if(keyState[32]){
          square.shoot = true;
          if(square.canShoot){
            socket.emit('shoot', square);
            square.canShoot = false;
          }
        }
        else{
          square.shoot = false;
          square.canShoot = true;
        }
    }
};

const init = () => { //Initializes client
    spaceShip = document.querySelector('#spaceShip');
	canvas = document.querySelector('#canvas');
	ctx = canvas.getContext('2d');
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false; 
	socket = io.connect();
	
	socket.on('joined', setUser);
    socket.on('setWorld', setWorld);
	socket.on('setStars', setStars);
    socket.on('setPowerUps', setPowerUps);
    socket.on('respawn', respawn);
    socket.on('updatedHP', updateHP);
	socket.on('updatedMovement', update);
    socket.on('powerUp', powerUp);	
    socket.on('newBullet', newBullet);   		
    socket.on('bulletHit', bulletHit);
    socket.on('bulletUpdate', bulletUpdate);
    
	socket.on('left', removeUser);
};

window.onload = init;
window.onblur = (function() //Handles blur detection
{
    keyState = {};
    modifyFocus(false);
});
window.onfocus = (function() //Handles reverse blur detection
{
    modifyFocus(true);
});