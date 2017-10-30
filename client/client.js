"use strict";

let canvas;
let ctx;
let squares = {};
var socket = void 0;
var hash = void 0;
let userFocus = true;
let stars = [];
let world = {};
let keyState = {};
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
};

const removeUser = (hash) => {
  if(squares[hash]) {
	delete squares[hash];
  }
};

const setUser = (data) => {
  hash = data.hash;
  squares[hash] = data;
  keyHandler();
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
  if(square.moveLeft && square.destX > -990) {
	square.destX -= 2;
  }
  if(square.moveRight && square.destX < 1435) {
	square.destX += 2;
  }
  if(square.moveDown && square.destY < 1585){
    square.destY += 2;
  }
  if(square.moveUp && square.destY > -990){
    square.destY -= 2;
  }
  square.alpha = 0;
  socket.emit('movementUpdate', square);
};

function clamp(value, min, max){
    if(value < min) return min;
    else if(value > max) return max;
    return value;
}

const redraw = (time) => {
  updatePosition();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  const keys = Object.keys(squares);
  let playerDraw = false;
  let playerData = null;
  
  for(let i = 0; i < keys.length; i++) {

	const square = squares[keys[i]];

	if(square.alpha < 1) square.alpha += 0.05;

	if(square.hash === hash) {
	  ctx.filter = "none"
      var camX = clamp(-square.x + canvas.width/2, -world.width/2, world.width/2 - canvas.width);
      var camY = clamp(-square.y + canvas.height/2, -world.height/2, world.height/2 - canvas.height);
      console.log(camY);
      ctx.translate( camX, camY );  
      playerDraw = true;
	}
	else {
	  ctx.filter = "hue-rotate(40deg)";
	}
    
	square.x = lerp(square.prevX, square.destX, square.alpha);
	square.y = lerp(square.prevY, square.destY, square.alpha);
    console.log(square.y);
    if(playerDraw){
        playerData = square;
        playerDraw = false;
    }
    else{
    ctx.fillStyle="#00ffff";
    ctx.fillRect(square.x, square.y, square.width, square.height);
    ctx.fillStyle="#FFFFFF";
    ctx.strokeRect(square.x, square.y, square.width, square.height);
    }
  }
  
  for(let i = 0; i < stars.length; i++) {
    ctx.strokeRect(stars[i].x, stars[i].y, 10, 10);  
  }
  
  if(playerData != null){
    ctx.fillStyle="#00ffff";
    ctx.fillRect(playerData.x, playerData.y, playerData.width, playerData.height);
    ctx.fillStyle="#FFFFFF";
    ctx.strokeRect(playerData.x, playerData.y, playerData.width, playerData.height);  
  }

  requestAnimationFrame(redraw);
};

const keyDownHandler = (e) => {
	var keyPressed = e.which;
	
	const square = squares[hash];
  
	if(keyPressed === 65 || keyPressed === 37) {
	  square.moveLeft = true;
	}
	else if(keyPressed === 68 || keyPressed === 39) {
	  square.moveRight = true;
	}
    else if(keyPressed === 87 || keyPressed === 38) {
	  square.moveUp = true;
	}
    else if(keyPressed === 83 || keyPressed === 40) {
	  square.moveDown = true;
	}
	if(square.moveUp || square.moveDown || square.moveLeft || square.moveRight) {
	  e.preventDefault();
	}
};

const keyHandler = () => {
	const square = squares[hash];
	if(keyState[65] || keyState[37]) {
	  square.moveLeft = true;
	}
    else{
      square.moveLeft = false;
    }
	if(keyState[68] || keyState[39]) {
	  square.moveRight = true;
	}
    else{
      square.moveRight = false;
    }
    if(keyState[87] || keyState[38]) {
	  square.moveUp = true;
	}
    else{
      square.moveUp = false;
    }
    if(keyState[83] || keyState[40]) {
	  square.moveDown = true;
	}
    else{
      square.moveDown = false;
    }
};

const keyUpHandler = (e) => {
	var keyPressed = e.which;
  
	const square = squares[hash];
	if(keyPressed === 65 || keyPressed === 37) {
	  square.moveLeft = false;
	}
	else if(keyPressed === 68 || keyPressed === 39) {
	  square.moveRight = false;
	}
    else if(keyPressed === 87 || keyPressed === 38) {
	  square.moveUp = false;
	}
    else if(keyPressed === 83 || keyPressed === 40) {
	  square.moveDown = false;
	}   
};

const init = () => {
	canvas = document.querySelector('#canvas');
	ctx = canvas.getContext('2d');

	socket = io.connect();
	
	socket.on('joined', setUser);
    socket.on('setWorld', setWorld);
	socket.on('setStars', setStars);
    
	socket.on('updatedMovement', update);
	
	socket.on('left', removeUser);
    setInterval(keyHandler, 20);
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