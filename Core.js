//create the canvas and define width,height...
var ctx = document.getElementsByClassName("canvas")[0].getContext("2d");
ctx.font = "30 sans-serif";
var HEIGHT = 500;
var WIDTH = 500;
var timeWhenGameStarted = Date.now();
var frameCount = 0;
var score = 0;

var enemyList = {};
var upgradeList = {};
var bulletList = {};
var player;

//create player

Player = function () {
  var self = Actor("player", 50, 40, 30, 5, "E1", 20, 20, "green", 10, 1);
  console.log(self);
  self.updatePosition = function () {
    if (self.pressingRight) {
      self.x += 10;
    }
    if (self.pressingLeft) {
      self.x -= 10;
    }
    if (self.pressingUp) {
      self.y -= 10;
    }
    if (self.pressingDown) {
      self.y += 10;
    }

    if (self.x < self.width / 2) {
      self.x = self.width / 2;
    }
    if (self.x > WIDTH - self.width / 2) {
      self.x = WIDTH - self.width / 2;
    }
    if (self.y < self.height / 2) {
      self.y = self.height / 2;
    }
    if (self.y > HEIGHT - self.height / 2) {
      self.y = HEIGHT - self.height / 2;
    }
  };

  let superUpdate = self.update;
  if (self.hp <= 0) {
    superUpdate();
    let timeSurvived = Date.now() - timeWhenGameStarted;
    console.log("You lost! You survived for " + timeSurvived + " ms. ");
    startNewGame();
  }

  self.pressingDown = false;
  self.pressingUp = false;
  self.pressingLeft = false;
  self.pressingRight = false;

  return self;
};

Entity = function (type, x, y, spdX, spdY, id, width, height, color) {
  let self = {
    type: type,
    x: x,
    y: y,
    spdX: spdX,
    spdY: spdY,
    id: id,
    width: width,
    height: height,
    color: color,
  };
  self.update = function () {
    self.updatePosition();
    self.draw();
  };

  self.draw = function () {
    ctx.save();
    ctx.fillStyle = self.color;
    ctx.fillRect(
      self.x - self.width / 2,
      self.y - self.height / 2,
      self.width,
      self.height
    );
    ctx.restore();
  };

  self.updatePosition = function () {
    self.x += self.spdX;
    self.y += self.spdY;

    if (self.x < 0 || self.x > WIDTH) {
      self.spdX = -self.spdX;
    }
    if (self.y < 0 || self.y > HEIGHT) {
      self.spdY = -self.spdY;
    }
  };

  self.getDistance = function (entity2) {
    let vx = self.x - entity2.x;
    let vy = self.y - entity2.y;
    return Math.sqrt(vx * vx + vy * vy);
  };

  self.testCollision = function (rect1, rect2) {
    return (
      rect1.x <= rect2.x + rect2.width &&
      rect2.x <= rect1.x + rect1.width &&
      rect1.y <= rect2.y + rect2.height &&
      rect2.y <= rect1.y + rect1.height
    );
  };

  self.checkIfColliding = function (entity2) {
    var rect1 = {
      x: self.x - self.width / 2,
      y: self.y - self.height / 2,
      width: self.width,
      height: self.height,
    };
    var rect2 = {
      x: entity2.x - entity2.width / 2,
      y: entity2.y - entity2.height / 2,
      width: entity2.width,
      height: entity2.height,
    };
    return self.testCollision(rect1, rect2);
  };

  return self;
};

Actor = function (
  type,
  x,
  y,
  spdX,
  spdY,
  id,
  width,
  height,
  color,
  hp,
  attackSpeed
) {
  let self = Entity(type, x, y, spdX, spdY, id, width, height, color);
  self.hp = hp;
  self.attackSpeed = attackSpeed;
  self.attackCounter = 0;
  self.aimAngle = 0;

  var super_update = self.update;
  self.update = function () {
    super_update();
    self.attackCounter += self.attackSpeed;
  };

  self.performAttack = function () {
    if (self.attackCounter > 25) {
      //every 1 sec
      self.attackCounter = 0;
      generateBullet(self);
    }
  };
  self.performSpecialAttack = function () {
    if (self.attackCounter > 50) {
      //every 1 sec
      self.attackCounter = 0;
      /*
			for(var i = 0 ; i < 360; i++){
				generateBullet(self,i);
			}
			*/
      generateBullet(self, self.aimAngle - 5);
      generateBullet(self, self.aimAngle);
      generateBullet(self, self.aimAngle + 5);
    }
  };
  return self;
};

Enemy = function (x, y, spdX, spdY, id, width, height, color) {
  let self = Actor("enemy", x, y, spdX, spdY, id, width, height, color, 10, 1);

  let superUpdate = self.update;
  self.update = function () {
    superUpdate();
    self.performAttack();
    var isColliding = self.checkIfColliding(player);
    if (isColliding) {
      player.hp = player.hp - 1;
    }
  };

  enemyList[id] = self;
};

