# GravityExplorer visual research — 31 October 2026

## Direction implemented

Version 1.4 replaces the welcome copy with a full-display overview and larger
planet meshes. Two large, fixed Previous/Next controls use the same positions
throughout the visit. The weight screen keeps only the planet name, large kg
equivalent, a small Earth baseline and essential operating/scientific notes.
Previous also returns from the comparison to Neptune without reweighing.

Version 1.3 simplifies the visitor interface for a physical station: the active
planet, large weight, Earth baseline and gravity multiplier remain. Planet facts,
diameter/year profiles, promotional captions and narration have been removed.
The planet strip indicates progress; a single button advances each destination
and finishes the results. Earlier implementation notes below record the visual
research history rather than the current visitor controls.

An observatory-like school exhibit: the idle screen shows the whole solar system,
with tilted orbits, a glowing Sun, textured planets, Saturn’s rings and an asteroid
belt. Earth is marked “You are here”; starting a visit focuses on Earth for weighing.
The captured weight becomes the largest element on each destination screen, paired
with an Earth baseline, gravity multiplier and detailed planet. All imagery is local.

## References and what informed the design

- [NASA Eyes on the Solar System — interactive application](https://eyes.nasa.gov/apps/solar-system/#/home): visually inspected the running model. Tilted orbital paths, small destination labels, a luminous Sun and contextual information informed the overview-to-destination hierarchy. GravityExplorer implements its own small exhibit model; it does not import NASA’s application or orbital engine.
- [Solar System Scope — interactive site](https://www.solarsystemscope.com/): inspected the homepage and loaded Earth/startup view. Its textured world against a dark stellar field informed material detail and the immersive presentation. The full interactive control set was not reviewed. The existing licensed texture collection below is the asset source.
- [Nine Planets — Natalia Syzrantseva, Behance](https://www.behance.net/gallery/188110721/Nine-Planets-Space-and-Astronomy-Website): visually reviewed the project. Its dark field, oversized circular composition, fine concentric orbit lines and small technical labels informed the globe framing and observatory graphics. GravityExplorer uses its own composition, UI and assets.
- [Galaxy / Space solar system / Concept UI — Oksana Begun, Behance](https://www.behance.net/gallery/164659865/Galaxy-Space-solar-system-Concept-UI): reviewed the creator’s description of an exploratory educational interface with imagery and interaction. Applied progressive disclosure: one planet at a time, followed by a comparison view.
- [Pinterest space website design search](https://www.pinterest.com/search/pins/?q=space%20website%20design): inspected the public search and visible thumbnails. Large Earth imagery, dark layouts and editorial typography were visible; a sign-in overlay prevented detailed pin inspection. No individual pin or creator attribution is inferred from these thumbnails.
- [NASA Eyes](https://science.nasa.gov/eyes/): reviewed NASA’s description of interactive solar-system exploration. Applied a clear distinction between illustrative presentation and physical reference data. This exhibit does not claim real-time ephemerides or physically scaled distances.

## Actual assets and scientific data

- [Solar System Scope textures](https://www.solarsystemscope.com/textures/): the source explicitly permits reuse under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Ten verified 2K JPG maps are stored locally. Earth has independent cloud and night-light layers. See [bundled attribution](public/textures/ATTRIBUTION.md). These adjusted maps contain reconstructed details and are not live imagery.
- [NASA JPL planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html): existing equatorial gravity values remain consistent. New equatorial diameters are twice the listed equatorial radii, rounded to kilometres. Orbital periods are sidereal periods in Earth years, rounded for display. Giant-planet gravity refers to atmospheric reference levels.

## Implementation choices

- Three.js 0.180: local texture loading, restrained directional lighting, independent cloud motion, atmospheric limb glow and night-side city-light masking. Original procedural textures remain as a loading/error fallback.
- Shared sphere geometry, cached maps, capped pixel density and a 32 fps render loop keep the effect practical for a school PC. Reduced motion and lower graphics resolution remain available.
- Both overview and individual planets share one WebGL renderer. Projected labels follow the orbiting worlds, with spacing to reduce overlaps. A static CSS overview remains available if WebGL fails.
- Large weight numerals, quieter decimals and units, an Earth baseline and a gravity multiplier establish the measurement as the main visual feature. Compact desktop layouts accommodate 1366×768 monitors without covering the destination controls.
- Planet profiles show gravity, equatorial diameter and year length. Journey screens add Earth-versus-planet bars, field notes and explanations. Thumbnail planets use the same local map assets.
- No copied reference-site graphics, remote fonts, runtime CDN dependencies, accounts or new visitor inputs.

## Limits

Pinterest’s login overlay limited research depth there. The exhibit remains an
illustrative visualization, with artistic spin rates, cloud motion and lighting;
it is not a physically accurate astronomical simulation. Physical scale accuracy
and installation performance still require tests on the school’s actual hardware.
