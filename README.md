# Superclamp

Cross-browser ellipsis/truncation on multi-line texts. Optimized for performance, and supports tags inside clamped elements.

It is similar to `-webkit-line-clamp`, but behaves more consistently and will respect your container dimensions without requiring a line count that you may not always know.

No dependencies. Comes with a jQuery function for ease of use in jQuery projects.

Supports all real browsers and IE11+. We are using this in real-world projects.


# Installation

Grab `superclamp.js` or `superclamp.min.js` from the `dist` directory and put it into your project.

For NPM projects, add `superclamp` to your `package.json` and `import Superclamp from 'superclamp'` when needed.

# Usage

You want to truncate text to fit inside an element, so define your width/height restrictions on the element, e.g. via CSS. Superclamp will respect an element's padding.


1. Clamp them when the DOM is ready by calling `Superclamp.register` with a `NodeList`.

       Superclamp.register(document.querySelectorAll('.clamp-me'));

2. Re-clamp when necessary (e.g. on resize)

       window.addEventListener('resize', Superclamp.reclampAll);


You may also re-clamp by triggering a custom event `superclamp:update` anywhere inside `document`.


## Cleanup

You don't need to do any clean-up yourself when removing DOM nodes.

All relevant data is stored on the DOM nodes themselves. They will remove any superclamp-related data with them.


## jQuery bindings

If your project uses jQuery, Superclamp will automatically provide a `clamp()` function to use on jQuery collections, like so:

    $('.clamp-me').clamp();


# Development

I am a Ruby developer, so here is my stack:

1. `bundle` inside the project directory.
2. Run `guard` to watch the CoffeeScript source for changes and compile to JavaScript.
3. Open `test/index.html` in a browser. You may want to run `ruby -run -ehttpd . -p8000` as a tiny web server.


## The ugly parts

We optimized heavily for performance, so code may not be as straight-forward as for a simpler solution. Here are a few things we are doing which increase complexity:

- Best fit is detected via binary search.
- We avoid [layout thrashing](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts-and-layout-thrashing) by processing layout-modifying and layout-querying tasks en bloc.
- Some smart logic to (re-)clamp only when necessary (because it's still expensive).


## Tests

- Testing is currently done by opening `test/index.html` as a human. Sorry for that.


## TO DO

- Maybe support containers of flexible height (e.g. flexbox children) instead of requiring `max-height` or `height`.
- Get rid of CoffeeScript source.
- Get rid of Ruby/Guard build stack.
- Have tests.


# Known issues

- While inline nodes work nicely, block nodes (`<p>`, `<div>`, ...) inside the clamped element will cause the ellipsis to be put underneath them. We could/should try putting the ellipsis inside.


# Credits

Arne Hartherz from [makandra](http://www.makandra.com/).
