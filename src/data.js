// One consistent convention: JPL gravitational acceleration.
// https://ssd.jpl.nasa.gov/planets/phys_par.html
// 10 destinations in confirmed order: Earth baseline -> Moon -> Sun -> remaining planets
export const PLANETS = Object.freeze([
  {
    name: 'Earth',
    key: 'earth',
    diameter: 12756,
    g: 9.80,
    color: '#6daeff',
    type: 'Home Planet',
    texture: 'earth_daymap',
    surfaceNote: 'Solid surface · Baseline measurement',
    radius: 0.86
  },
  {
    name: 'The Moon',
    key: 'moon',
    diameter: 3475,
    g: 1.62,
    color: '#d6dade',
    type: 'Natural Satellite',
    texture: 'moon',
    surfaceNote: 'Solid rocky crust · Apollo landing site',
    radius: 0.60
  },
  {
    name: 'The Sun',
    key: 'sun',
    diameter: 1392700,
    g: 274.00,
    color: '#ffb338',
    type: 'Yellow Dwarf Star',
    texture: 'sun',
    surfaceNote: 'Visible surface (photosphere) · Cannot stand on it',
    radius: 1.35
  },
  {
    name: 'Mercury',
    key: 'mercury',
    diameter: 4881,
    g: 3.70,
    color: '#b6aba0',
    type: 'Rocky Planet',
    texture: 'mercury',
    surfaceNote: 'Solid rocky surface · Closest to the Sun',
    radius: 0.52
  },
  {
    name: 'Venus',
    key: 'venus',
    diameter: 12104,
    g: 8.87,
    color: '#e4b477',
    type: 'Rocky Planet',
    texture: 'venus_atmosphere',
    surfaceNote: 'Solid ground · Crushing dense atmosphere',
    radius: 0.82
  },
  {
    name: 'Mars',
    key: 'mars',
    diameter: 6792,
    g: 3.71,
    color: '#ef8d67',
    type: 'Rocky Planet',
    texture: 'mars',
    surfaceNote: 'Solid rocky crust · Home of Olympus Mons',
    radius: 0.67
  },
  {
    name: 'Jupiter',
    key: 'jupiter',
    diameter: 142984,
    g: 24.79,
    color: '#d8b49b',
    type: 'Gas Giant',
    texture: 'jupiter',
    surfaceNote: 'Atmospheric reference level · No solid surface',
    radius: 1.25
  },
  {
    name: 'Saturn',
    key: 'saturn',
    diameter: 120536,
    g: 10.44,
    color: '#e6cd96',
    type: 'Gas Giant',
    texture: 'saturn',
    surfaceNote: 'Atmospheric reference level · Spectacular rings',
    radius: 1.05
  },
  {
    name: 'Uranus',
    key: 'uranus',
    diameter: 51118,
    g: 8.87,
    color: '#90d5d5',
    type: 'Ice Giant',
    texture: 'uranus',
    surfaceNote: 'Atmospheric reference level · Rotates on its side',
    radius: 0.88
  },
  {
    name: 'Neptune',
    key: 'neptune',
    diameter: 49528,
    g: 11.15,
    color: '#5d87ee',
    type: 'Ice Giant',
    texture: 'neptune',
    surfaceNote: 'Atmospheric reference level · Outermost planet',
    radius: 0.87
  }
]);

export const DESTINATIONS = PLANETS;

// Earth baseline is at index 0
export function equivalent(mass, index) {
  return mass * (PLANETS[index].g / PLANETS[0].g);
}

export function force(mass, index) {
  return mass * PLANETS[index].g;
}

export function multiplier(index) {
  return (PLANETS[index].g / PLANETS[0].g).toFixed(2);
}

export const formatKg = value => Number(value).toFixed(1);
