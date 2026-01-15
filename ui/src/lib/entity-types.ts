/**
 * Entity Types Configuration
 *
 * Centralized configuration for all entity types in the system.
 * To add a new entity type:
 * 1. Add it to the ENTITY_TYPES array below
 * 2. Ensure the database CHECK constraint includes it (see migration 002)
 * 3. Optionally add extractors for the new type
 */

import {
  Flame,
  Rocket,
  Globe,
  Satellite,
  MapPin,
  Navigation,
  FileText,
  Building2,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export interface EntityTypeConfig {
  value: string;
  label: string;
  labelPlural: string;
  icon: LucideIcon;
  color: string;       // Tailwind color class for icon
  bgColor: string;     // Tailwind bg color class for badge/icon background
  description: string;
  examples: string[];  // Example entity names for this type
}

/**
 * All supported entity types
 * Add new types here - they'll automatically appear in UI dropdowns
 */
export const ENTITY_TYPES: EntityTypeConfig[] = [
  {
    value: 'engine',
    label: 'Engine',
    labelPlural: 'Engines',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Rocket engines and propulsion systems',
    examples: ['Raptor 2', 'Merlin 1D', 'RS-25', 'BE-4', 'RD-180', 'RL-10', 'Vulcain 2', 'NK-33'],
  },
  {
    value: 'launch_vehicle',
    label: 'Launch Vehicle',
    labelPlural: 'Launch Vehicles',
    icon: Rocket,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Rockets and launch systems',
    examples: ['Falcon 9', 'Starship', 'Atlas V', 'Delta IV Heavy', 'Ariane 6', 'SLS', 'New Glenn', 'Electron'],
  },
  {
    value: 'launch_site',
    label: 'Launch Site',
    labelPlural: 'Launch Sites',
    icon: MapPin,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Spaceports and launch facilities',
    examples: ['Kennedy Space Center LC-39A', 'Vandenberg SLC-4E', 'Boca Chica Starbase', 'Cape Canaveral SLC-40', 'Kourou ELA-3', 'Baikonur LC-1'],
  },
  {
    value: 'space_mission',
    label: 'Mission',
    labelPlural: 'Missions',
    icon: Navigation,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Space missions and flights',
    examples: ['Apollo 11', 'Artemis I', 'Starlink-1', 'Crew Dragon Demo-2', 'Mars 2020', 'James Webb Deployment', 'Voyager 1'],
  },
  {
    value: 'satellite',
    label: 'Satellite',
    labelPlural: 'Satellites',
    icon: Satellite,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: 'Satellites and spacecraft',
    examples: ['Hubble Space Telescope', 'Dragon 2', 'Starliner', 'ISS', 'Starlink v2', 'GPS III', 'Europa Clipper'],
  },
  {
    value: 'organization',
    label: 'Organization',
    labelPlural: 'Organizations',
    icon: Building2,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    description: 'Companies and agencies',
    examples: ['SpaceX', 'NASA', 'Blue Origin', 'Rocket Lab', 'ESA', 'JAXA', 'Roscosmos', 'ULA', 'Northrop Grumman'],
  },
  {
    value: 'country',
    label: 'Country',
    labelPlural: 'Countries',
    icon: Globe,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    description: 'Countries with space programs',
    examples: ['United States', 'Russia', 'China', 'India', 'Japan', 'France', 'Germany', 'United Kingdom'],
  },
  {
    value: 'standard_clause',
    label: 'Standard',
    labelPlural: 'Standards',
    icon: FileText,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    description: 'Industry standards and specifications',
    examples: ['MIL-STD-1540', 'NASA-STD-5001', 'ECSS-E-ST-10C', 'ISO 14620', 'SAE AS9100'],
  },
  {
    value: 'other',
    label: 'Other',
    labelPlural: 'Other',
    icon: HelpCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    description: 'Other entity types',
    examples: ['Propellant type', 'Material', 'Technology'],
  },
];

/**
 * Get entity type config by value
 */
export function getEntityType(value: string): EntityTypeConfig | undefined {
  return ENTITY_TYPES.find(t => t.value === value);
}

/**
 * Get entity type config with fallback to 'other'
 */
export function getEntityTypeOrDefault(value: string): EntityTypeConfig {
  return getEntityType(value) || ENTITY_TYPES.find(t => t.value === 'other')!;
}

/**
 * All entity type values as a union type
 */
export type EntityTypeValue = typeof ENTITY_TYPES[number]['value'];

/**
 * Primary entity types (most commonly used, shown first in dropdowns)
 */
export const PRIMARY_ENTITY_TYPES = ['engine', 'launch_vehicle', 'launch_site', 'space_mission'];

/**
 * Get entity types sorted with primary types first
 */
export function getSortedEntityTypes(): EntityTypeConfig[] {
  const primary = ENTITY_TYPES.filter(t => PRIMARY_ENTITY_TYPES.includes(t.value));
  const secondary = ENTITY_TYPES.filter(t => !PRIMARY_ENTITY_TYPES.includes(t.value) && t.value !== 'other');
  const other = ENTITY_TYPES.filter(t => t.value === 'other');
  return [...primary, ...secondary, ...other];
}
