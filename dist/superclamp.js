
/*!
 * Superclamp 0.1.3
 * https://github.com/makandra/superclamp
 */

(function() {
  var $, CSS, DEBUG, DIMENSIONS_KEY, DISTANCE_KEY, DONE_EVENT_NAME, FRAGMENT_NODES_KEY, FRAGMENT_VALUES_KEY, INSTANCE_KEY, LOG, READY_ATTRIBUTE_NAME, UPDATE_EVENT_NAME, debug, drainPhaseQueue, drainQueue, getContents, getFragmentData, getFragments, getInnerPosition, getPosition, getStoredDimensions, hideAll, initializeTextNode, jobQueues, log, queue, setFragments, showAll, storeDimensions,
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

  $ = window.jQuery;

  $("<style type='text/css'>" + CSS + "</style>").appendTo(document.head);

  $.fn.clamp = function() {
    this.each(function() {
      return Superclamp.clamp(this);
    });
    drainQueue();
    return this;
  };

  $(function() {
    return $(document).on(UPDATE_EVENT_NAME, Superclamp.reclampAll);
  });

  this.Superclamp = (function() {
    Superclamp.clamp = function(element) {
      var $element, instance;
      debug('.clamp', element);
      $element = $(element);
      instance = $element.data(INSTANCE_KEY) || new Superclamp($element);
      return instance.clamp();
    };

    Superclamp.reclampAll = function(container) {
      var element, i, len, ref;
      if (container == null) {
        container = document;
      }
      ref = $(container).find("[" + READY_ATTRIBUTE_NAME + "]");
      for (i = 0, len = ref.length; i < len; i++) {
        element = ref[i];
        Superclamp.clamp(element);
      }
      return drainQueue();
    };

    function Superclamp($element1) {
      var spaceNode;
      this.$element = $element1;
      this._clampNode = bind(this._clampNode, this);
      this._checkFit = bind(this._checkFit, this);
      this._unchanged = bind(this._unchanged, this);
      this._distanceToBottomRight = bind(this._distanceToBottomRight, this);
      this._getEllipsisAt = bind(this._getEllipsisAt, this);
      this._clampThis = bind(this._clampThis, this);
      this._storeDistance = bind(this._storeDistance, this);
      this._updateElementAt = bind(this._updateElementAt, this);
      this._updateEllipsisSize = bind(this._updateEllipsisSize, this);
      debug('initialize', this.$element);
      spaceNode = document.createTextNode(' ');
      this.$ellipsis = $('<span class="clamp-ellipsis">…</span>');
      this.$element.append(spaceNode, this.$ellipsis);
      this.$element.data(INSTANCE_KEY, this);
      this.$element.attr(READY_ATTRIBUTE_NAME, true);
    }

    Superclamp.prototype.clamp = function() {
      return queue('query', (function(_this) {
        return function() {
          _this._updateEllipsisSize();
          _this._updateElementAt();
          if (_this._unchanged()) {
            return debug('unchanged', _this.$element);
          } else {
            return _this._clampThis();
          }
        };
      })(this));
    };

    Superclamp.prototype._updateEllipsisSize = function() {
      return storeDimensions(this.$ellipsis);
    };

    Superclamp.prototype._updateElementAt = function() {
      return this.elementAt = getInnerPosition(this.$element);
    };

    Superclamp.prototype._storeDistance = function() {
      var distance;
      distance = this._distanceToBottomRight();
      debug('storing distance', distance);
      return this.$ellipsis.data(DISTANCE_KEY, distance);
    };

    Superclamp.prototype._clampThis = function() {
      log('_clampThis', this.$element);
      return this._clampNode(this.$element.get(0), (function(_this) {
        return function(allFit) {
          _this._storeDistance();
          return queue('layout', function() {
            _this.$ellipsis.toggleClass('is-not-required', allFit);
            return _this.$element.trigger(DONE_EVENT_NAME);
          });
        };
      })(this));
    };

    Superclamp.prototype._getEllipsisAt = function() {
      return getPosition(this.$ellipsis);
    };

    Superclamp.prototype._distanceToBottomRight = function() {
      var ellipsisAt;
      ellipsisAt = this._getEllipsisAt();
      return [this.elementAt.right - ellipsisAt.right, this.elementAt.bottom - ellipsisAt.bottom];
    };

    Superclamp.prototype._unchanged = function() {
      var dx1, dx2, dy1, dy2, ref, storedDistance;
      storedDistance = this.$ellipsis.data(DISTANCE_KEY);
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
          var $node, contents;
          if (isTextNode) {
            initializeTextNode(node);
            return findBestFit(getFragments(node), '', allFit);
          } else if (node.nodeName === '#comment') {

          } else {
            $node = $(node);
            showAll([$node]);
            contents = getContents($node);
            if ($node.is(_this.$element)) {
              contents = contents.slice(0, -2);
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
    return jobQueues[phase].push(callback);
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
    var layoutDone, queryDone, results;
    results = [];
    while (!(layoutDone && queryDone)) {
      layoutDone = drainPhaseQueue('layout');
      results.push(queryDone = drainPhaseQueue('query'));
    }
    return results;
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

  storeDimensions = function($node) {
    var height, width;
    height = $node.height();
    width = $node.width();
    $node.data(DIMENSIONS_KEY, [width, height]);
    debug('storeDimensions', width, height);
    return [width, height];
  };

  getStoredDimensions = function($node) {
    return $node.data(DIMENSIONS_KEY);
  };

  getPosition = function($node) {
    var height, position, ref, width;
    ref = getStoredDimensions($node) || [$node.width(), $node.height()], width = ref[0], height = ref[1];
    position = {
      top: $node.prop('offsetTop'),
      left: $node.prop('offsetLeft')
    };
    if (position.bottom == null) {
      position.bottom = position.top + height;
    }
    if (position.right == null) {
      position.right = position.left + width;
    }
    debug('getPosition of %o: %o', $node, position);
    return position;
  };

  getInnerPosition = function($node) {
    var borderBoxSizing, borderWidth, height, left, padding, top, width;
    borderBoxSizing = $node.css('box-sizing') === 'border-box';
    top = $node.prop('offsetTop');
    left = $node.prop('offsetLeft');
    height = parseInt($node.css('max-height')) || parseInt($node.css('height'));
    width = parseInt($node.css('max-width')) || parseInt($node.css('width'));
    if (borderBoxSizing) {
      padding = {
        top: parseInt($node.css('padding-top')) || 0,
        left: parseInt($node.css('padding-left')) || 0,
        right: parseInt($node.css('padding-right')) || 0,
        bottom: parseInt($node.css('padding-bottom')) || 0
      };
      borderWidth = {
        top: parseInt($node.css('border-top-width')) || 0,
        left: parseInt($node.css('border-left-width')) || 0,
        right: parseInt($node.css('border-right-width')) || 0,
        bottom: parseInt($node.css('border-bottom-width')) || 0
      };
      top += padding.top + borderWidth.top;
      left += padding.left + borderWidth.left;
      width -= padding.left + padding.right + borderWidth.left + borderWidth.right;
      height -= padding.top + padding.bottom + borderWidth.top + borderWidth.bottom;
    }
    return {
      top: top,
      left: left,
      right: left + width,
      bottom: top + height,
      width: width,
      height: height
    };
  };

  getFragmentData = function(textNode) {
    var $parent, index, nodes, values;
    $parent = $(textNode.parentNode);
    nodes = $parent.data(FRAGMENT_NODES_KEY) || [];
    values = $parent.data(FRAGMENT_VALUES_KEY) || [];
    index = $.inArray(textNode, nodes);
    return [nodes, values, index, $parent];
  };

  setFragments = function(textNode, fragments) {
    var $parent, index, nodes, ref, values;
    ref = getFragmentData(textNode), nodes = ref[0], values = ref[1], index = ref[2], $parent = ref[3];
    if (index < 0) {
      index = nodes.length;
    }
    nodes[index] = textNode;
    values[index] = fragments;
    $parent.data(FRAGMENT_NODES_KEY, nodes);
    $parent.data(FRAGMENT_VALUES_KEY, values);
    return fragments;
  };

  getFragments = function(textNode) {
    var $parent, index, nodes, ref, values;
    ref = getFragmentData(textNode), nodes = ref[0], values = ref[1], index = ref[2], $parent = ref[3];
    return values[index];
  };

  initializeTextNode = function(textNode) {
    if (getFragments(textNode) == null) {
      setFragments(textNode, textNode.nodeValue.split(/\s+/));
    }
    return textNode;
  };

  getContents = function($node) {
    return $.makeArray($node.get(0).childNodes);
  };

  hideAll = function(nodes) {
    var i, len, node, results;
    results = [];
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      if (node.nodeName === '#text') {
        initializeTextNode(node);
        results.push(node.nodeValue = '');
      } else {
        results.push($(node).addClass('clamp-hidden'));
      }
    }
    return results;
  };

  showAll = function(nodes) {
    var $node, i, len, node, results;
    results = [];
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      if (node.nodeName === '#text') {
        initializeTextNode(node);
        results.push(node.nodeValue = getFragments(node).join(' '));
      } else {
        $node = $(node);
        $node.removeClass('clamp-hidden');
        results.push(showAll(getContents($node)));
      }
    }
    return results;
  };

}).call(this);
