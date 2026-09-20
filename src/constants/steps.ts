/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StepInfo } from '../types';

export const STARLINK_STEPS: StepInfo[] = [
  {
    id: 'dish',
    stepNumber: 1,
    title: '1. User Terminal (Dish)',
    subtitle: 'Electronic Phased Array Beam Steering',
    detail:
      'The flat ground dish uses hundreds of micro-antennas to steer Ku/Ka radio beams toward an overhead satellite instantly—without moving mechanical parts.',
  },
  {
    id: 'satellite',
    stepNumber: 2,
    title: '2. Starlink Satellite',
    subtitle: 'Low Earth Orbit (550 km altitude)',
    detail:
      'Operating in LEO (65x closer than traditional geostationary satellites), each spacecraft features Earth-facing planar antennas and high-efficiency Krypton ion thrusters.',
  },
  {
    id: 'laser',
    stepNumber: 3,
    title: '3. Space Laser Links',
    subtitle: 'Optical Intersatellite Links (ISL)',
    detail:
      'Satellites beam data directly to each other using infrared lasers in vacuum. Light travels ~47% faster through space than through glass fiber-optic cables.',
  },
  {
    id: 'gateway',
    stepNumber: 4,
    title: '4. Ground Gateway Station',
    subtitle: 'Fiber Internet Backbone Connection',
    detail:
      'Downlink beams connect the constellation to terrestrial ground tracking radomes, which plug directly into global fiber-optic internet infrastructure.',
  },
  {
    id: 'handoff',
    stepNumber: 5,
    title: '5. Satellite Handoff',
    subtitle: 'Sub-Millisecond Beam Switching',
    detail:
      'Because LEO satellites cross the sky in minutes, the dish pre-acquires the next rising satellite and switches beams seamlessly with zero dropped packets.',
  },
  {
    id: 'orbit',
    stepNumber: 6,
    title: '6. Global Constellation',
    subtitle: 'Interconnected Space Mesh',
    detail:
      'Thousands of satellites arranged in synchronized orbital planes blanket the globe, routing low-latency broadband anywhere on Earth.',
  },
];
