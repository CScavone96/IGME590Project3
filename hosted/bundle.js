"use strict";

let canvas;
let ctx;
let squares = {};
var socket = void 0;
var hash = void 0;
let userFocus = true;
let stars = [];
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

const update = (data) => {
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
};

const removeUser = (hash) => {
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

const setWorld = (data) => {
    //console.log(data);
    world = data;
};

const setStars = (data) => {
    //console.log(data);
    stars = data;
};

const lerp = (v0, v1, alpha) => {
  return (1 - alpha) * v0 + alpha * v1;
};

const updatePosition = () => {
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

const clamp = (value, min, max) => {
    if(value < min) return min;
    else if(value > max) return max;
    return value;
}

const newBullet = (data) => {
  bullets[data.count] = data;
}

const bulletHit = (data) => {
    delete bullets[data.bullet.count];
}

const bulletUpdate = (data) => {
    bullets[data.count] = data;
}


const redraw = (time) => {
  updatePosition();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle="#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let playerDraw = false;
  let playerSquare = squares[hash];
  var camX = clamp(-playerSquare.x + canvas.width/2 - playerSquare.width/2, -world.width/2, world.width/2 - canvas.width);
  var camY = clamp(-playerSquare.y + canvas.height/2 - playerSquare.height/2, -world.height/2, world.height/2 - canvas.height);
  //console.log(camX);
  ctx.translate( camX, camY );  
  
  for(let i = 0; i < stars.length; i++) {
    if(Math.hypot(playerSquare.x-stars[i].x, playerSquare.y-stars[i].y) < canvas.width){
        ctx.fillStyle="#ffffff";
        ctx.fillRect(stars[i].x, stars[i].y, 10, 10);  
    }  
  }      
  const keys = Object.keys(squares);
  for(let i = 0; i < keys.length; i++) {

	const square = squares[keys[i]];

	if(square.alpha < 1) square.alpha += 0.05;

	if(square.hash === hash) {
	  //ctx.filter = "none"
      playerDraw = true;
	}
	else {
	  //ctx.filter = "hue-rotate(40deg)";
	}
    
	square.x = lerp(square.prevX, square.destX, square.alpha);
	square.y = lerp(square.prevY, square.destY, square.alpha);
    //console.log(square.x);
    if(playerDraw){
        playerDraw = false;
    }
    else{
        ctx.filter = "hue-rotate(40deg)";
        ctx.fillStyle="#00ffff";
        //console.log(square.dir);       
        drawRotated((square.dir)*(360/8), square);        
        //ctx.drawImage(spaceShip, square.x, square.y, square.width, square.height);
        //ctx.fillRect(square.x, square.y, square.width, square.height);
        ctx.strokeStyle="#ff00ff";
        ctx.strokeRect(square.x, square.y, square.width, square.height);
    }
  }
  
  const bulls = Object.keys(bullets);
  for(let i = 0; i < bulls.length; i++) {
	let bullet = bullets[bulls[i]];
    console.log(bullets);
    /*if(bullet.dir == 0){
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
    }*/
    ctx.fillStyle="#00ffff";
    ctx.fillRect(bullet.x, bullet.y, 7, 7);  
  }
  
  ctx.filter = "none"
  ctx.fillStyle="#00ffff";
  //console.log(playerSquare.dir);
  drawRotated((playerSquare.dir)*(360/8), playerSquare);
  //ctx.drawImage(spaceShip, playerSquare.x, playerSquare.y, playerSquare.width, playerSquare.height);
  ctx.strokeStyle="#ff00ff";
  ctx.strokeRect(playerSquare.x, playerSquare.y, playerSquare.width, playerSquare.height);  
  requestAnimationFrame(redraw);
};

const drawRotated = (degrees, square) => { 
    //ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    //ctx.translate(canvas.width/2,canvas.height/2);
    let squareWidth = square.width*1//.25;
    let squareHeight = square.height*1//.25;
    ctx.translate(square.x+squareWidth/2, square.y+squareHeight/2 );
    ctx.rotate(degrees*Math.PI/180);
    ctx.drawImage(spaceShip, -squareWidth/2, -squareHeight/2, squareWidth, squareHeight);
    ctx.restore();
}

const keyHandler = () => {
	const square = squares[hash];
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
};

const init = () => {
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

	socket.on('updatedMovement', update);
		
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