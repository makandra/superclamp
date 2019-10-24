# Changelog
All notable changes to this project will be documented in this file.

## 0.2.3
* Fix [a bug](https://github.com/makandra/superclamp/issues/2) that caused consecutive elements with a common parent not to be clamped if they relied on `max-height`

## 0.2.2
* Fix the size calculation in IE for elements using rem

## 0.2.0
* Remove jQuery dependency

## 0.1.5
* Preserve non-breaking spaces when clamping

## 0.1.4
* Calling `reclampAll` with an event argument now reclamps the document

## 0.1.3
* Consider `max-height`/`max-width` and improve calculation of fillable area
* support clamping properly after a font change

## 0.1.2
* Trigger the `superclamp:done` event when an element was clamped

## 0.1.1
* `reclampAll()` accepts a container element
* `clamp()`returns a jQuery collection

## 0.1.0
* Initial release
