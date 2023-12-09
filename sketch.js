var VTX = VTX68;

var TRI;
if (VTX == VTX7) {
  TRI = TRI7;
} else if (VTX == VTX33) {
  TRI = TRI33;
} else if (VTX == VTX68) {
  TRI = TRI68;
} else {
  TRI = TRI468;
}

var facemeshModel = null;

var videoDataLoaded = false; // is webcam capture ready?

var statusText = "Loading facemesh model...";

var myFaces = []; // faces detected in this browser
// currently facemesh only supports single face, so this will be either empty or singleton

var capture; // webcam capture, managed by p5.js

// Load the MediaPipe facemesh model assets.
facemesh.load().then(function (_model) {
  console.log("model initialized.");
  statusText = "Model loaded.";
  facemeshModel = _model;
});

let canvas;

let font;
let title;
let title_bounce = [];
let title_bounce_bg = [];
let title_transition = [];
let game_ui;
let finish_ui;
let finish_ui2;
let bgm;
let eatSound = [];
let transition_sound;
let camera_sound;
let cap;
let obj = [];
let objCount = 0;
let m;
let b = [];
let ui;
let resetButton;
let start = false;
let screenShot = false;
let uneatenBurgers = 0;
let eatenCount = 0;

function preload() {
  font = loadFont("fonts/BADABB.ttf");
  title = loadImage("images/Title.png");
  for (let i = 0; i < 89; i++) {
    // title_bounce[i] = loadImage(`images/title_bounce/bounce${i}.png`);
    title_bounce_bg[i] = loadImage(`images/title_bounce_bg/intro_back${i}.png`);
  }
  for (let i = 0; i < 136; i++) {
    // title_bounce[i] = loadImage(`images/title_bounce/bounce${i}.png`);
    title_transition[i] = loadImage(`images/title_transition/${i}.png`);
  }
  for (let i = 0; i < 5; i++) {
    obj[i] = loadImage(`images/burgers/obj_gif_${i}.gif`);
  }
  for (let i = 0; i < 3; i++) {
    eatSound[i] = loadSound(`sounds/먹는소리${i}.mp3`);
  }
  bgm = loadSound("sounds/스폰지밥 브금.mp3");
  transition_sound = loadSound("sounds/거품소리.mp3");
  camera_sound = loadSound("sounds/카메라소리.mp3");
  resetButton = loadImage("images/gameUI/restart.png");
  game_ui = loadImage("images/gameUI/game_ui2.png");
  finish_ui = loadImage("images/gameUI/finish_ui1.png");
  finish_ui2 = loadImage("images/gameUI/finish_ui2.png");
  cap = loadImage("images/gameUI/맥날모자.png");
}

function setup() {
  canvas = createCanvas(window.innerWidth, window.innerHeight);
  capture = createCapture(VIDEO, () => {
    hands.send({ image: capture.elt });
  });

  rectMode(CENTER);
  imageMode(CENTER);
  textFont(font);

  bgm.loop();
  eatSound[1].setVolume(3);
  eatSound[2].setVolume(0.5);

  ui = new UI(width / 2, height / 2);
  m = new Mouth();
  for (let i = 0; i < 20; i++) {
    b.push(
      new Burger(
        random(capture.width * 2),
        random(capture.height * 0.6, capture.height * 2.4),
        b.length
      )
    );
  }
  objCount = b.length;

  // this is to make sure the capture is loaded before asking facemesh to take a look
  // otherwise facemesh will be very unhappy
  capture.elt.onloadeddata = function () {
    console.log("video initialized");
    videoDataLoaded = true;
    // hands.send({ image: capture.elt });
  };

  capture.hide();
}

