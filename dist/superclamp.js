
/*!
 * Superclamp 0.2.1
 * https://github.com/makandra/superclamp
 */

(function() {
  var CSS, DEBUG, DIMENSIONS_KEY, DISTANCE_KEY, DONE_EVENT_NAME, FRAGMENT_NODES_KEY, FRAGMENT_VALUES_KEY, INSTANCE_KEY, LOG, READY_ATTRIBUTE_NAME, Superclamp, UPDATE_EVENT_NAME, debug, drainPhaseQueue, drainQueue, getContents, getDimensions, getFragmentData, getFragments, getInnerPosition, getPosition, getStoredDimensions, hideAll, initializeTextNode, jobQueues, log, queue, setFragments, showAll, storeDimensions, style, triggerEvent,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    slice = [].slice;

  LOG = false;

  DEBUG = false;

  DONE_EVENT_NAME = 'superclamp:done';

  UPDATE_EVENT_NAME = 'superclamp:update';

  INSTANCE_KEY = 'superclamp:instance';

  READY_ATTRIBUTE_NAME = 'superclamp-ready';

  DIMENSIONS_KEY = 'superclamp:dimensions';

  DISTANCE_KEY = 'superclamp:distanceToBottomRight';

  FRAGMENT_NODES_KEY = 'superclamp:fragmentNodes';

  FRAGMENT_VALUES_KEY = 'superclamp:fragmentValues';

  CSS = ".clamp-ellipsis.is-not-required {\n  visibility: hidden !important;\n}\n.clamp-hidden {\n  display: none !important;\n}";

  Superclamp = (function() {
    Superclamp.register = function(nodeList) {
      var i, len, node;
      debug('.register', nodeList);
      for (i = 0, len = nodeList.length; i < len; i++) {
        node = nodeList[i];
        this.clamp(node);
      }
      drainQueue();
    };

    Superclamp.clamp = function(element) {
      var instance;
      debug('.clamp', element);
      instance = element[INSTANCE_KEY] || new Superclamp(element);
      instance.clamp();
    };

    Superclamp.reclampAll = function(container) {
      var element, i, len, ref;
      if ((container == null) || (container.currentTarget != null)) {
        container = document;
      }
      ref = container.querySelectorAll("[" + READY_ATTRIBUTE_NAME + "]");
      for (i = 0, len = ref.length; i < len; i++) {
        element = ref[i];
        Superclamp.clamp(element);
      }
      drainQueue();
      return container;
    };

    function Superclamp(element1) {
      var spaceNode;
      this.element = element1;
      this._clampNode = bind(this._clampNode, this);
      this._checkFit = bind(this._checkFit, this);
      this._unchanged = bind(this._unchanged, this);
      this._distanceToBottomRight = bind(this._distanceToBottomRight, this);
      this._getEllipsisAt = bind(this._getEllipsisAt, this);
      this._clampThis = bind(this._clampThis, this);
      this._storeDistance = bind(this._storeDistance, this);
      this._updateElementAt = bind(this._updateElementAt, this);
      this._updateEllipsisSize = bind(this._updateEllipsisSize, this);
      debug('initialize', this.element);
      spaceNode = document.createTextNode(' ');
      this.ellipsis = document.createElement('span');
      this.ellipsis.classList.add('clamp-ellipsis');
      this.ellipsis.innerText = '…';
      this.element.appendChild(spaceNode);
      this.element.appendChild(this.ellipsis);
      this.element[INSTANCE_KEY] = this;
      this.element.setAttribute(READY_ATTRIBUTE_NAME, true);
      return;
    }

    Superclamp.prototype.clamp = function() {
      queue('query', (function(_this) {
        return function() {
          _this._updateEllipsisSize();
          _this._updateElementAt();
          if (_this._unchanged()) {
            return debug('unchanged', _this.element);
          } else {
            return _this._clampThis();
          }
        };
      })(this));
    };

    Superclamp.prototype._updateEllipsisSize = function() {
      return storeDimensions(this.ellipsis);
    };

    Superclamp.prototype._updateElementAt = function() {
      return this.elementAt = getInnerPosition(this.element);
    };

    Superclamp.prototype._storeDistance = function() {
      var distance;
      distance = this._distanceToBottomRight();
      debug('storing distance', distance);
      return this.ellipsis[DISTANCE_KEY] = distance;
    };

    Superclamp.prototype._clampThis = function() {
      log('_clampThis', this.element);
      return this._clampNode(this.element, (function(_this) {
        return function(allFit) {
          _this._storeDistance();
          return queue('layout', function() {
            if (allFit) {
              _this.ellipsis.classList.add('is-not-required');
            } else {
              _this.ellipsis.classList.remove('is-not-required');
            }
            return triggerEvent(_this.element, DONE_EVENT_NAME);
          });
        };
      })(this));
    };

    Superclamp.prototype._getEllipsisAt = function() {
      return getPosition(this.ellipsis);
    };

    Superclamp.prototype._distanceToBottomRight = function() {
      var ellipsisAt;
      ellipsisAt = this._getEllipsisAt();
      return [this.elementAt.right - ellipsisAt.right, this.elementAt.bottom - ellipsisAt.bottom];
    };

    Superclamp.prototype._unchanged = function() {
      var dx1, dx2, dy1, dy2, ref, storedDistance;
      storedDistance = this.ellipsis[DISTANCE_KEY];
      if (storedDistance != null) {
        dx1 = storedDistance[0], dy1 = storedDistance[1];
        ref = this._distanceToBottomRight(), dx2 = ref[0], dy2 = ref[1];
        debug('_unchanged: %o == %o && %o == %o', dx1, dx2, dy1, dy2);
        return dx1 === dx2 && dy1 === dy2;
      } else {
        return false;
      }
    };

    Superclamp.prototype._checkFit = function(callback) {
      return queue('query', (function(_this) {
        return function() {
          var doesFit, ellipsisAt;
          ellipsisAt = _this._getEllipsisAt();
          doesFit = ellipsisAt.bottom <= _this.elementAt.bottom && ellipsisAt.right <= _this.elementAt.right;
          debug('checkFit: %o (bottom: %o <= %o, right: %o <= %o)', doesFit, ellipsisAt.bottom, _this.elementAt.bottom, ellipsisAt.right, _this.elementAt.right);
          return callback(doesFit);
        };
      })(this));
    };

    Superclamp.prototype._clampNode = function(node, callbackOnDone, allFit) {
      var findBestFit, isTextNode;
      if (allFit == null) {
        allFit = true;
      }
      findBestFit = (function(_this) {
        return function(contents, prefix, allFit) {
          return queue('query', function() {
            var head, midIndex, tail;
            debug('findBestFit #contents: %o, nodeName: %o, prefix: %o', contents, node.nodeName, prefix);
            if (contents.length === 0) {
              return callbackOnDone(allFit);
            } else if (contents.length === 1) {
              if (isTextNode) {
                node.nodeValue = prefix + contents[0];
                return _this._checkFit(function(fits) {
                  return queue('layout', (function(_this) {
                    return function() {
                      if (fits) {
                        return callbackOnDone(allFit);
                      } else {
                        node.nodeValue = prefix.replace(RegExp(' $'), '');
                        return callbackOnDone(false);
                      }
                    };
                  })(this));
                });
              } else {
                return _this._clampNode(contents[0], callbackOnDone, allFit);
              }
            } else {
              midIndex = Math.floor(contents.length / 2);
              head = contents.slice(0, midIndex);
              tail = contents.slice(midIndex);
              debug('findBestFit head: %o, tail: %o', head, tail);
              if (isTextNode) {
                node.nodeValue = prefix + head.join(' ');
              } else {
                showAll(head);
                hideAll(tail);
              }
              return _this._checkFit(function(fits) {
                return queue('layout', (function(_this) {
                  return function() {
                    if (fits) {
                      debug('fits');
                      if (isTextNode) {
                        return findBestFit(tail, node.nodeValue + ' ', allFit);
                      } else {
                        return findBestFit(tail, '', allFit);
                      }
                    } else {
                      debug('wont fit');
                      return findBestFit(head, prefix, false);
                    }
                  };
                })(this));
              });
            }
          });
        };
      })(this);
      isTextNode = node.nodeName === '#text';
      return queue('layout', (function(_this) {
        return function() {
          var contents;
          if (isTextNode) {
            initializeTextNode(node);
            return findBestFit(getFragments(node), '', allFit);
          } else if (node.nodeName === '#comment') {

          } else {
            showAll([node]);
            contents = getContents(node);
            if (node === _this.element) {
              contents = Array.prototype.slice.call(contents, 0, -2);
            }
            return findBestFit(contents, '', allFit);
          }
        };
      })(this));
    };

    return Superclamp;

  })();

  jobQueues = {
    layout: [],
    query: []
  };

  queue = function(phase, callback) {
    jobQueues[phase].push(callback);
  };

  drainPhaseQueue = function(phase) {
    var job, jobs;
    jobs = jobQueues[phase];
    if (jobs.length === 0) {
      return true;
    } else {
      debug('draining', phase);
      while (job = jobs.shift()) {
        job();
      }
      return false;
    }
  };

  drainQueue = function() {
    var layoutDone, queryDone;
    while (!(layoutDone && queryDone)) {
      layoutDone = drainPhaseQueue('layout');
      queryDone = drainPhaseQueue('query');
    }
  };

  debug = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (!DEBUG) {
      return;
    }
    return (ref = window.console) != null ? typeof ref.debug === "function" ? ref.debug.apply(ref, args) : void 0 : void 0;
  };

  log = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (!LOG) {
      return;
    }
    return (ref = window.console) != null ? typeof ref.log === "function" ? ref.log.apply(ref, args) : void 0 : void 0;
  };

  storeDimensions = function(node) {
    node[DIMENSIONS_KEY] = getDimensions(node);
    debug('storeDimensions', node[DIMENSIONS_KEY]);
  };

  getDimensions = function(node) {
    var computedStyle, height, width;
    computedStyle = window.getComputedStyle(node);
    height = node.offsetHeight - parseFloat(computedStyle.paddingTop) - parseFloat(computedStyle.paddingBottom);
    width = node.offsetWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight);
    debug('getDimensions', [height, width]);
    return [width, height];
  };

  getStoredDimensions = function(node) {
    return node[DIMENSIONS_KEY];
  };

  getPosition = function(node) {
    var height, position, ref, width;
    ref = getStoredDimensions(node) || getDimensions(node), width = ref[0], height = ref[1];
    position = {
      top: node.offsetTop,
      left: node.offsetLeft
    };
    if (position.bottom == null) {
      position.bottom = position.top + height;
    }
    if (position.right == null) {
      position.right = position.left + width;
    }
    debug('getPosition of %o: %o', node, position);
    return position;
  };

  getInnerPosition = function(node) {
    var borderBoxSizing, borderWidth, computedStyle, height, innerPosition, isIE, left, padding, top, width;
    isIE = !!node.currentStyle;
    computedStyle = window.getComputedStyle(node);
    borderBoxSizing = computedStyle.boxSizing === 'border-box';
    top = node.offsetTop;
    left = node.offsetLeft;
    height = parseInt(computedStyle.maxHeight) || parseInt(computedStyle.height);
    width = parseInt(computedStyle.maxWidth) || parseInt(computedStyle.width);
    if (borderBoxSizing) {
      padding = {
        top: parseInt(computedStyle.paddingTop) || 0,
        left: parseInt(computedStyle.paddingLeft) || 0,
        right: parseInt(computedStyle.paddingRight) || 0,
        bottom: parseInt(computedStyle.paddingBottom) || 0
      };
      borderWidth = {
        top: parseInt(computedStyle.borderTopWidth) || 0,
        left: parseInt(computedStyle.borderLeftWidth) || 0,
        right: parseInt(computedStyle.borderRightWidth) || 0,
        bottom: parseInt(computedStyle.borderBottomWidth) || 0
      };
      if (!isIE) {
        top += padding.top + borderWidth.top;
        left += padding.left + borderWidth.left;
        width -= padding.left + padding.right + borderWidth.left + borderWidth.right;
        height -= padding.top + padding.bottom + borderWidth.top + borderWidth.bottom;
      }
    }
    innerPosition = {
      top: top,
      left: left,
      right: left + width,
      bottom: top + height,
      width: width,
      height: height
    };
    return innerPosition;
  };

  getFragmentData = function(textNode) {
    var index, nodes, parent, values;
    parent = textNode.parentNode;
    nodes = parent[FRAGMENT_NODES_KEY] || [];
    values = parent[FRAGMENT_VALUES_KEY] || [];
    index = Array.prototype.indexOf.call(nodes, textNode);
    return [nodes, values, index, parent];
  };

  setFragments = function(textNode, fragments) {
    var index, nodes, parent, ref, values;
    ref = getFragmentData(textNode), nodes = ref[0], values = ref[1], index = ref[2], parent = ref[3];
    if (index < 0) {
      index = nodes.length;
    }
    nodes[index] = textNode;
    values[index] = fragments;
    parent[FRAGMENT_NODES_KEY] = nodes;
    parent[FRAGMENT_VALUES_KEY] = values;
  };

  getFragments = function(textNode) {
    var index, nodes, parent, ref, values;
    ref = getFragmentData(textNode), nodes = ref[0], values = ref[1], index = ref[2], parent = ref[3];
    return values[index];
  };

  initializeTextNode = function(textNode) {
    if (getFragments(textNode) == null) {
      setFragments(textNode, textNode.nodeValue.split(/[ \t\r\n]+/));
    }
  };

  getContents = function(node) {
    return node.childNodes;
  };

  hideAll = function(nodes) {
    var i, len, node;
    debug('hideAll', nodes);
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      if (node.nodeName === '#text') {
        initializeTextNode(node);
        node.nodeValue = '';
      } else {
        node.classList.add('clamp-hidden');
      }
    }
  };

  showAll = function(nodes) {
    var i, len, node;
    debug('showAll', nodes);
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      if (node.nodeName === '#text') {
        initializeTextNode(node);
        node.nodeValue = getFragments(node).join(' ');
      } else {
        node.classList.remove('clamp-hidden');
        showAll(getContents(node));
      }
    }
  };

  triggerEvent = function(element, eventName) {
    var event;
    if (typeof Event === 'function') {
      event = new Event('submit');
    } else {
      event = document.createEvent('Event');
      event.initEvent(eventName, true, true);
    }
    return element.dispatchEvent(event);
  };

  style = document.createElement('style');

  style.type = 'text/css';

  style.appendChild(document.createTextNode(CSS));

  document.head.appendChild(style);

  if (typeof jQuery !== 'undefined') {
    jQuery.fn.clamp = function() {
      Superclamp.register(this.get());
      return this;
    };
  }

  document.addEventListener('DOMContentLoaded', function() {
    return document.addEventListener(UPDATE_EVENT_NAME, Superclamp.reclampAll);
  });

  if (typeof module === 'object' && module && typeof module.exports === 'object') {
    module.exports = Superclamp;
  } else {
    window.Superclamp = Superclamp;
  }

}).call(this);
