# czSignature.js

A modern, lightweight, and event-driven JavaScript library for **creating beautiful digital signature**. Built with an ES6 Class structure, a clean event-based architecture, and extensive customization options.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Modern JavaScript:** Written in a clean, modern ES6 Class structure.
- **Event-Driven Architecture:** Emits events like `drawStart`, `drawEnd`, and `clear` for robust user interface integration.
- **Highly Customizable:** Control all aspects, from colors and brush dynamics to smoothing algorithms.
- **Responsive:** Automatically adjusts when the canvas size is changed.
- **Multiple Outputs:** Export signatures as clean SVG files or high-DPI PNG/JPEG Data URLs.
- **No Dependencies:** Lightweight and self-contained.

---

## How to Use

### 1. HTML Setup

You only need a single `<canvas>` element, which will serve as the **area for drawing the signature**. All other control elements are handled separately by your own JavaScript code.

```html
<canvas id="signature-area" style="width: 100%; height: 250px; border: 1px solid #ccc;"></canvas>

<script src="czSignature.js"></script>
<script src="your-app-logic.js"></script> 
```

### 2. Initialization

Instantiate the `czSignature` class by passing the canvas element and an optional configuration object.

```javascript
// Inside your-app-logic.js

const canvas = document.getElementById('signature-area');

const options = {
    penColor: '#0033a0',
    maxWidth: 4.0,
    backgroundColor: '#f8f9fa',
    smoothingMode: 'live' // Choose between 'live' or 'post'
};

// Create a new instance of the signature component
const signatureComponent = new czSignature(canvas, options);
```

---

## API Reference

### Properties (Options)

These properties can be passed during initialization or updated later using the `updateOptions()` method.

| Property               | Type     | Default    | Description                                                                 |
|------------------------|----------|------------|-----------------------------------------------------------------------------|
| `penColor`             | `String` | `'#000'`   | The color of the signature stroke.                                          |
| `backgroundColor`      | `String` | `'#fff'`   | The background color of the canvas. Applied on clear and export.            |
| `minWidth`             | `Number` | `0.5`      | The minimum width of the brush (for fast strokes).                          |
| `maxWidth`             | `Number` | `2.5`      | The maximum width of the brush (for slow strokes). Also determines dot size.|
| `velocityFilterWeight` | `Number` | `0.7`      | A value from 0-1 that smoothes brush width changes based on velocity.       |
| `dotSize`              | `Number` | `2.0`      | A fallback for dot size, but is overridden by `maxWidth` for consistency.   |
| `minDistance`          | `Number` | `0.8`      | The minimum distance between points before a new one is recorded.           |
| `smoothingRatio`       | `Number` | `0.5`      | A value from 0-1 that controls the amount of curve smoothing on the stroke. |
| `smoothingFadePoints`  | `Number` | `4`        | The number of points at the start/end of a stroke to apply less smoothing.  |
| `smoothingMode`        | `String` | `'post'`   | Sets smoothing behavior. `'post'` for responsive feel (smoothes on end), `'live'` for visual quality (smoothes during draw). |

### Methods

These are the public methods you can call on the instance you have created.

- **`clear()`**
  Clears the canvas of all signature strokes.
  ```javascript
  signatureComponent.clear();
  ```

- **`undo()`**
  Removes the last stroke drawn on the canvas.
  ```javascript
  signatureComponent.undo();
  ```

- **`isEmpty()`**
  Returns `true` if no signature has been drawn on the canvas yet.
  ```javascript
  if (signatureComponent.isEmpty()) {
      alert("Please provide your signature.");
  }
  ```

- **`updateOptions(newOptions)`**
  Updates the instance with new options and redraws the canvas if necessary.
  ```javascript
  signatureComponent.updateOptions({ penColor: '#ff0000' });
  ```

- **`toSVG()`**
  **How to get SVG output:** This method returns the signature result as an SVG string.
  ```javascript
  const svgString = signatureComponent.toSVG();
  console.log(svgString);
  // This string can now be saved to a database or displayed elsewhere.
  ```

- **`toDataURL(format, dpi)`**
  **How to get Image output:** This method returns the result as a Base64 Data URL, suitable for `<img>` tags.
  - `format` (String, optional): `'image/png'` (default) or `'image/jpeg'`.
  - `dpi` (Number, optional): The resolution of the image (Dots Per Inch). Default is `300`.
  ```javascript
  const pngDataURL = signatureComponent.toDataURL('image/png', 300);
  
  // Example: Display the result in an image element
  const image = document.createElement('img');
  image.src = pngDataURL;
  document.body.appendChild(image);
  ```

- **`destroy()`**
  Removes all attached event listeners. Useful for memory cleanup, especially in single-page applications.

### Events

Listen to events from the instance using the `.on()` method to create a reactive UI.

```javascript
signatureComponent.on('eventName', (data) => {
    // React to the event
});
```

- **`clear`**: Fired when the canvas is cleared via the `clear()` method.
- **`undo`**: Fired after a stroke has been removed. `data` object: `{ strokesLeft: Number }`.
- **`drawStart`**: Fired when the user starts drawing a new stroke.
- **`drawEnd`**: Fired when the user finishes a stroke. `data` object: `{ stroke: Object }`.
- **`resize`**: Fired after the window has been resized and the canvas has adjusted itself.

**Event Usage Example:**
```javascript
signatureComponent.on('drawEnd', (data) => {
    console.log('A new stroke has been completed!');
});

signatureComponent.on('clear', () => {
    console.log('The signature area has been cleared.');
});
```

---

## License

This project is licensed under the MIT License.

**MIT License**

Copyright (c) 2025 Cyberzilla