// draw a face object returned by facemesh
function drawFaces(faces, filled) {
  for (var i = 0; i < faces.length; i++) {
    const keypoints = faces[i].scaledMesh;
    for (var j = 0; j < keypoints.length; j++) {
      const [x, y, z] = keypoints[j];
      circle(x, y, 5);
      push();
      strokeWeight(1);
      text(j, x, y);
      pop();
    }

    for (var j = 0; j < TRI.length; j += 3) {
      var a = keypoints[TRI[j]];
      var b = keypoints[TRI[j + 1]];
      var c = keypoints[TRI[j + 2]];

      if (filled) {
        var d = [(a[0] + b[0] + c[0]) / 6, (a[1] + b[1] + c[1]) / 6];
        var color = get(...d);
        fill(color);
        noStroke();
      }
      triangle(a[0], a[1], b[0], b[1], c[0], c[1]);
    }
  }
}

// reduces the number of keypoints to the desired set
// (VTX7, VTX33, VTX68, etc.)
function packFace(face, set) {
  var ret = {
    scaledMesh: [],
  };
  for (var i = 0; i < set.length; i++) {
    var j = set[i];
    ret.scaledMesh[i] = [
      face.scaledMesh[j][0],
      face.scaledMesh[j][1],
      face.scaledMesh[j][2],
    ];
  }
  return ret;
}

function drawHands() {
  for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
    for (let j = 0; j < detections.multiHandLandmarks[i].length; j++) {
      let x = detections.multiHandLandmarks[i][j].x * width;
      let y = detections.multiHandLandmarks[i][j].y * height;
      let z = detections.multiHandLandmarks[i][j].z;
      stroke(255);
      strokeWeight(10);
      point(x, y);
      text(j, x, y);
    }
  }
}

function drawLines(index) {
  stroke(0, 0, 255);
  strokeWeight(3);
  for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
    for (let j = 0; j < index.length - 1; j++) {
      let x = detections.multiHandLandmarks[i][index[j]].x * width;
      let y = detections.multiHandLandmarks[i][index[j]].y * height;
      // let z = detections.multiHandLandmarks[i][index[j]].z;

      let _x = detections.multiHandLandmarks[i][index[j + 1]].x * width;
      let _y = detections.multiHandLandmarks[i][index[j + 1]].y * height;
      // let _z = detections.multiHandLandmarks[i][index[j+1]].z;
      line(x, y, _x, _y);
    }
  }
}

function drawLandmarks(indexArray, hue) {
  noFill();
  strokeWeight(8);
  for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
    for (let j = indexArray[0]; j < indexArray[1]; j++) {
      let x = detections.multiHandLandmarks[i][j].x * width;
      let y = detections.multiHandLandmarks[i][j].y * height;
      // let z = detections.multiHandLandmarks[i][j].z;
      stroke(hue, 40, 255);
      point(x, y);
    }
  }
}

function handDetect() {
  for (let i = 0; i < detections.multiHandLandmarks.length; i++) {
    // for (let j = 0; j < detections.multiHandLandmarks[i].length; j++) {
    //
    let baseX = detections.multiHandLandmarks[i][0].x * width;
    let baseY = detections.multiHandLandmarks[i][0].y * height;
    let thumbX = detections.multiHandLandmarks[i][4].x * width;
    let thumbY = detections.multiHandLandmarks[i][4].y * height;
    let thumbCheckX = detections.multiHandLandmarks[i][14].x * width;
    let thumbCheckY = detections.multiHandLandmarks[i][14].y * height;
    let indexX = detections.multiHandLandmarks[i][8].x * width;
    let indexY = detections.multiHandLandmarks[i][8].y * height;
    let middleX = detections.multiHandLandmarks[i][12].x * width;
    let middleY = detections.multiHandLandmarks[i][12].y * height;
    let ringX = detections.multiHandLandmarks[i][16].x * width;
    let ringY = detections.multiHandLandmarks[i][16].y * height;
    let pinkyX = detections.multiHandLandmarks[i][20].x * width;
    let pinkyY = detections.multiHandLandmarks[i][20].y * height;
    let distRingToBase = dist(ringX, ringY, baseX, baseY);
    let distPinkyToBase = dist(pinkyX, pinkyY, baseX, baseY);
    let distIndexToRing = dist(indexX, indexY, ringX, ringY);
    let distMiddleToPinky = dist(middleX, middleY, pinkyX, pinkyY);
    let distThumbToThumbCheck = dist(thumbX, thumbY, thumbCheckX, thumbCheckY);
    if (
      distRingToBase < 300 &&
      distPinkyToBase < 300 &&
      distThumbToThumbCheck < 100 &&
      distIndexToRing > 100 &&
      distMiddleToPinky > 100 &&
      ui.timeOver
    ) {
      screenShot = true;
      // push();
      // textSize(200);
      // textAlign(CENTER, CENTER);
      // fill(255);
      // text("V detected", width / 2, height / 2);
      // pop();
    } else {
      screenShot = false;
    }
    // }
  }
}

