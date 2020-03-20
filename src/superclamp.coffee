###!
 * Superclamp 0.2.3
 * https://github.com/makandra/superclamp
###

LOG = false
DEBUG = false

DONE_EVENT_NAME = 'superclamp:done' # We trigger this whenever we've clamped an element, and only if (re)clamping was necessary
UPDATE_EVENT_NAME = 'superclamp:update' # We listen to this, and then reclamp all known elements (if necessary)

INSTANCE_KEY = 'superclamp:instance'
READY_ATTRIBUTE_NAME = 'superclamp-ready'

DIMENSIONS_KEY = 'superclamp:dimensions'
DISTANCE_KEY = 'superclamp:distanceToBottomRight'
FRAGMENT_NODES_KEY = 'superclamp:fragmentNodes'
FRAGMENT_VALUES_KEY = 'superclamp:fragmentValues'
STASHED_STYLE = 'superclamp:stashedStyle'

CSS = """
      .clamp-ellipsis.is-not-required {
        visibility: hidden !important;
      }
      .clamp-hidden {
        display: none !important;
      }
      """

################################################################################

class Superclamp

  @register: (nodeList) ->
    debug '.register', nodeList
    for node in nodeList
      @clamp(node)

    drainQueue()
    return

  @clamp: (element) ->
    debug '.clamp', element

    instance = element[INSTANCE_KEY] || new Superclamp(element)
    instance.clamp()
    return

  @reclampAll: (container) ->
    # If no container element or an event was given, reclamp the entire document.
    container = document if !container? || container.currentTarget?

    # Note that keeping elements in an array has no real performance benefit over looking them up by a custom attribute.
    # In fact, since all data is kept on elements, we do not need to implement a clean-up strategy.
    for element in container.querySelectorAll("[#{READY_ATTRIBUTE_NAME}]")
      Superclamp.clamp(element)
    drainQueue()

    return container

  constructor: (@element) ->
    debug 'initialize', @element

    spaceNode = document.createTextNode(' ')
    @ellipsis = document.createElement('span')
    @ellipsis.classList.add('clamp-ellipsis')
    @ellipsis.innerText = '…'

    @element.appendChild(spaceNode)
    @element.appendChild(@ellipsis)

    @element[INSTANCE_KEY] = @
    @element.setAttribute(READY_ATTRIBUTE_NAME, true)
    return

  clamp: ->
    queue 'query', =>
      # When reclamping, we want to recompute ellipsis dimensions as the
      # font face/size may have changed. Its dimensions are required to
      # properly calculate if our contents have changed.
      # We also need to update our element position to compare against.
      @_setTemporaryDimensions()
      @_updateEllipsisSize()
      @_updateElementAt()

      if @_unchanged()
        # no need to (re)clamp
        debug 'unchanged', @element
        @_unsetTemporaryDimensions()
      else
        @_clampThis()
      return
    return

  _setTemporaryDimensions: =>
    computedStyle = window.getComputedStyle(@element)

    maxHeight = parseInt(computedStyle.maxHeight)
    maxWidth = parseInt(computedStyle.maxWidth)
    height = parseInt(computedStyle.height)
    width = parseInt(computedStyle.width)

    if maxHeight && height < maxHeight
      @_setTemporaryStyle('height', "#{height}px")
    if maxWidth && width < maxWidth
      @_setTemporaryStyle('width', "#{width}px")
    return

  _unsetTemporaryDimensions: =>
    @_unsetTemporaryStyle('height')
    @_unsetTemporaryStyle('width')
    return

  _setTemporaryStyle: (styleName, value) =>
    stashedPropertyName = "#{STASHED_STYLE}:#{styleName}"
    unless @element.hasOwnProperty(stashedPropertyName)
      @element[stashedPropertyName] = @element.style[styleName]
    @element.style[styleName] = value
    return

  _unsetTemporaryStyle: (styleName) =>
    stashedPropertyName = "#{STASHED_STYLE}:#{styleName}"
    if @element.hasOwnProperty(stashedPropertyName)
      @element.style[styleName] = @element[stashedPropertyName]
      delete @element[stashedPropertyName]
    return

  _updateEllipsisSize: =>
    storeDimensions(@ellipsis)

  _updateElementAt: =>
    @elementAt = getInnerPosition(@element)

  _storeDistance: =>
    distance = @_distanceToBottomRight()
    debug 'storing distance', distance
    @ellipsis[DISTANCE_KEY] = distance

  _clampThis: =>
    log '_clampThis', @element
    @_clampNode @element, (allFit) =>
      @_unsetTemporaryDimensions()
      @_storeDistance()
      queue 'layout', =>
        if (allFit)
          @ellipsis.classList.add('is-not-required')
        else
          @ellipsis.classList.remove('is-not-required')

        triggerEvent(@element, DONE_EVENT_NAME)

  _getEllipsisAt: =>
    getPosition(@ellipsis)

  _distanceToBottomRight: =>
    ellipsisAt = @_getEllipsisAt()
    [@elementAt.right - ellipsisAt.right, @elementAt.bottom - ellipsisAt.bottom]

  _unchanged: =>
    storedDistance = @ellipsis[DISTANCE_KEY]

    if storedDistance?
      [dx1, dy1] = storedDistance
      [dx2, dy2] = @_distanceToBottomRight()
      debug '_unchanged: %o == %o && %o == %o', dx1, dx2, dy1, dy2
      dx1 == dx2 && dy1 == dy2
    else
      false

  _checkFit: (callback) =>
    queue 'query', =>
      ellipsisAt = @_getEllipsisAt()
      doesFit = ellipsisAt.bottom <= @elementAt.bottom && ellipsisAt.right <= @elementAt.right
      debug 'checkFit: %o (bottom: %o <= %o, right: %o <= %o)', doesFit, ellipsisAt.bottom, @elementAt.bottom, ellipsisAt.right, @elementAt.right
      callback(doesFit)

  _clampNode: (node, callbackOnDone, allFit = true) =>
    # Performs a binary search to figure out which contents must be shown in
    # order to find the "best" match, i.e. most contents are shown while they
    # do not exceed the container, including our ellipsis.
    # Contents may be DOM nodes or the list of words of a text node.
    # When the search reduces to 1 single DOM node, we recurse into that node
    # to again find the best fit for its contents.
    findBestFit = (contents, prefix, allFit) =>
      queue 'query', =>
        debug 'findBestFit #contents: %o, nodeName: %o, prefix: %o', contents, node.nodeName, prefix
        if contents.length == 0
          callbackOnDone(allFit)
        else if contents.length == 1
          if isTextNode
            node.nodeValue = prefix + contents[0]
            @_checkFit (fits) ->
              queue 'layout', =>
                if fits
                  callbackOnDone(allFit)
                else
                  node.nodeValue = prefix.replace(RegExp(' $'), '')
                  callbackOnDone(false)
          else
            # Descend into DOM node to clamp its contents
            @_clampNode contents[0], callbackOnDone, allFit
        else
          midIndex = Math.floor(contents.length / 2)
          head = contents[...midIndex]
          tail = contents[midIndex..]
          debug 'findBestFit head: %o, tail: %o', head, tail

          if isTextNode
            node.nodeValue = prefix + head.join(' ')
          else
            showAll head
            hideAll tail

          @_checkFit (fits) ->
            queue 'layout', =>
              if fits
                debug 'fits'
                if isTextNode
                  findBestFit(tail, node.nodeValue + ' ', allFit)
                else
                  findBestFit(tail, '', allFit)
              else
                debug 'wont fit'
                findBestFit(head, prefix, false)

    isTextNode = node.nodeName == '#text'

    queue 'layout', =>
      if isTextNode
        initializeTextNode(node)
        findBestFit(getFragments(node), '', allFit)
      else if node.nodeName == '#comment'
        # ignore
      else
        showAll [node]
        contents = getContents(node)
        if node == @element
          contents = Array.prototype.slice.call(contents, 0, -2) # do not clamp ellipsis and our space node
        findBestFit(contents, '', allFit)

