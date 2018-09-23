const canvasID = document.getElementById("Canvas");
canvasID.width = document.body.clientWidth;
canvasID.height = document.body.clientHeight;
const canvas = canvasID.getContext("2d");


//------------------
function Buffon() {
  "use strict";

  //--------------------------------
  // CONSTANTS
  //--------------------------------
  var MILLISECONDS_PER_UPDATE = 5;
  var NEEDLE_LENGTH = 1.0;
  var NUM_FLOOR_LINES = 5.0;
  var MAX_NEEDLES = 2000;
  var MAX_NEEDLE_AGE = 300;
  var FLOOR_FRICTION = 0.2;
  var FLOOR_SIZE = NEEDLE_LENGTH * (NUM_FLOOR_LINES + 1) * 2;
  var FLOOR_LEVEL = 0.0;
  var DROP_HEIGHT = 20.0;
  var DROP_JITTER = 0.15;
  var DROP_JITTER = 0.01;
  var DROP_RANGE = FLOOR_SIZE * 0.5;
  var AIR_FRICTION = 0.01;
  var GRAVITY = 0.008;
  var BOUNCE = 0.5;
  var RELAXATION = 0.8;
  var SPRING_FORCE = 0.5;
  var VIEW_PERSPECTIVE = 0.03;
  var VIEW_SCALE = 40.0;
  var VIEW_UP = 10.0;
  var VIEW_Y_SHIFT = -180.0;
  var WINDOW_WIDTH = 700;
  var WINDOW_HEIGHT = 700;
  var START_FALL_RATE = 200;
  var WINDOW_X_MID = WINDOW_WIDTH / 2;
  var WINDOW_Y_MID = WINDOW_HEIGHT / 2;
  var FLOOR_RED = 220;
  var FLOOR_GREEN = 210;
  var FLOOR_BLUE = 200;
  var SHADOW_SHIFT = 30;
  var SHADOW_RED = FLOOR_RED - SHADOW_SHIFT;
  var SHADOW_GREEN = FLOOR_GREEN - SHADOW_SHIFT;
  var SHADOW_BLUE = FLOOR_BLUE - SHADOW_SHIFT;
  var SHADOW_MAX_HEIGHT = 12.0;
  var CIRCLE_COLOR = "rgb( 200, 190, 180 )";
  var CROSSING_COLOR = "rgb( 200,  40,  20 )";
  var NEEDLE_COLOR = "rgb(  40,  80, 100 )";
  var TEXT_COLOR = "rgb(  40,  50,  60 )";

  var FLOOR_IMAGE_X = 0;
  var FLOOR_IMAGE_Y = 430;
  var FLOOR_IMAGE_WIDTH = WINDOW_WIDTH;
  var FLOOR_IMAGE_HEIGHT = WINDOW_HEIGHT - FLOOR_IMAGE_Y;

  var CIRCLE_IMAGE_X = 0;
  var CIRCLE_IMAGE_Y = 0;
  var CIRCLE_IMAGE_WIDTH = WINDOW_WIDTH;
  var CIRCLE_IMAGE_HEIGHT = 420;

  var PI2 = Math.PI * 2.0;
  var CIRCLE_RADIUS = 130;
  var CIRCLE_HEIGHT = 280;
  var TEXT_TOP = 40;

  var FLOOR_COLOR =
    "rgb( " + FLOOR_RED + ", " + FLOOR_GREEN + ", " + FLOOR_BLUE + " )";
  var SHADOW_COLOR =
    "rgb( " + SHADOW_RED + ", " + SHADOW_GREEN + ", " + SHADOW_BLUE + " )";

  //----------------------------------
  this.project = function(position) {
    var scale = VIEW_SCALE / (1.0 + position.z * VIEW_PERSPECTIVE);
    var v = new Vector2D();

    v.x = WINDOW_X_MID + position.x * scale;
    v.y = WINDOW_Y_MID - (position.y - VIEW_UP) * scale + VIEW_Y_SHIFT;

    return v;
  };

  //--------------------------------
  // variables
  //--------------------------------
  function Vector3D() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }

  function Vector2D() {
    this.x = 0;
    this.y = 0;
  }

  function Floor() {
    this.leftBack = new Vector3D();
    this.rightBack = new Vector3D();
    this.leftFront = new Vector3D();
    this.rightFront = new Vector3D();
    this.lineBack = new Array(NUM_FLOOR_LINES);
    this.lineFront = new Array(NUM_FLOOR_LINES);
    this.lb = new Array(NUM_FLOOR_LINES);
    this.lf = new Array(NUM_FLOOR_LINES);
  }

  function Needle() {
    this.p1 = new Vector3D();
    this.p2 = new Vector3D();
    this.v1 = new Vector3D();
    this.v2 = new Vector3D();
    this.falling = false;
    this.active = false;
    this.crossing = false;
    this.age = 0;
  }

  var mouseDown = false;
  var dropClock = 0;
  var clock = 0;
  var mouseX = 0;
  var mouseY = 0;
  var floorImageData = 0;
  var circleImageData = 0;
  var mouseX = 0;
  var mouseY = 0;
  var lastMouseX = 0;
  var lastMouseY = 0;
  var currentNeedle = 0;
  var numDropped = 0;
  var numCrossed = 0;
  var piApprox = 0;
  var numResets = 0;
  var fallRate = START_FALL_RATE;
  var needle = new Array(Needle);
  var floor = new Floor();

  for (var n = 0; n < MAX_NEEDLES; n++) {
    needle[n] = new Needle();
  }

  //---------------------------------
  this.initializeFloor = function() {
    var h = FLOOR_SIZE / 2;
    floor.leftBack.x = -h;
    floor.leftBack.y = FLOOR_LEVEL;
    floor.leftBack.z = -h;

    floor.rightBack.x = h;
    floor.rightBack.y = FLOOR_LEVEL;
    floor.rightBack.z = -h;

    floor.leftFront.x = -h;
    floor.leftFront.y = FLOOR_LEVEL;
    floor.leftFront.z = h;

    floor.rightFront.x = h;
    floor.rightFront.y = FLOOR_LEVEL;
    floor.rightFront.z = h;

    floor.f0 = this.project(floor.leftBack);
    floor.f1 = this.project(floor.rightBack);
    floor.f2 = this.project(floor.rightFront);
    floor.f3 = this.project(floor.leftFront);

    var width = NEEDLE_LENGTH * 2.0;

    for (var l = 0; l < NUM_FLOOR_LINES; l++) {
      floor.lineBack[l] = new Vector3D();
      floor.lineFront[l] = new Vector3D();

      floor.lineBack[l].x = -h + width * (1 + l);
      floor.lineBack[l].y = FLOOR_LEVEL;
      floor.lineBack[l].z = -h;

      floor.lineFront[l].x = -h + width * (1 + l);
      floor.lineFront[l].y = FLOOR_LEVEL;
      floor.lineFront[l].z = h;

      floor.lb[l] = this.project(floor.lineBack[l]);
      floor.lf[l] = this.project(floor.lineFront[l]);
    }
  };

  //------------------------------------------------------------
  // initialize the floor
  //------------------------------------------------------------
  this.initializeFloor();

  //------------------------------------------------------------
  // seed the random number generator
  //------------------------------------------------------------
  var today = new Date();
  var seed = today.getSeconds();
  var random = Math.floor(Math.random(seed) * 200.0);

  //------------------------------------------------------------
  // start up the timer
  //------------------------------------------------------------
  this.timer = setTimeout("buffon.update()", MILLISECONDS_PER_UPDATE);

  //------------------------
  this.resetNeedles = function() {
    numResets++;

    floorImageData = canvas.getImageData(
      FLOOR_IMAGE_X,
      FLOOR_IMAGE_Y,
      FLOOR_IMAGE_WIDTH,
      FLOOR_IMAGE_HEIGHT
    );

    clock = 0;
    dropClock = 0;
    currentNeedle = 0;

    for (var n = 0; n < MAX_NEEDLES; n++) {
      needle[n].falling = false;
      needle[n].active = false;
      needle[n].crossing = false;
      needle[n].age = 0;
    }
  };

  //------------------------
  this.update = function() {
    clock++;

    //---------------------------------------------
    // manage the timing of dropping needles...
    //---------------------------------------------
    dropClock++;

    if (dropClock % Math.floor(fallRate) == 0) {
      if (currentNeedle < MAX_NEEDLES) {
        this.dropNeedle(currentNeedle);
        currentNeedle++;
        dropClock = 0;
        fallRate *= 0.97;

        if (fallRate < 1) {
          fallRate = 1;
        }
      } else {
        if (this.allNeedlesHaveBeenTested()) {
          //console.log( "numDropped = " + numDropped );
          //console.log( "currentNeedle = " + currentNeedle );

          this.resetNeedles();
        }
      }
    }

    //fallRate = 1;

    //---------------------------
    // update needles...
    //---------------------------
    for (var n = 0; n < MAX_NEEDLES; n++) {
      if (needle[n].falling) {
        this.updateNeedlePhysics(n);

        if (needle[n].age > MAX_NEEDLE_AGE) {
          //this.artificiallySetNeedle(n);
          needle[n].falling = false;

          numDropped++;

          needle[n].crossing = this.caculateCrossing(n);

          if (needle[n].crossing) {
            numCrossed++;
          }
        }
      }
    }

    //---------------------------
    // render everything...
    //---------------------------
    this.render();

    //---------------------------
    // trigger next update...
    //---------------------------
    this.timer = setTimeout("buffon.update()", MILLISECONDS_PER_UPDATE);
  };

  //-----------------------------------------
  this.artificiallySetNeedle = function(n) {
    // horiz, random
    /*
        needle[n].p1.x = -0.5 + Math.random();
        needle[n].p1.y = 0.0;
        needle[n].p1.z = 0.0;

        needle[n].p2.x = needle[n].p1.x + 1.0;
        needle[n].p2.y = needle[n].p1.y;
        needle[n].p2.z = needle[n].p1.z;
        */

    // vertical
    /*
        needle[n].p1.x = 0.0;
        needle[n].p1.y = 0.0;
        needle[n].p1.z = 0.0;

        needle[n].p2.x = needle[n].p1.x;
        needle[n].p2.y = needle[n].p1.y;
        needle[n].p2.z = needle[n].p1.z + 1.0;
        */

    /*
	    var startX = -DROP_RANGE / 2 + DROP_RANGE * Math.random();
	    var startZ = -DROP_RANGE / 2 + DROP_RANGE * Math.random();
	    var startY = FLOOR_LEVEL;
        */

    var startX = -0.5 + 2.0 * Math.random();
    var startZ = 0.0;
    var startY = FLOOR_LEVEL;

    //-------------------------------
    // determine direction
    //-------------------------------

    //redo this based on angle

    var angle = Math.random();
    var rad = angle * Math.PI * 2.0;

    var directionX = Math.sin(rad);
    var directionZ = Math.cos(rad);
    var directionY = 0.0;

    /*    
	    var vx = -0.5 + Math.random();
	    var vy = 0.0;
	    var vz = -0.5 + Math.random();

        var length = Math.sqrt( vx*vx + vz*vz );

        var directionX = 1.0;
        var directionY = 0.0;
        var directionZ = 0.0;
        
        if ( length > 0.0 )
        {
            directionX = vx / length;
            directionZ = vz / length;
        }
        */

    needle[n].p1.x = startX - directionX / 2 * NEEDLE_LENGTH;
    needle[n].p1.z = startZ - directionZ / 2 * NEEDLE_LENGTH;

    needle[n].p2.x = startX + directionX / 2 * NEEDLE_LENGTH;
    needle[n].p2.z = startZ + directionZ / 2 * NEEDLE_LENGTH;

    needle[n].p1.y = 0.0;
    needle[n].p2.y = 0.0;

    needle[n].v1.x = 0.0;
    needle[n].v1.y = 0.0;
    needle[n].v1.z = 0.0;
    needle[n].v2.x = 0.0;
    needle[n].v2.y = 0.0;
    needle[n].v2.z = 0.0;
  };

  //-----------------------------------------
  this.allNeedlesHaveBeenTested = function() {
    //console.log( "checking to see if all needles have been tested..." );
    for (var n = 0; n < MAX_NEEDLES; n++) {
      if (needle[n].age < MAX_NEEDLE_AGE) {
        //console.log( "oops, needle " + n + "has not been tested yet" );
        return false;
      }
    }

    return true;
  };

  //-------------------------------------
  this.caculateCrossing = function(n) {
    var crossing = false;

    for (var l = 0; l < NUM_FLOOR_LINES; l++) {
      if (
        needle[n].p1.x < floor.lineBack[l].x &&
        needle[n].p2.x > floor.lineBack[l].x
      ) {
        return true;
      }

      if (
        needle[n].p2.x < floor.lineBack[l].x &&
        needle[n].p1.x > floor.lineBack[l].x
      ) {
        return true;
      }
    }

    return false;
  };

  //--------------------------------------
  this.updateNeedlePhysics = function(n) {
    needle[n].age++;

    //-----------------------------------
    // spring forces
    //-----------------------------------
    var xx = needle[n].p2.x - needle[n].p1.x;
    var yy = needle[n].p2.y - needle[n].p1.y;
    var zz = needle[n].p2.z - needle[n].p1.z;
    var length = Math.sqrt(xx * xx + yy * yy + zz * zz);

    var normX = NEEDLE_LENGTH;
    var normY = 0.0;
    var normZ = 0.0;

    if (length > 0.0) {
      normX = xx / length;
      normY = yy / length;
      normZ = zz / length;
    }

    var diff = NEEDLE_LENGTH - length;
    var forceX = diff * normX * SPRING_FORCE;
    var forceY = diff * normY * SPRING_FORCE;
    var forceZ = diff * normZ * SPRING_FORCE;

    needle[n].v1.x -= forceX;
    needle[n].v1.y -= forceY;
    needle[n].v1.z -= forceZ;

    needle[n].v2.x += forceX;
    needle[n].v2.y += forceY;
    needle[n].v2.z += forceZ;

    needle[n].p1.x -= forceX * (1.0 - RELAXATION);
    needle[n].p1.y -= forceY * (1.0 - RELAXATION);
    needle[n].p1.z -= forceZ * (1.0 - RELAXATION);

    needle[n].p2.x += forceX * (1.0 - RELAXATION);
    needle[n].p2.y += forceY * (1.0 - RELAXATION);
    needle[n].p2.z += forceZ * (1.0 - RELAXATION);

    //--------------------------
    // gravity
    //--------------------------
    needle[n].v1.y -= GRAVITY;
    needle[n].v2.y -= GRAVITY;

    //--------------------------
    // air friction
    //--------------------------
    needle[n].v1.y *= 1.0 - AIR_FRICTION;
    needle[n].v2.y *= 1.0 - AIR_FRICTION;

    //-----------------------------------
    // update position by velocity
    //-----------------------------------
    needle[n].p1.x += needle[n].v1.x;
    needle[n].p1.y += needle[n].v1.y;
    needle[n].p1.z += needle[n].v1.z;

    needle[n].p2.x += needle[n].v2.x;
    needle[n].p2.y += needle[n].v2.y;
    needle[n].p2.z += needle[n].v2.z;

    if (needle[n].p1.y < FLOOR_LEVEL) {
      needle[n].p1.y = FLOOR_LEVEL;

      needle[n].v1.x *= 1.0 - FLOOR_FRICTION;
      needle[n].v1.z *= 1.0 - FLOOR_FRICTION;

      if (needle[n].v1.y < 0.0) {
        needle[n].v1.y *= -BOUNCE;
      }
    }

    if (needle[n].p2.y < FLOOR_LEVEL) {
      needle[n].p2.y = FLOOR_LEVEL;

      needle[n].v2.x *= 1.0 - FLOOR_FRICTION;
      needle[n].v2.z *= 1.0 - FLOOR_FRICTION;

      if (needle[n].v2.y < 0.0) {
        needle[n].v2.y *= -BOUNCE;
      }
    }
  };

  //----------------------------
  this.dropNeedle = function(n) {
    needle[n].falling = true;
    needle[n].active = true;

    //-----------------------------------------------------------
    // determine initial position
    //-----------------------------------------------------------
    var startX = -DROP_RANGE / 2 + DROP_RANGE * Math.random();
    var startZ = -DROP_RANGE / 2 + DROP_RANGE * Math.random();
    var startY = DROP_HEIGHT;

    //-------------------------------
    // determine direction
    //-------------------------------
    //var vx = -0.5 + Math.random();
    //var vy = -0.5 + Math.random();
    //var vz = -0.5 + Math.random();

    var angle = Math.random();
    var rad = angle * Math.PI * 2.0;

    var vx = Math.sin(rad);
    var vz = Math.cos(rad);
    var vy = -1.0 + 2.0 * Math.random();

    var length = Math.sqrt(vx * vx + vy * vy + vz * vz);

    var directionX = 0.0;
    var directionY = 1.0;
    var directionZ = 0.0;

    if (length > 0.0) {
      directionX = vx / length;
      directionY = vy / length;
      directionZ = vz / length;
    }

    needle[n].p1.x = startX - directionX / 2 * NEEDLE_LENGTH;
    needle[n].p1.y = startY - directionY / 2 * NEEDLE_LENGTH;
    needle[n].p1.z = startZ - directionZ / 2 * NEEDLE_LENGTH;

    needle[n].p2.x = startX + directionX / 2 * NEEDLE_LENGTH;
    needle[n].p2.y = startY + directionY / 2 * NEEDLE_LENGTH;
    needle[n].p2.z = startZ + directionZ / 2 * NEEDLE_LENGTH;

    needle[n].v1.x = 0.0;
    needle[n].v1.y = 0.0;
    needle[n].v1.z = 0.0;
    needle[n].v2.x = 0.0;
    needle[n].v2.y = 0.0;
    needle[n].v2.z = 0.0;
  };

  //-------------------------
  this.render = function() {
    //-------------------------------------------
    // clear the screen
    //-------------------------------------------
    canvas.fillStyle = SHADOW_COLOR;
    canvas.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

    //-------------------------------------------
    // draw the circle
    //-------------------------------------------
//     var switchNum = 50;
//     if (numDropped < switchNum) {
//       this.drawCircle();
//     } else {
//       if (clock % 50 == 0 || numDropped == switchNum) {
//         this.drawCircle();

//         circleImageData = canvas.getImageData(
//           CIRCLE_IMAGE_X,
//           CIRCLE_IMAGE_Y,
//           CIRCLE_IMAGE_WIDTH,
//           CIRCLE_IMAGE_HEIGHT
//         );
//       }

//       if (circleImageData != 0) {
//         canvas.putImageData(circleImageData, CIRCLE_IMAGE_X, CIRCLE_IMAGE_Y);
//       }
//     }

    //-------------------------------------------
    // draw floor image capture overlay
    //-------------------------------------------
    if (floorImageData != 0) {
      canvas.putImageData(floorImageData, FLOOR_IMAGE_X, FLOOR_IMAGE_Y);
    }

    if (numResets == 0) {
      //-------------------------------------------
      // draw the floor
      //-------------------------------------------
      this.drawFloor();

      //-------------------------------------------
      // draw the needle shadows
      //-------------------------------------------
      this.drawNeedleShadows();

      //-------------------------------------------
      // draw the floor lines
      //-------------------------------------------
      this.drawFloorLines();
    }

    //-------------------------------------------
    // draw the needles
    //-------------------------------------------
    this.drawNeedles();

    //-------------------------------------------
    // draw the text
    //-------------------------------------------
    // this.drawText();

    //-------------------------------------------
    // draw a frame around everything....
    //-------------------------------------------
    canvas.lineWidth = 2;
    canvas.strokeStyle = "rgb( 0, 0, 0 )";
    canvas.strokeRect(1, 1, WINDOW_WIDTH - 2, WINDOW_HEIGHT - 2);
  };

  //------------------------------
  this.drawText = function() {
    var left = WINDOW_X_MID - 330;
    var top_Y = TEXT_TOP;
    var mid_Y = TEXT_TOP + 10;
    var bottom_Y = TEXT_TOP + 30;

    canvas.font = 18 + "px Helvetica";
    canvas.fillStyle = NEEDLE_COLOR;
    canvas.fillText("number of needles dropped", left, top_Y);
    canvas.fillStyle = CROSSING_COLOR;
    canvas.fillText("number of needles crossing a line", left, bottom_Y);

    canvas.fillStyle = NEEDLE_COLOR;
    canvas.fillText("=", left + 280, top_Y);
    canvas.fillStyle = CROSSING_COLOR;
    canvas.fillText("=", left + 280, bottom_Y);

    //---------------------------------
    // show dividing line
    //---------------------------------
    canvas.strokeStyle = TEXT_COLOR;
    canvas.beginPath();
    canvas.moveTo(left + 310, mid_Y);
    canvas.lineTo(left + 370, mid_Y);
    canvas.stroke();
    canvas.closePath();

    //---------------------------------
    // show numerator and denominator
    //---------------------------------
    canvas.fillStyle = NEEDLE_COLOR;
    canvas.fillText(numDropped, left + 320, top_Y);
    canvas.fillStyle = CROSSING_COLOR;
    canvas.fillText(numCrossed, left + 320, bottom_Y);

    //---------------------------------
    // show result
    //---------------------------------
    if (numCrossed > 0) {
      piApprox = numDropped / numCrossed;
      piApprox = piApprox.toFixed(4);
    }

    canvas.fillStyle = TEXT_COLOR;
    var piX = left + 390;
    var piY = mid_Y + 5;

    if (numCrossed > 0) {
      canvas.fillText("=  " + piApprox, piX, piY);
    } else {
      canvas.fillText("=  ?", piX, piY);
    }
  };

  //------------------------------
  this.drawCircle = function() {
    canvas.lineWidth = 1;

    var diameter = CIRCLE_RADIUS * 2;
    var x = WINDOW_X_MID;
    var y = CIRCLE_HEIGHT;

    //----------------------------------
    // draw circle
    //----------------------------------
    canvas.beginPath();
    canvas.arc(x, y, CIRCLE_RADIUS, 0, PI2);
    canvas.fillStyle = CIRCLE_COLOR;
    canvas.fill();

    canvas.beginPath();
    canvas.arc(x - CIRCLE_RADIUS, y, 3, 0, PI2);
    canvas.fillStyle = TEXT_COLOR;
    canvas.fill();

    //----------------------------------
    // draw lines for num dropped
    //----------------------------------
    canvas.strokeStyle = NEEDLE_COLOR;
    canvas.fillStyle = NEEDLE_COLOR;

    var xx = x - CIRCLE_RADIUS;
    var yy = y;
    var lx = xx;
    var ly = yy;

    var thresh = 300;
    if (numDropped < thresh) {
      var length = CIRCLE_RADIUS;
      var turn = 60;
      var angle = -30;

      if (numCrossed > 1) {
        var d = numCrossed / 2;

        length /= d;
        turn /= d;
        angle /= d;
      }

      length *= 1.04;

      for (var i = 1; i < numDropped; i++) {
        //----------------------------------------------------------------
        // if number bigger than pi (i.e., circle wraps around),
        // then show the wrapped part peeling off...
        //----------------------------------------------------------------
        if (piApprox > Math.PI) {
          if (angle > 270) {
            xx -= 1.0 / (1.0 + numDropped);
            turn *= 1.0 - 1.0 / (1.0 + numDropped);
          }
        }

        angle += turn;

        var radian = angle * Math.PI / 180.0;
        xx += length * 1.02 * Math.sin(radian);
        yy -= length * 1.02 * Math.cos(radian);

        canvas.beginPath();
        canvas.arc(xx, yy, 2, 0, PI2);
        canvas.fill();
        canvas.beginPath();
        canvas.moveTo(lx, ly);
        lx = xx;
        ly = yy;
        canvas.lineTo(lx, ly);
        canvas.stroke();
        canvas.closePath();
      }
    } else {
      var num = Math.floor(thresh * (piApprox / Math.PI));
      for (var i = 0; i < num; i++) {
        var angle = i / thresh;

        var r = CIRCLE_RADIUS;

        if (piApprox > Math.PI) {
          var tt = num * 0.9;
          if (i > tt) {
            r += (i - tt) * 0.2;
          }
        }

        var radian = angle * Math.PI * 2.0;
        xx = x - r * Math.cos(radian);
        yy = y - r * Math.sin(radian);

        canvas.beginPath();
        canvas.arc(xx, yy, 2, 0, PI2);
        canvas.fill();
      }

      lx = xx;
      ly = yy;
    }

    //----------------------------------
    // show number of crossings
    //----------------------------------
    if (numCrossed > 0) {
      canvas.fillStyle = CROSSING_COLOR;
      canvas.fillText(numCrossed, WINDOW_X_MID - 10, CIRCLE_HEIGHT - 20);
    }

    //----------------------------------
    // show number dropped
    //----------------------------------
    if (numDropped > 0) {
      canvas.fillStyle = TEXT_COLOR;
      var yy = ly;

      var min = 100;

      if (yy < min) {
        yy = min;
      }

      canvas.fillText(numDropped, lx - 60, yy);
    }

    //----------------------------------
    // draw lines for num crossed
    //----------------------------------
    if (numCrossed > 0) {
      canvas.strokeStyle = CROSSING_COLOR;
      canvas.beginPath();
      canvas.moveTo(x - CIRCLE_RADIUS, y);
      canvas.lineTo(x + CIRCLE_RADIUS, y);
      canvas.stroke();
      canvas.closePath();

      canvas.fillStyle = CROSSING_COLOR;

      var num = numCrossed;

      var max = 80;

      if (num > max) {
        num = max;
      }

      for (var i = 1; i < num + 1; i++) {
        canvas.beginPath();
        canvas.arc(x - CIRCLE_RADIUS + i / num * diameter, y, 2, 0, PI2);
        canvas.fill();
      }
    }
  };

  //-----------------------------------
  this.drawNeedleShadows = function() {
    canvas.lineWidth = 3;
    for (var n = 0; n < MAX_NEEDLES; n++) {
      if (needle[n].falling) {
        var minHeight = FLOOR_LEVEL;
        var maxHeight = FLOOR_LEVEL + SHADOW_MAX_HEIGHT;
        if (needle[n].p1.y < maxHeight) {
          var p1Shadow = new Vector3D();
          var p2Shadow = new Vector3D();

          p1Shadow.x = needle[n].p1.x;
          p1Shadow.y = FLOOR_LEVEL;
          p1Shadow.z = needle[n].p1.z;

          p2Shadow.x = needle[n].p2.x;
          p2Shadow.y = FLOOR_LEVEL;
          p2Shadow.z = needle[n].p2.z;

          var s1 = this.project(p1Shadow);
          var s2 = this.project(p2Shadow);

          var f = (needle[n].p1.y - minHeight) / (maxHeight - minHeight);

          var red = Math.floor(SHADOW_RED + (FLOOR_RED - SHADOW_RED) * f);
          var green = Math.floor(
            SHADOW_GREEN + (FLOOR_GREEN - SHADOW_GREEN) * f
          );
          var blue = Math.floor(SHADOW_BLUE + (FLOOR_BLUE - SHADOW_BLUE) * f);

          canvas.strokeStyle =
            "rgb( " + red + ", " + green + ", " + blue + " )";

          canvas.beginPath();
          canvas.moveTo(s1.x, s1.y);
          canvas.lineTo(s2.x, s2.y);
          canvas.stroke();
          canvas.closePath();
        }
      }
    }
  };

  //------------------------------
  this.drawNeedles = function() {
    canvas.lineWidth = 2;
    for (var n = 0; n < MAX_NEEDLES; n++) {
      if (needle[n].active) {
        var p1 = this.project(needle[n].p1);
        var p2 = this.project(needle[n].p2);

        if (needle[n].crossing) {
          canvas.strokeStyle = CROSSING_COLOR;
        } else {
          canvas.strokeStyle = NEEDLE_COLOR;
        }
        canvas.beginPath();
        canvas.moveTo(p1.x, p1.y);
        canvas.lineTo(p2.x, p2.y);
        canvas.stroke();
        canvas.closePath();
      }
    }
  };

  //------------------------------
  this.drawFloor = function() {
    canvas.fillStyle = FLOOR_COLOR;
    canvas.beginPath();
    canvas.moveTo(floor.f0.x, floor.f0.y);
    canvas.lineTo(floor.f1.x, floor.f1.y);
    canvas.lineTo(floor.f2.x, floor.f2.y);
    canvas.lineTo(floor.f3.x, floor.f3.y);
    canvas.closePath();
    canvas.fill();
  };

  //------------------------------
  this.drawFloorLines = function() {
    canvas.lineWidth = 1;
    canvas.strokeStyle = "rgb( 60, 60, 60 )";
    canvas.beginPath();
    canvas.moveTo(floor.f0.x, floor.f0.y);
    canvas.lineTo(floor.f1.x, floor.f1.y);
    canvas.lineTo(floor.f2.x, floor.f2.y);
    canvas.lineTo(floor.f3.x, floor.f3.y);
    canvas.lineTo(floor.f0.x, floor.f0.y);
    canvas.stroke();
    canvas.closePath();

    for (var l = 0; l < NUM_FLOOR_LINES; l++) {
      canvas.beginPath();
      canvas.moveTo(floor.lb[l].x, floor.lb[l].y);
      canvas.lineTo(floor.lf[l].x, floor.lf[l].y);
      canvas.stroke();
      canvas.closePath();
    }
  };
}