function draw() {
  strokeJoin(ROUND); //otherwise super gnarly
  if (facemeshModel && videoDataLoaded) {
    // model and video both loaded,

    facemeshModel.estimateFaces(capture.elt).then(function (_faces) {
      // we're faceling an async promise
      // best to avoid drawing something here! it might produce weird results due to racing

      myFaces = _faces.map((x) => packFace(x, VTX)); // update the global myFaces object with the detected faces

      // console.log(myFaces);
      if (!myFaces.length) {
        // haven't found any faces
        statusText = "Show some faces!";
      } else {
        // display the confidence, to 3 decimal places
        statusText =
          "Confidence: " +
          Math.round(_faces[0].faceInViewConfidence * 1000) / 1000;
      }
    });

    if (capture.elt.readyState >= 2) {
      hands.send({ image: capture.elt });
    }
  }

  background(0);
  push();
  translate(
    width / 2 - capture.width * -1.15,
    height / 2 - capture.height * 1.15
  );
  // translate(width / 2, height / 2);
  scale(-2.3, 2.3);
  // first draw the debug video and annotations
  // push();
  // scale(3); // downscale the webcam capture before drawing, so it doesn't take up too much screen sapce
  if (ui.title_transition_index > 90) {
    image(
      capture,
      -(capture.width * -1.15) / 2.3,
      -(capture.height * -1.15) / 2.3,
      capture.width,
      capture.height
    );
  }
  // noFill();
  // stroke(255, 0, 0);
  // translate(-width / 8, -height / 4);
  // drawFaces(myFaces); // draw my face skeleton
  // pop();

  // now draw all the other users' faces (& drawings) from the server
  // push();

  // scale(1);
  // strokeWeight(3);
  // noFill();
  // drawFaces(myFaces);
  // pop();

  // push();
  // fill(255, 0, 0);
  // text(statusText, 2, 60);

  m.display();

  for (let i = 0; i < b.length; i++) {
    b[i].display();
    if (b[i].eaten) {
    }
  }

  if (b.length < 20) {
    b.push(
      new Burger(
        random(width / 60, width / 3.4),
        random(height / 11, height / 3.1),
        b.length
      )
    );
  }

  b = b.filter((burger) => !(burger.eaten && burger.size < 1));

  // uneatenBurgers = b.filter((burger) => !burger.eaten).length;

  ui.score = eatenCount / 19;
  pop();
  push();
  // handDetect();
  if (detections != undefined) {
    if (detections.multiHandLandmarks != undefined) {
      handDetect();
      // drawParts();

      // drawLines([0, 5, 9, 13, 17, 0]); //palm
      // drawLines([0, 1, 2, 3, 4]); //thumb
      // drawLines([5, 6, 7, 8]); //index finger
      // drawLines([9, 10, 11, 12]); //middle finger
      // drawLines([13, 14, 15, 16]); //ring finger
      // drawLines([17, 18, 19, 20]); //pinky

      // drawLandmarks([0, 1], 0); //palm base
      // drawLandmarks([1, 5], 60); //thumb
      // drawLandmarks([5, 9], 120); //index finger
      // drawLandmarks([9, 13], 180); //middle finger
      // drawLandmarks([13, 17], 240); //ring finger
      // drawLandmarks([17, 21], 300); //pinky
      // drawHands();
    }
  }
  pop();

  ui.display();
  // text(uneatenBurgers, 20, 20);
  // text(ui.score, 20, 20);
  // text(b.length, 20, 40);
  // image(game_ui, width / 2, height / 2, width, height);
  // ellipse(width / 2, 20, 40);
  // ellipse(width / 2, height - 20, 40);
}