################################################################################

jobQueues =
  layout: []
  query: []

queue = (phase, callback) ->
  jobQueues[phase].push callback
  return

drainPhaseQueue = (phase) ->
  jobs = jobQueues[phase]
  if jobs.length == 0
    return true
  else
    debug 'draining', phase
    while job = jobs.shift()
      job()
    return false

drainQueue = ->
  until layoutDone && queryDone
    layoutDone = drainPhaseQueue('layout')
    queryDone = drainPhaseQueue('query')
  return

debug = (args...) ->
  return unless DEBUG
  window.console?.debug?(args...)

log = (args...) ->
  return unless LOG
  window.console?.log?(args...)

storeDimensions = (node) ->
  node[DIMENSIONS_KEY] = getDimensions(node)
  debug 'storeDimensions', node[DIMENSIONS_KEY]
  return

getDimensions = (node) ->
  computedStyle = window.getComputedStyle(node)

  height = node.offsetHeight - parseFloat(computedStyle.paddingTop) - parseFloat(computedStyle.paddingBottom)
  width = node.offsetWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight)
  debug 'getDimensions', [height, width]
  [width, height]

getStoredDimensions = (node) ->
  return node[DIMENSIONS_KEY]

getPosition = (node) ->
  [width, height] = getStoredDimensions(node) || getDimensions(node)
  position =
    top: node.offsetTop
    left: node.offsetLeft
  position.bottom ?= position.top + height
  position.right ?= position.left + width
  debug 'getPosition of %o: %o', node, position
  position

