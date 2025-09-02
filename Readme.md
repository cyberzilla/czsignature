# czSignature.js

A modern, lightweight, and event-driven JavaScript library for creating beautiful, pressure-sensitive digital signatures. Built with an ES6 Class structure, a clean event-based architecture using Pointer Events, and extensive customization options.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

-   **Modern JavaScript:** Written in a clean, modern ES6 Class structure and uses modern Pointer Events for unified input.
-   **✨ Pressure Sensitive:** Captures stylus pressure for natural, variable-width strokes, with a fallback to velocity-based width for standard inputs like a mouse.
-   **Event-Driven Architecture:** Emits events like `drawStart`, `drawEnd`, and `clear` for robust user interface integration.
-   **Highly Customizable:** Control all aspects, from colors and brush dynamics to smoothing algorithms.
-   **🔧 Advanced Export:** Trim whitespace around the signature, override colors on-the-fly, and set custom DPI for high-quality image exports.
-   **Responsive:** Automatically adjusts when the canvas size is changed.
-   **💾 Serialization:** Easily save the raw signature data as a JavaScript object with `toData()` and load it back with `fromData()`.
-   **Multiple Outputs:** Export signatures as clean, vector-based SVG files or high-DPI PNG/JPEG Data URLs.
-   **No Dependencies:** Lightweight and self-contained.

---

## How to Use

### 1. HTML Setup

You only need a single `<canvas>` element. Ensure it has the `touch-action: none;` style to prevent unwanted scrolling on touch devices.

```html
<canvas id="signature-area" style="width: 100%; height: 250px; border: 1px solid #ccc; touch-action: none;"></canvas>

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
    pressureSupport: false // Example: disable pressure sensitivity
};

const signatureComponent = new czSignature(canvas, options);
```

---

## API Reference

### Properties (Options)

These properties can be passed during initialization or updated later using the `updateOptions()` method.

| Property | Type | Default     | Description |
|:---|:---|:------------|:---|
| `penColor` | `String` | `'#000000'` | The color of the signature stroke as it appears on the canvas. |
| `backgroundColor` | `String` | `'#ffffff'` | The background color of the canvas. Applied on clear. |
| `minWidth` | `Number` | `0.5`       | The minimum width of the brush. |
| `maxWidth` | `Number` | `2.5`       | The maximum width of the brush. Also determines dot size. |
| `pressureSupport` | `Boolean` | `false`     | Enables pressure sensitivity if the device supports it. If `false`, width is based on velocity. |
| `velocityFilterWeight` | `Number` | `0.7`       | A value from 0-1 that smoothes brush width changes (used in velocity mode). |
| `minDistance` | `Number` | `0.8`       | The minimum distance between points before a new one is recorded. |
| `smoothingRatio` | `Number` | `0.5`       | A value from 0-1 that controls the amount of curve smoothing on the stroke. |
| `smoothingFadePoints` | `Number` | `4`         | The number of points at the start/end of a stroke to apply less smoothing. |
| `smoothingMode` | `String` | `'post'`    | `'post'` (smoothes on end for a responsive feel) or `'live'` (smoothes during draw for better visuals). |
| `dpi` | `Number` | `300`       | **Export Option:** Sets the DPI for raster image exports (PNG/JPEG). |
| `trimOutput` | `Boolean` | `false`     | **Export Option:** If `true`, crops the output image/SVG to the signature bounds. |
| `trimPadding` | `Number` | `16`        | **Export Option:** The padding (in pixels) to add around a trimmed signature. |
| `outputPenColor` | `String` | `null`      | **Export Option:** Overrides the pen color for the output. If `null`, uses the live `penColor`. |
| `outputBackgroundColor` | `String` | `null`      | **Export Option:** Overrides the background color for the output. If `null`, uses the live `backgroundColor`. Can be set to `'transparent'`. |

### Methods

-   **`clear()`**: Clears the canvas.
-   **`undo()`**: Removes the last stroke.
-   **`isEmpty()`**: Returns `true` if the canvas is empty.
-   **`updateOptions(newOptions)`**: Updates the instance with new options.
-   **`toData()`**: Returns the raw signature data as an array of stroke objects. Ideal for saving as JSON.
-   **`fromData(data)`**: Draws a signature on the canvas from a data array (retrieved from `toData()`).
-   **`toSVG()`**: Returns the signature as an SVG string. Uses export options from the current configuration.
-   **`toDataURL(format)`**: Returns the signature as a Base64 Data URL. Uses export options.
    -   `format` (String, optional): `'image/png'` (default) or `'image/jpeg'`.
-   **`destroy()`**: Removes all event listeners for cleanup.

### Advanced Export Workflow

To use export-specific options like `trimOutput` or `outputPenColor`, the recommended workflow is to temporarily update the options, export, and then restore the original options.

```javascript
// 1. Get a snapshot of the current live options
const originalOptions = { ...signatureComponent.options };

// 2. Set the desired export options
signatureComponent.updateOptions({
    trimOutput: true,
    outputBackgroundColor: 'transparent',
    outputPenColor: '#000000', // Force black pen on export
    dpi: 600
});

// 3. Generate the image or SVG
const dataURL = signatureComponent.toDataURL('image/png');
// const svg = signatureComponent.toSVG();

// 4. (Important!) Restore the original options for the live canvas
signatureComponent.updateOptions(originalOptions);

// Now you can use the dataURL or svg string
console.log(dataURL);
```

### Serialization Example

Save and load a signature's raw data.

```javascript
// Save the signature data
const signatureData = signatureComponent.toData();
const jsonString = JSON.stringify(signatureData);
// Now you can store jsonString in localStorage or a database

// ... later on ...

// Load the signature data back
const loadedData = JSON.parse(jsonString);
signatureComponent.fromData(loadedData);
```

### Events

Listen to events using the `.on()` method.

-   **`clear`**: Fired when the canvas is cleared.
-   **`undo`**: Fired after a stroke is removed. `data` object: `{ strokesLeft: Number }`.
-   **`drawStart`**: Fired when a new stroke begins.
-   **`drawEnd`**: Fired when a stroke is completed. `data` object: `{ stroke: Object }`.
-   **`resize`**: Fired after the canvas has adjusted to a window resize.

**Event Usage Example:**
```javascript
signatureComponent.on('drawEnd', () => {
    console.log('A new stroke has been completed!');
    // Example: enable a "Save" button
    document.getElementById('save-button').disabled = false;
});

signatureComponent.on('clear', () => {
    console.log('The signature area has been cleared.');
    // Example: disable a "Save" button
    document.getElementById('save-button').disabled = true;
});
```

---

## License

This project is licensed under the MIT License.

**MIT License**

Copyright (c) 2025 Cyberzilla