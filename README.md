# Superclamp

Cross-browser ellipsis/truncation on multi-line texts. Optimized for performance, and supports tags inside clamped elements. Even looks better than `-webkit-clamp`. 

Supports all real browsers and IE9+. Partial IE8 support (see below).
Requires jQuery.


# Installation

Grab `superclamp.js` or `superclamp.min.js` from the `dist` directory and put it into your project.


# Usage

You want to truncate text to fit inside an element, so define your width/height restrictions on the element, e.g. via CSS. Superclamp will respect an element's padding.


1. Clamp them when the DOM is ready

        $('.clamp-me').clamp();

2. Re-clamp when necessary (e.g. on resize)

        $(window).on('resize', Superclamp.reclampAll)


You may also re-clamp by triggering a jQuery event `superclamp:update` anywhere inside `document`.


# Development

I am a Ruby developer, so here is my stack:

1. `bundle` inside the project directory.
2. Run `guard` to watch the CoffeeScript source for changes and compile to JavaScript.
3. Open `test/index.html` in a browser. You may want to run `ruby -run -ehttpd . -p8000` as a tiny web server.


# The ugly parts

We optimized heavily for performance, so code may not be as straight-forward as for a simpler solution. Here are a few things we are doing which increase complexity:

- Best fit is detected via binary search.
- We avoid [layout thrashing](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing) by processing layout-modifying and layout-querying tasks en bloc.
- Some smart logic to (re-)clamp only when necessary (because it's still expensive).


# Tests

- There will be tests. Soon.


# Known issues

- While inline nodes work nicely, block nodes (`<p>`, `<div>`, ...) inside the clamped element will cause the ellipsis to be put underneath them. We could/should try putting the ellipsis inside.
- IE8 is not really supported. However, it works on elements that contain only a single text node.


# Credits

Arne Hartherz from [makandra](http://www.makandra.com/).