getInnerPosition = (node) ->
  isIE = !!node.currentStyle
  computedStyle = window.getComputedStyle(node)
  borderBoxSizing = computedStyle.boxSizing == 'border-box'

  top = node.offsetTop
  left = node.offsetLeft

  # To compute the fillable inner area, we consider the element's maximum
  # width/height, if available. This allows handling growing elements.
  height = parseInt(computedStyle.maxHeight) || parseInt(computedStyle.height)
  width = parseInt(computedStyle.maxWidth) || parseInt(computedStyle.width)

  if borderBoxSizing
    # When an element's box-sizing is set to "border-box", its padding and
    # borders are included in its width/height.
    padding =
      top: parseInt(computedStyle.paddingTop) || 0
      left: parseInt(computedStyle.paddingLeft) || 0
      right: parseInt(computedStyle.paddingRight) || 0
      bottom: parseInt(computedStyle.paddingBottom) || 0
    borderWidth =
      top: parseInt(computedStyle.borderTopWidth) || 0
      left: parseInt(computedStyle.borderLeftWidth) || 0
      right: parseInt(computedStyle.borderRightWidth) || 0
      bottom: parseInt(computedStyle.borderBottomWidth) || 0

    unless isIE
      # IE's getComputedStyle (wrongly) deducts paddings and border widths from element dimensions.
      # We can not use IE's "currentStyle" node property as it won't convert rems and other non-px sizes to px.
      # Since we are only interesten in an element's inner dimensions, we simply skip this step for IE.
      top += (padding.top + borderWidth.top)
      left += (padding.left + borderWidth.left)
      width -= (padding.left + padding.right + borderWidth.left + borderWidth.right)
      height -= (padding.top + padding.bottom + borderWidth.top + borderWidth.bottom)

  innerPosition =
    top: top
    left: left
    right: left + width
    bottom: top + height
    width: width
    height: height

  return innerPosition

getFragmentData = (textNode) ->
  parent = textNode.parentNode
  nodes = parent[FRAGMENT_NODES_KEY] || []
  values = parent[FRAGMENT_VALUES_KEY] || []
  index = Array.prototype.indexOf.call(nodes, textNode)

  [nodes, values, index, parent]

setFragments = (textNode, fragments) ->
  [nodes, values, index, parent] = getFragmentData(textNode)
  index = nodes.length if index < 0

  nodes[index] = textNode
  values[index] = fragments

  parent[FRAGMENT_NODES_KEY] = nodes
  parent[FRAGMENT_VALUES_KEY] = values
  return

getFragments = (textNode) ->
  [nodes, values, index, parent] = getFragmentData(textNode)
  values[index]

initializeTextNode = (textNode) ->
  unless getFragments(textNode)?
    # happens only once, so our nodeValue was not changed
    setFragments textNode, textNode.nodeValue.split(/[ \t\r\n]+/)
  return

getContents = (node) ->
  Array.prototype.slice.call(node.childNodes)

hideAll = (nodes) ->
  debug 'hideAll', nodes
  for node in nodes
    if node.nodeName == '#text'
      initializeTextNode(node)
      node.nodeValue = ''
    else
      node.classList.add('clamp-hidden')
  return

showAll = (nodes) ->
  debug 'showAll', nodes
  for node in nodes
    if node.nodeName == '#text'
      initializeTextNode(node)
      node.nodeValue = getFragments(node).join(' ')
    else
      node.classList.remove('clamp-hidden')
      showAll(getContents(node))
  return

triggerEvent = (element, eventName) ->
  if typeof(Event) == 'function'
     event = new Event('submit')
  else
     event = document.createEvent('Event')
     event.initEvent(eventName, true, true)

  element.dispatchEvent(event)

################################################################################

style = document.createElement('style')
style.type = 'text/css'
style.appendChild(document.createTextNode(CSS))
document.head.appendChild(style)

if typeof(jQuery) != 'undefined'
  jQuery.fn.clamp = ->
    Superclamp.register(this.get())
    return this

document.addEventListener 'DOMContentLoaded', ->
  document.addEventListener(UPDATE_EVENT_NAME, Superclamp.reclampAll)

################################################################################

if (typeof module == 'object' && module && typeof module.exports == 'object')
  module.exports = Superclamp
else
  window.Superclamp = Superclamp
