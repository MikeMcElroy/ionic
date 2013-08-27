/**
  * Simple gesture controllers with some common gestures that emit
  * gesture events.
  *
  * Much adapted from github.com/EightMedia/Hammer.js - thanks!
  */
(function(window, document, framework) {
  // Gesture support
  framework.Gesture = {}

  // Simple touch gesture that triggers an event when an element is touched
  framework.Gesture.Touch = {
    handle: function(gesture, e) {
      if(e.type == 'touchstart') {
        gesture.listener.trigger('touch', e);
        //framework.GestureController.triggerGestureEvent('touch', e);
      }
    }
  };

  // Simple tap gesture
  framework.Gesture.Tap = {
    handle: function(gesture, e) {
      switch(e.type) {
        case 'touchstart':
          this._touchStartX = e.touches[0].clientX;
          this._touchStartY = e.touches[0].clientY;

          // We are now touching
          this._isTouching = true;
          // Reset the movement indicator
          this._hasMoved = false;
          break;
        case 'touchmove':
          var x = e.touches[0].clientX;
              y = e.touches[0].clientY;

          // Check if the finger moved more than 10px, and then indicate we should cancel the tap
          if (Math.abs(x - this._touchStartX) > 10 || Math.abs(y - this._touchStartY) > 10) {
            console.log('HAS MOVED');
            this._hasMoved = true;
          }
          break;
        case 'touchend':
          if(this._hasMoved == false) {
            //framework.GestureController.triggerGestureEvent('tap', e);
            gesture.listener.trigger('tap', e);
          }
          break;
      }
    }
  };

  // The gesture is over, trigger a release event
  framework.Gesture.Release = {
    handle: function(gesture, e) {
      if(e.type === 'touchend') {
        //framework.GestureController.triggerGestureEvent('release', e);
        gesture.listener.trigger('release', e);
      }
    }
  };

  // A swipe gesture that emits the 'swipe' event when a left swipe happens
  framework.Gesture.Swipe = {
    swipe_velocity: 0.7,
    handle: function(gesture, e) {
      if(e.type == 'touchend') {

        if(e.velocityX > this.swipe_velocity ||
            e.velocityY > this.swipe_velocity) {

          // trigger swipe events, both a general swipe,
          // and a directional swipe
          //framework.GestureController.triggerGestureEvent('swipe', e);
          gesture.listener.trigger('swipe', e);
          //framework.GestureController.triggerGestureEvent('swipe' + e.direction, e);
          gesture.listener.trigger('swipe' + e.direction, e);
        }
      }
    }
  };

  // A GestureListener is a bound gesture on an element
  framework.GestureListener = function(type, callback, element) {
    this.element = element;
    this.callback = callback;
    this.type = type;
      
    // Bind the event listener
    element.addEventListener(type, callback);

    var self = this;
    element.addEventListener('touchstart', function(e) {
      framework.GestureController.startGesture(e, self);
    });
  };


  framework.GestureListener.prototype = {
    trigger: function(type, e) {
      if(!this.childOf(e.target, this.element)) {
        console.error('Not triggering gesture on non-child of target element');
      }

      // Trigger the event on the parent, not any child
      framework.EventController.trigger(type, {
        target: this.element
      });
    },
    destroy: function() {
      this.element.removeEventListener(this.type, this.callback);
    },
    // Check if the given node is a child of the parent
    childOf: function(node, parent) {
      while(node){
        if(node == parent) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    }
  };


  // The GestureController handles gesture movements and events, delegating
  // out normalized events to Gesture handlers and triggering gesture events.
  framework.GestureController = {
    gestures: [
      framework.Gesture.Touch,
      framework.Gesture.Tap,
      framework.Gesture.Swipe,
      framework.Gesture.Release,
    ],

    listeners: [],

    init: function() {
      var self = this;

      /*
      window.addEventListener('touchstart', function(e) {
        var eventData = self._getFakeEvent(e);
        framework.GestureController.startGesture(eventData);
      });
      */
      window.addEventListener('touchmove', function(e) {
        var eventData = self._annotateGestureEvent(e);
        framework.GestureController.detectGesture(eventData);
      });
      window.addEventListener('touchend', function(e) {
        var eventData = self._annotateGestureEvent(e);
        framework.GestureController.detectGesture(eventData);
      });
      window.addEventListener('touchcancel', this.endGesture);
    },

    triggerGestureEvent: function(type, e) {
      // We need to make sure we trigger any gesture events 
      // on the element that we have bound to, not a subchild.
      // This is to avoid things like an <a> catching a touch event inside of
      // a <li> that we have bound to.

      //framework.EventController.trigger(type, framework.Utils.extend({}, e));
    },


    // Add a new gesture listener.
    addListener: function(listener) {
      this.listeners.push(listener);
    },

    // Remove a bound listener
    removeListener: function(listener) {
      var i, l;
      for(i = this.listeners.length; i--;) {
        l = this.listeners[i];
        if(l == listener) {
          // Remove this listener and destroy it
          this.listeners.splice(i, 1).destroy();
        }
      }
    },

    _annotateGestureEvent: function(e) {
      // If this doesn't have touches, we need to grab the last set that did
      var touches = e.touches;
      if((!touches || !touches.length) && this._lastMoveEvent) {
        touches = this._lastMoveEvent.touches;
      }

      e.center = this.getCenter(touches);
      var startEv = this.currentGesture.startEvent;
      var delta_time = e.timeStamp - startEv.timeStamp;
      var delta_x = e.center.pageX - startEv.center.pageX;
      var delta_y = e.center.pageY - startEv.center.pageY;
      var velocity = this.getVelocity(delta_time, delta_x, delta_y);

      framework.Utils.extend(e, {
        touches         : touches,
        deltaTime       : delta_time,

        deltaX          : delta_x,
        deltaY          : delta_y,

        velocityX       : velocity.x,
        velocityY       : velocity.y,

        distance        : this.getDistance(startEv.center, e.center),
        angle           : this.getAngle(startEv.center, e.center),
        //interimAngle    : this.current.lastEvent && Hammer.utils.getAngle(this.current.lastEvent.center, e.center),
        direction       : this.getDirection(startEv.center, e.center),
        //interimDirection: this.current.lastEvent && Hammer.utils.getDirection(this.current.lastEvent.center, e.center),

        scale           : this.getScale(startEv.touches, touches),
        rotation        : this.getRotation(startEv.touches, touches),

        startEvent      : startEv
      });


      return e;
    },

    _getFakeEvent: function(e) {
      return {
        center      : this.getCenter(e.touches),
        timeStamp   : new Date().getTime(),
        target      : e.target,
        touches     : e.touches,
        type        : e.type,
        srcEvent    : e,

        // prevent the browser default actions
        // mostly used to disable scrolling of the browser
        preventDefault: function() {
          if(this.srcEvent.preventDefault) {
            this.srcEvent.preventDefault();
          }
        },

        /**
         * stop bubbling the event up to its parents
         */
        stopPropagation: function() {
          this.srcEvent.stopPropagation();
        },

        //immediately stop gesture detection
        //might be useful after a swipe was detected
        //@return {*}
        stopDetect: function() {
          return Hammer.detection.stopDetect();
        }
      };
    },

    // Process an event that starts a gesture. This will be
    // called when 'touchstart' or 'mousedown' are called.
    startGesture: function(e, listener) {
      console.log('START GESTURE');

      // We only want to process one gesture at a time
      if(this.currentGesture) {
        return;
      }

      // Grab a new event object extended with some magical
      // custom data.
      e = this._getFakeEvent(e);

      this.currentGesture = {
        listener: listener,
        startEvent: framework.Utils.extend({}, e)
      };
      
      // Store the last move event if this is a move, so we can
      // grab the last touches when we end the gesture (touchend doesn't send 
      // touch data).
      if((e.touches && e.touches.length) || !this._lastMoveEvent) {
        this._lastMoveEvent = e;
      }

      // touchstart is a valid gesture (for 'touch'), so send it to detection.
      this.detectGesture(e);
    },

    // Process the given event as a gesture. This happens
    // as 'touchmove' events occur, or 'mousemove'
    detectGesture: function(e) {
      var i;

      if(e.touches && e.touches.length) {
        this._lastMoveEvent = e;
      }
      
      var eventData = this._annotateGestureEvent(e);

      for(i = 0; i < this.gestures.length; i++) {
        if(this.gestures[i].handle(this.currentGesture, eventData) === false) {
          console.log('GESTURECONTROLLER: Gesture handled and stopped.');
          this.endGesture(eventData);
          return;
        }
      }

      if(this.currentGesture) {
        // Store this event so we can access it again later
        this.currentGesture.lastEvent = eventData;
      }

      // It's over!
      if(e.type === 'touchend' || e.type === 'touchcancel') {
        this.endGesture(eventData);
      }
    },

    // Process the end of a gesture. This happens
    // as the 'touchend' event happens, or 'mouseup'
    endGesture: function(e) {
      this.currentGesture = null;
      this._lastMoveEvent = null;
    },

    // Get the center point in the given touch list
    getCenter: function getCenter(touches) {
      var valuesX = [], valuesY = [];

      for(var t= 0,len=touches.length; t<len; t++) {
        valuesX.push(touches[t].pageX);
        valuesY.push(touches[t].pageY);
      }

      return {
        pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
          pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
      };
    },


    // Calculate the velocity of this touch, given the change
    // in time and the change in x and y
    getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
      return {
        x: Math.abs(delta_x / delta_time) || 0,
        y: Math.abs(delta_y / delta_time) || 0
      };
    },

    // Get the angle between two touch coordinates
    getAngle: function getAngle(touch1, touch2) {
      var y = touch2.pageY - touch1.pageY,
      x = touch2.pageX - touch1.pageX;
      return Math.atan2(y, x) * 180 / Math.PI;
    },

    // Get the direction of this gesture, one of up, down, left, or right
    getDirection: function getDirection(touch1, touch2) {
      var x = Math.abs(touch1.pageX - touch2.pageX),
      y = Math.abs(touch1.pageY - touch2.pageY);

      if(x >= y) {
        return touch1.pageX - touch2.pageX > 0 ? 'left' : 'right';
      }
      else {
        return touch1.pageY - touch2.pageY > 0 ? 'up': 'down';
      }
    },

    // Get the distance between two touch coordinates
    getDistance: function getDistance(touch1, touch2) {
      var x = touch2.pageX - touch1.pageX,
      y = touch2.pageY - touch1.pageY;
      return Math.sqrt((x*x) + (y*y));
    },


    // Calculate the scale factor of two touch coordinates. This is used
    // for things like pinch-to-zoom
    getScale: function getScale(start, end) {
      // need two fingers...
      if(start.length >= 2 && end.length >= 2) {
        return this.getDistance(end[0], end[1]) /
          this.getDistance(start[0], start[1]);
      }
      return 1;
    },


    // Claculate the rotate of two touch points, used for rotating
    // motion gestures.
    getRotation: function getRotation(start, end) {
      // need two fingers
      if(start.length >= 2 && end.length >= 2) {
        return this.getAngle(end[1], end[0]) -
          this.getAngle(start[1], start[0]);
      }
      return 0;
    },


    // Check if this direction is vertical
    isVertical: function isVertical(direction) {
      return (direction == 'up' || direction == 'down');
    },


    // kill some default browser behaviors (such as onselectstart) that mess with gestures
    stopDefaultBrowserBehavior: function stopDefaultBrowserBehavior(element, css_props) {
      var prop,
      vendors = ['webkit','khtml','moz','Moz','ms','o',''];

      if(!css_props || !element.style) {
        return;
      }

      // with css properties for modern browsers
      for(var i = 0; i < vendors.length; i++) {
        for(var p in css_props) {
          if(css_props.hasOwnProperty(p)) {
            prop = p;

            // vender prefix at the property
            if(vendors[i]) {
              prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
            }

            // set the style
            element.style[prop] = css_props[p];
          }
        }
      }

      // also the disable onselectstart
      if(css_props.userSelect == 'none') {
        element.onselectstart = function() {
          return false;
        };
      }

      // and disable ondragstart
      if(css_props.userDrag == 'none') {
        element.ondragstart = function() {
          return false;
        };
      }
    }
  }

  // Initialize the GestureController
  framework.GestureController.init();
})(this, document, FM = this.FM || {});