Upgrade = function (x, y, spdX, spdY, id, width, height, color, category) {
  let self = Actor("upgrade", x, y, spdX, spdY, id, width, height, color);

  let superUpdate = self.update;
  self.update = function () {
    superUpdate();

    var isColliding = self.checkIfColliding(player);
    if (isColliding) {
      if (self.category === "score") {
        score += 1000;
      } else {
        player.attackSpeed += 5;
      }

      delete upgradeList[self.id];
    }
  };
};

Bullet = function (x, y, spdX, spdY, id, width, height) {
  let self = Actor("bullet", x, y, spdX, spdY, id, width, height, "black");
  self.timer = 0;
  bulletList[id] = self;
  let superUpdate = self.update;
  self.update = function () {
    superUpdate();
    self.timer++;
    let toRemove = false;
    if (self.timer > 100) {
      toRemove = true;
    }
    if (toRemove) {
      delete bulletList[self.id];
    }
  };
};

randomlyGenerateEnemy = function () {
  let x = Math.random() * WIDTH;
  let y = Math.random() * HEIGHT;
  let height = 10 + Math.random() * 30;
  let width = 10 + Math.random() * 30;
  let id = Math.random();
  let spdX = 5 + Math.random() * 5;
  let spdY = 5 + Math.random() * 5;
  let r = Math.floor(Math.random() * 256);
  let g = Math.floor(Math.random() * 256);
  let b = Math.floor(Math.random() * 256);
  let color = `rgb(${r}, ${g}, ${b})`;
  Enemy(x, y, spdX, spdY, id, width, height, color);
};

randomlyGenerateUpgrade = function () {
  let x = Math.random() * WIDTH;
  let y = Math.random() * HEIGHT;
  let height = 10;
  let width = 10;
  let id = Math.random();
  let spdX = 0;
  let spdY = 0;
  let category = "score";
  let color = "orange";

  if (Math.random() >= 0.5) {
    category = "high";
    color = "purple";
  }

  Upgrade(x, y, spdX, spdY, id, width, height, color, category);
};

generateBullet = function (actor, overwriteAngle) {
  let x = actor.x;
  let y = actor.y;
  let height = 10;
  let width = 10;
  let id = Math.random();

  var angle = actor.aimAngle;
  if (overwriteAngle !== undefined) {
    angle = overwriteAngle;
  }

  let spdX = Math.cos((angle / 180) * Math.PI) * 5;
  let spdY = Math.sin((angle / 180) * Math.PI) * 5;

  Bullet(x, y, spdX, spdY, id, width, height);
};

document.onmousemove = function (mouse) {
  var mouseX =
    mouse.clientX -
    document.getElementsByClassName("canvas")[0].getBoundingClientRect().left;
  var mouseY =
    mouse.clientY -
    document.getElementsByClassName("canvas")[0].getBoundingClientRect().top;

  mouseX -= player.x;
  mouseY -= player.y;
  player.aimAngle = (Math.atan2(mouseY, mouseX) / Math.PI) * 180;
};

document.addEventListener("keydown", function (event) {
  if (event.key === "ArrowDown") {
    player.pressingDown = true;
  } else if (event.key === "ArrowUp") {
    player.pressingUp = true;
  } else if (event.key === "ArrowLeft") {
    player.pressingLeft = true;
  } else if (event.key === "ArrowRight") {
    player.pressingRight = true;
  }
});

document.addEventListener("keyup", function (event) {
  if (event.key === "ArrowDown") {
    player.pressingDown = false;
  } else if (event.key === "ArrowUp") {
    player.pressingUp = false;
  } else if (event.key === "ArrowLeft") {
    player.pressingLeft = false;
  } else if (event.key === "ArrowRight") {
    player.pressingRight = false;
  }
});

document.onclick = function (mouse) {
  player.performAttack();
};

document.oncontextmenu = function (mouse) {
  player.performSpecialAttack();
  mouse.preventDefault();
};

update = function () {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  frameCount++;
  score++;
  if (frameCount % 100 === 0) {
    randomlyGenerateEnemy();
  }

  if (frameCount % 75 === 0) {
    randomlyGenerateUpgrade();
  }

  for (var key in bulletList) {
    bulletList[key].update();
  }

  for (var key in upgradeList) {
    upgradeList[key].update();
  }

  for (var key in enemyList) {
    enemyList[key].update();
  }

  player.update();

  ctx.fillText(player.hp + " HP", 0, 30);
  ctx.fillText("SCORE: " + score, 200, 30);
};

startNewGame = function () {
  player.hp = 10;
  score = 0;
  timeWhenGameStarted = Date.now();
  enemyList = {};
  upgradeList = {};
  bulletList = {};
  frameCount = 0;
  randomlyGenerateEnemy();
  randomlyGenerateEnemy();
  randomlyGenerateEnemy();
};

player = Player();

startNewGame();

setInterval(update, 1000 / 25);
