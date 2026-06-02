# Mavuika Combo Trainer

An interactive timing drill trainer for practicing Mavuika's gameplay combo (Flamestrider Drill). Built with React and Vite.

## Verifying & Contributing Timings

If you want to contribute or verify timing values, the core data models are located here:

* **Timing Configs**: [src/core/config.js](file:///j:/vulcancombo/src/core/config.js)
  * Defines expected ms offsets for key presses (`atk-down`, `dash-down`, `dash-up`, `atk-up`).
  * Configures timing windows/tolerances (`perfect` and `good` margins) and speedometer decay values.
* **Trainer Game Loop**: [src/App.jsx](file:///j:/vulcancombo/src/App.jsx)
  * Implements keyboard/mouse event listener triggers and timing evaluation.
  * Handles audio synthesized ticks on hit evaluation.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start development server**:
   ```bash
   npm run dev
   ```
3. **Compile production static bundle**:
   ```bash
   npm run build
   ```
   *Static output bundles into the `dist/` directory, ready to serve.*