class Mouth {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.size = 20;
    this.mouthLimit = 300;

    this.mouthOpen = false;
    this.eat = false;
  }

  display() {
    this.update();

    // fill(0);
    // ellipse(this.pos.x, this.pos.y, this.mouthSize);
    // fill(255);
    // text(`mouthOpen: ${this.mouthOpen}`, this.pos.x, this.pos.y);
    // text(`eat: ${this.eat}`, this.pos.x, this.pos.y + 20);
  }

  update() {
    if (myFaces.length > 0) {
      if (this.mouthDistance > this.checkDistance / 3) {
        this.mouthOpen = true;
      } else {
        // this.mouthOpen = false;
      }
      //입 열린 상태에서 닫으면 eat
      if (this.mouthOpen && this.mouthSize < this.checkDistance / 10) {
        // if (this.mouthDistance < 10) {
        this.eat = true;
        this.mouthOpen = false;
        // }
      } else {
        this.eat = false;
      }
      const keypoints = myFaces[0].scaledMesh;
      let pt0 = 8;
      let pt0_ = 27;
      let pt1 = 51;
      let pt2 = 57;
      this.pos.set(
        keypoints[pt1][0],
        (keypoints[pt1][1] + keypoints[pt2][1]) / 2
      );
      this.checkDistance = dist(
        keypoints[pt0][0],
        keypoints[pt0][1],
        keypoints[pt0_][0],
        keypoints[pt0_][1]
      );
      this.mouthDistance = dist(
        keypoints[pt1][0],
        keypoints[pt1][1],
        keypoints[pt2][0],
        keypoints[pt2][1]
      );
      this.mouthSize = this.mouthDistance;
      this.mouthSize = map(
        this.mouthDistance,
        this.checkDistance / 6,
        200,
        0,
        350
      );
      this.mouthSize = constrain(this.mouthSize, 0, 350);
    }
  }
}

class Burger {
  constructor(x, y, id) {
    this.pos = createVector(x, y);
    this.size = 0;
    this.id = id;

    this.randNum = floor(random(5));

    this.check = false;
    this.eaten = false;

    this.distance = 0;
  }

  display() {
    this.update();
    push();
    translate(this.pos.x, this.pos.y);
    fill(100, 255, 0);
    if (floor(this.size) > 0) {
      for (let i = 0; i < obj.length; i++) {
        image(obj[this.randNum], 0, 0, this.size * 1.2, this.size);
      }
      // ellipse(0, 0, this.size);
    }
    // fill(0, 100, 255);
    // text(`check: ${this.check}`, 0, 0);
    // text(`eaten: ${this.eaten}`, 0, 10);
    // text(`id: ${this.id}`, 0, 20);
    pop();
  }

  update() {
    if (ui.gameStart && !this.eaten && !ui.timeOver) {
      this.size = lerp(this.size, 60, 0.2);
    }
    //거리 체킹
    this.checkDir = p5.Vector.sub(m.pos, this.pos);
    this.checkDist = this.checkDir.mag();

    if (this.checkDist < m.mouthSize / 2) {
      this.check = true;
    }

    if (this.check) {
      this.pos = p5.Vector.lerp(m.pos, this.pos, 0.7);
      if (m.eat) {
        this.eaten = true;
      }
    }
    if (this.eaten) {
      if (this.size > 59) {
        eatSound[floor(random(3))].play();
      }
      this.size = lerp(this.size, 0, 0.2);
      eatenCount++;
    }
    if (ui.timeOver) {
      this.size = lerp(this.size, 0, 0.2);
    }
  }
}

