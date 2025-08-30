

# Version

## v1.0.0 
Last updated: Aug 31, 2025
1. **Word Drop Physics**
    1. Words drop dari center ±20% horizontal offset.
    2. Physics handled via Matter.js: gravity, friction, density.
    3. Words bounce minimally dan angular clamp supaya tak terbalik lebih dari ±30°.
    4. Random small horizontal push supaya kata jatuh tak rigid.

2. **Font & Style**
    1. Falling words: serif font (Georgia/Times New Roman), bold.
    2. Font size dynamic: fontSize = width * 0.15 (responsive desktop/mobile).
    3. Words retain angle & position after landing.

3. **Boundaries**
    1. Ground, left wall, right wall → Matter.js static bodies.
    2. Words clamped to canvas edges.
    3. Responsive to windowResized() → walls & ground adjust dynamically.
