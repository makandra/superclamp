###!
 * Superclamp 0.1.5
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

CSS = """
      .clamp-ellipsis.is-not-required {
        visibility: hidden !important;
      }
      .clamp-hidden {
        display: none !important;
      }
      """

################################################################################

$ = window.jQuery

$("<style type='text/css'>#{CSS}</style>").appendTo(document.head)

$.fn.clamp = ->
  @each ->
    Superclamp.clamp(this)
  drainQueue()
  @

$ ->
  $(document).on UPDATE_EVENT_NAME, Superclamp.reclampAll

################################################################################

class @Superclamp

  @clamp: (element) ->
    debug '.clamp', element
    $element = $(element)

    instance = $element.data(INSTANCE_KEY) || new Superclamp($element)
    instance.clamp()

  @reclampAll: (container) ->
    # If no container element or an event was given, reclamp the entire document.
    container = document if !container? || container.currentTarget?

    $container = $(container)
    for element in $container.find("[#{READY_ATTRIBUTE_NAME}]")
      Superclamp.clamp(element)
    drainQueue()

    return $container

  constructor: (@$element) ->
    debug 'initialize', @$element

    spaceNode = document.createTextNode(' ')
    @$ellipsis = $('<span class="clamp-ellipsis">…</span>')
    @$element.append(spaceNode, @$ellipsis)

    @$element.data(INSTANCE_KEY, @)
    @$element.attr(READY_ATTRIBUTE_NAME, true)

  clamp: ->
    queue 'query', =>
      # When reclamping, we want to recompute ellipsis dimensions as the
      # font face/size may have changed. Its dimensions are required to
      # properly calculate if our contents have changed.
      # We also need to update our element position to compare against.
      @_updateEllipsisSize()
      @_updateElementAt()

      if @_unchanged()
        debug 'unchanged', @$element
        # no need to (re)clamp
      else
        @_clampThis()

  _updateEllipsisSize: =>
    storeDimensions(@$ellipsis)

  _updateElementAt: =>
    @elementAt = getInnerPosition(@$element)

  _storeDistance: =>
    distance = @_distanceToBottomRight()
    debug 'storing distance', distance
    @$ellipsis.data DISTANCE_KEY, distance

  _clampThis: =>
    log '_clampThis', @$element
    @_clampNode @$element.get(0), (allFit) =>
      @_storeDistance()
      queue 'layout', =>
        @$ellipsis.toggleClass('is-not-required', allFit)
        @$element.trigger(DONE_EVENT_NAME)

  _getEllipsisAt: =>
    getPosition(@$ellipsis)

  _distanceToBottomRight: =>
    ellipsisAt = @_getEllipsisAt()
    [@elementAt.right - ellipsisAt.right, @elementAt.bottom - ellipsisAt.bottom]

  _unchanged: =>
    storedDistance = @$ellipsis.data(DISTANCE_KEY)

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
        $node = $(node)
        showAll [$node]
        contents = getContents($node)
        if $node.is(@$element)
          contents = contents[0...-2] # do not clamp ellipsis and our space node
        findBestFit(contents, '', allFit)

################################################################################

jobQueues =
  layout: []
  query: []

queue = (phase, callback) ->
  jobQueues[phase].push callback

drainPhaseQueue = (phase) ->
  jobs = jobQueues[phase]
  if jobs.length == 0
    true
  else
    debug 'draining', phase
    while job = jobs.shift()
      job()
    false

drainQueue = ->
  until layoutDone && queryDone
    layoutDone = drainPhaseQueue('layout')
    queryDone = drainPhaseQueue('query')

debug = (args...) ->
  return unless DEBUG
  window.console?.debug?(args...)

log = (args...) ->
  return unless LOG
  window.console?.log?(args...)

storeDimensions = ($node) ->
  height = $node.height()
  width = $node.width()
  $node.data(DIMENSIONS_KEY, [width, height])
  debug 'storeDimensions', width, height
  [width, height]

getStoredDimensions = ($node) ->
  $node.data(DIMENSIONS_KEY)

getPosition = ($node) ->
  [width, height] = getStoredDimensions($node) || [$node.width(), $node.height()]
  position =
    top: $node.prop('offsetTop')
    left: $node.prop('offsetLeft')
  position.bottom ?= position.top + height
  position.right ?= position.left + width
  debug 'getPosition of %o: %o', $node, position
  position

getInnerPosition = ($node) ->
  borderBoxSizing = $node.css('box-sizing') == 'border-box'

  top = $node.prop('offsetTop')
  left = $node.prop('offsetLeft')

  # To compute the fillable inner area, we consider the element's maximum
  # width/height, if available. This allows handling growing elements.
  height = parseInt($node.css('max-height')) || parseInt($node.css('height'))
  width = parseInt($node.css('max-width')) || parseInt($node.css('width'))

  if borderBoxSizing
    # When an element's box-sizing is set to "border-box", its padding and
    # borders are included in its width/height.
    padding =
      top: parseInt($node.css('padding-top')) || 0
      left: parseInt($node.css('padding-left')) || 0
      right: parseInt($node.css('padding-right')) || 0
      bottom: parseInt($node.css('padding-bottom')) || 0
    borderWidth =
      top: parseInt($node.css('border-top-width')) || 0
      left: parseInt($node.css('border-left-width')) || 0
      right: parseInt($node.css('border-right-width')) || 0
      bottom: parseInt($node.css('border-bottom-width')) || 0
    top += (padding.top + borderWidth.top)
    left += (padding.left + borderWidth.left)
    width -= (padding.left + padding.right + borderWidth.left + borderWidth.right)
    height -= (padding.top + padding.bottom + borderWidth.top + borderWidth.bottom)

  top: top
  left: left
  right: left + width
  bottom: top + height
  width: width
  height: height

getFragmentData = (textNode) ->
  $parent = $(textNode.parentNode)
  nodes = $parent.data(FRAGMENT_NODES_KEY) || []
  values = $parent.data(FRAGMENT_VALUES_KEY) || []
  index = $.inArray(textNode, nodes)

  [nodes, values, index, $parent]

setFragments = (textNode, fragments) ->
  [nodes, values, index, $parent] = getFragmentData(textNode)
  index = nodes.length if index < 0

  nodes[index] = textNode
  values[index] = fragments

  $parent.data(FRAGMENT_NODES_KEY, nodes)
  $parent.data(FRAGMENT_VALUES_KEY, values)

  fragments

getFragments = (textNode) ->
  [nodes, values, index, $parent] = getFragmentData(textNode)
  values[index]

initializeTextNode = (textNode) ->
  unless getFragments(textNode)?
    # happens only once, so our nodeValue was not changed
    setFragments textNode, textNode.nodeValue.split(/[ \t\r\n]+/)
  textNode

getContents = ($node) ->
  $.makeArray($node.get(0).childNodes)

hideAll = (nodes) ->
  for node in nodes
    if node.nodeName == '#text'
      initializeTextNode(node)
      node.nodeValue = ''
    else
      $(node).addClass('clamp-hidden')

showAll = (nodes) ->
  for node in nodes
    if node.nodeName == '#text'
      initializeTextNode(node)
      node.nodeValue = getFragments(node).join(' ')
    else
      $node = $(node)
      $node.removeClass('clamp-hidden')
      showAll(getContents($node))