function mousePressed() {
  ui.transiton = true;
  ui.title = false;
}

class UI {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.resetPos = createVector(width / 2, height / 1.25);

    this.screenShotCount = 0;
    this.score = 0;

    this.title = true;
    this.start = false;
    this.gameStartCount = 5;
    this.gameStart = false;
    this.timer = 20;
    this.timeOver = false;

    this.size = 0;
    // this.size2 = 0;

    this.title_index = 0;
    this.title_transition_index = 0;
    this.transition = false;
  }

  display() {
    //
    if (this.title) {
      this.titleUI();
    } else {
      this.start = true;
    }
    if (this.start) {
      this.startUI();
    }
    if (this.timeOver) {
      // if (!screenShot) {
      this.scoreUI();
      // }
      this.screenShotCountUI();
    }
  }

  titleUI() {
    this.title_index++;
    if (this.title_index > 88) {
      this.title_index = 0;
    }
    push();
    translate(width / 2, height / 2);
    fill(80);
    rect(0, 0, width, height);
    image(title_bounce_bg[this.title_index], 0, 0, width, height);
    fill(255);
    textSize(40);
    textAlign(CENTER, CENTER);
    text(`Click to START`, 0, height / 2.4);
    pop();
  }

  startUI() {
    if (this.title_transition_index < 90) {
      this.title_index++;
      if (this.title_index > 88) {
        this.title_index = 0;
      }
      push();
      translate(width / 2, height / 2);
      fill(80);
      rect(0, 0, width, height);
      image(title_bounce_bg[this.title_index], 0, 0, width, height);
      fill(255);
      textSize(40);
      textAlign(CENTER, CENTER);
      text(`Click to START`, 0, height / 2.4);
      pop();
    }
    if (ui.title_transition_index > 90) {
      if (this.gameStart && !this.timeOver) {
        if (frameCount % 60 == 0) {
          this.timer -= 1;
        }
        if (this.timer < 0) {
          this.timer = 0;
          this.start = false;
          this.timeOver = true;
        }
        this.size = 0;
        push();
        translate(width / 2, height / 2);
        image(game_ui, 0, 0, width, height);
        fill(255);
        textSize(60);
        textAlign(CENTER, CENTER);
        text(`${round(this.timer)}`, width / 60, -height / 2.34);
        textSize(80);
        text(`${round(this.score)}`, 0, height / 2.45);
        pop();
      } else if (!this.gameStart && !this.timeOver) {
        push();
        translate(width / 2, height / 2);
        image(game_ui, 0, 0, width, height);
        fill(255);
        textSize(height / 3);
        textAlign(CENTER, CENTER);
        if (!this.gameStart && this.gameStartCount > 0) {
          text(`${round(this.gameStartCount)}`, 0, -height / 30);
        }
        if (this.gameStartCount == 0) {
          textSize(this.size);
          text("START", 0, -height / 30);
        }
        pop();
      }
    }
    image(
      title_transition[this.title_transition_index],
      width / 2,
      height / 2,
      width,
      height
    );
    if (this.title_transition_index < 135) {
      this.title_transition_index++;
      // this.title_transition_index = 136;
    }
    if (this.title_transition_index == 6) {
      transition_sound.play();
    }
    if (floor(this.title_transition_index) == 135) {
      if (frameCount % 60 == 0) {
        this.gameStartCount -= 1;
      }
      if (this.gameStartCount < 0) {
        this.gameStartCount = 0;
        this.gameStart = true;
      }
      if (this.gameStartCount == 0) {
        this.size = lerp(this.size, 300, 0.2);
      }
    }
  }

  scoreUI() {
    //
    // const keypoints = myFaces[0].scaledMesh;
    // let pt1 = 21;
    // let pt2 = 23;

    // this.scorePos1 = createVector(keypoints[pt1][0], keypoints[pt1][1]);
    // this.scorePos2 = createVector(keypoints[pt2][0], keypoints[pt2][1]);

    if (myFaces.length > 0) {
      const keypoints = myFaces[0].scaledMesh;
      let pt1 = 21;
      let pt2 = 23;

      this.scorePos1 = createVector(keypoints[pt1][0], keypoints[pt1][1]);
      this.scorePos2 = createVector(keypoints[pt2][0], keypoints[pt2][1]);
      this.scorePos = p5.Vector.lerp(this.scorePos1, this.scorePos2, 0.5);
      this.scoreDist = p5.Vector.dist(this.scorePos1, this.scorePos2);

      if (!screenShot) {
        let mouse = createVector(mouseX, mouseY);
        let distance = p5.Vector.dist(mouse, this.resetPos);
        if (distance < width / 16) {
          image(
            resetButton,
            this.resetPos.x,
            this.resetPos.y,
            (this.size / 280) * (width / 5),
            (this.size / 280) * (height / 5)
          );
          if (mouseIsPressed) {
            location.reload();
          }
        } else {
          image(
            resetButton,
            this.resetPos.x,
            this.resetPos.y,
            ((this.size / 280) * width) / 6,
            ((this.size / 280) * height) / 6
          );
        }
      }
      push();
      translate(
        width / 2 - capture.width * -1.15,
        height / 2 - capture.height * 1.15
      );
      scale(2.3, 2.3);
      fill(255);
      textSize(this.scoreDist / 2);
      textAlign(CENTER, CENTER);
      if (!screenShot) {
        fill(255, 40, 100);
        text(
          `Score ${round(this.score)}`,
          -this.scorePos.x,
          this.scorePos.y - this.scoreDist * 2.5
        );
      } else {
        image(
          cap,
          -this.scorePos.x,
          this.scorePos.y - this.scoreDist * 2.5,
          this.scoreDist * 2,
          this.scoreDist * 2
        );
        textSize(this.scoreDist / 3);
        fill(255, 40, 100);
        text(
          `${round(this.score)}`,
          -this.scorePos.x + this.scoreDist * 0.12,
          this.scorePos.y - this.scoreDist * 3.1
        );
      }
      pop();
    }
    this.size = lerp(this.size, 300, 0.2);
    push();
    translate(width / 2, height / 2);
    fill(255);
    if (!screenShot) {
      image(finish_ui, 0, 0, width, height);
      textSize(this.size);
      textAlign(CENTER, CENTER);
      text(`Time Over`, 0, -height / 10);
      textSize(this.size / 4);
      text(`V-Gesture to take a photo`, 0, height / 10);
    } else {
      image(finish_ui2, 0, 0, width, height);
    }
    pop();
  }

  screenShotCountUI() {
    //
    this.count();

    if (screenShot) {
      push();
      translate(width / 2, height / 2);
      // image(finish_ui2, 0, 0, width, height);
      fill(255, 160);
      textSize(height / 3);
      textAlign(CENTER, CENTER);
      text(this.screenShotCount, 0, -height / 30);
      noFill();
      stroke(255, 160);
      strokeWeight(60);
      ellipse(0, 0, height / 2);
      pop();
    }
  }

  count() {
    if (frameCount % 60 == 0 && screenShot) {
      this.screenShotCount += 1;
    }
    if (this.screenShotCount == 4) {
      // snap.push(capture.get());
      saveCanvas(canvas, "screenshot", "png");
      fill(255);
      rect(width / 2, height / 2, width, height);
      // this.screenShotCount = 0;
      camera_sound.play();
      screenShot = false;
    }
    if (!screenShot) {
      this.screenShotCount = 0;
    }
  }
}
