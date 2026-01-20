/**
 * Entity Seed Data
 * Comprehensive list of rocket engines and launch vehicles
 *
 * This file contains all the seed data for entities in the Truth Ledger.
 * Run with: npx tsx src/scripts/seed-all-entities.ts
 */

export interface EntitySeed {
  canonicalName: string;
  entityType: 'engine' | 'launch_vehicle' | 'launch_site' | 'space_mission';
  aliases: string[];
}

// ============================================================================
// ROCKET ENGINES (94 engines)
// ============================================================================

export const ENGINE_SEEDS: EntitySeed[] = [
  // SpaceX Merlin Engines (Falcon 1, Falcon 9, Falcon Heavy)
  { canonicalName: 'Merlin 1A', entityType: 'engine', aliases: ['Merlin 1A', 'Merlin-1A', 'M1A'] },
  { canonicalName: 'Merlin 1B', entityType: 'engine', aliases: ['Merlin 1B', 'Merlin-1B', 'M1B'] },
  { canonicalName: 'Merlin 1C', entityType: 'engine', aliases: ['Merlin-1C', 'M1C', 'Merlin 1C Vacuum'] },
  { canonicalName: 'Merlin 1D', entityType: 'engine', aliases: ['Merlin-1D', 'M1D', 'Merlin 1D Sea Level'] },
  { canonicalName: 'Merlin 1D+', entityType: 'engine', aliases: ['Merlin 1D Plus', 'M1D+', 'Merlin-1D+'] },
  { canonicalName: 'Merlin 1D++', entityType: 'engine', aliases: ['Merlin 1D Plus Plus', 'M1D++', 'Merlin-1D++', 'Block 5 Merlin'] },
  { canonicalName: 'Merlin 1D Vacuum', entityType: 'engine', aliases: ['Merlin Vacuum', 'MVac', 'M1D Vac', 'Merlin 1DV', 'Merlin-1DV'] },
  { canonicalName: 'Merlin 1D Vacuum+', entityType: 'engine', aliases: ['MVac+', 'Merlin 1DV+', 'M1DV+'] },
  { canonicalName: 'Merlin Vacuum Short Nozzle', entityType: 'engine', aliases: ['MVac Short', 'Merlin Vacuum SN', 'Short Nozzle Merlin'] },

  // SpaceX Raptor Engines (Starship)
  { canonicalName: 'Raptor 1', entityType: 'engine', aliases: ['Raptor V1', 'Raptor 1.0'] },
  { canonicalName: 'Raptor 2', entityType: 'engine', aliases: ['Raptor', 'Raptor V2', 'Raptor 2.0'] },
  { canonicalName: 'Raptor 3', entityType: 'engine', aliases: ['Raptor V3', 'Raptor 3.0'] },
  { canonicalName: 'Raptor Vacuum', entityType: 'engine', aliases: ['Raptor Vacuum', 'RVac', 'Raptor 2 Vacuum', 'Raptor Vac'] },
  { canonicalName: 'Raptor Vacuum 2', entityType: 'engine', aliases: ['RVac 2', 'Raptor 2 Vacuum'] },
  { canonicalName: 'Raptor Vacuum 3', entityType: 'engine', aliases: ['RVac 3', 'Raptor 3 Vacuum'] },
  { canonicalName: 'Raptor 4', entityType: 'engine', aliases: ['Raptor V4', 'Raptor 4.0'] },
  { canonicalName: 'Raptor 1 Vacuum', entityType: 'engine', aliases: ['RVac 1', 'Raptor 1 Vac', 'Raptor V1 Vacuum'] },
  { canonicalName: 'Raptor Vacuum 4', entityType: 'engine', aliases: ['RVac 4', 'Raptor 4 Vacuum', 'Raptor V4 Vacuum'] },

  // SpaceX Other Engines
  { canonicalName: 'Draco', entityType: 'engine', aliases: ['SpaceX Draco', 'Draco thruster'] },
  { canonicalName: 'SuperDraco', entityType: 'engine', aliases: ['Super Draco', 'SpaceX SuperDraco', 'Launch Escape Engine'] },
  { canonicalName: 'Kestrel', entityType: 'engine', aliases: ['Kestrel', 'SpaceX Kestrel', 'Falcon 1 Upper Stage'] },

  // Blue Origin Engines
  { canonicalName: 'BE-3', entityType: 'engine', aliases: ['BE3', 'Blue Engine 3'] },
  { canonicalName: 'BE-4', entityType: 'engine', aliases: ['BE4', 'Blue Engine 4'] },
  { canonicalName: 'BE-7', entityType: 'engine', aliases: ['BE7', 'Blue Engine 7'] },

  // Aerojet Rocketdyne / RS Engines
  { canonicalName: 'RS-25', entityType: 'engine', aliases: ['RS25', 'SSME', 'Space Shuttle Main Engine'] },
  { canonicalName: 'RS-27', entityType: 'engine', aliases: ['RS-27', 'RS27'] },
  { canonicalName: 'RS-27A', entityType: 'engine', aliases: ['RS-27A', 'RS27A'] },
  { canonicalName: 'RS-68', entityType: 'engine', aliases: ['RS-68', 'RS68', 'Aerojet RS-68'] },
  { canonicalName: 'RS-68A', entityType: 'engine', aliases: ['RS-68A', 'RS68A'] },
  { canonicalName: 'SSME', entityType: 'engine', aliases: ['SSME', 'Space Shuttle Main Engine', 'RS-25D'] },
  { canonicalName: 'AJ-26', entityType: 'engine', aliases: ['AJ-26', 'AJ26', 'NK-33 AJ-26'] },
  { canonicalName: 'AJ-60A', entityType: 'engine', aliases: ['AJ60A'] },
  { canonicalName: 'AJ10', entityType: 'engine', aliases: ['AJ10', 'AJ-10', 'AJ10-118K'] },
  { canonicalName: 'AR-22', entityType: 'engine', aliases: ['AR22'] },

  // RL-10 Family
  { canonicalName: 'RL-10', entityType: 'engine', aliases: ['RL10', 'RL-10A', 'RL-10B', 'RL-10C'] },
  { canonicalName: 'RL-10A', entityType: 'engine', aliases: ['RL10A', 'RL-10A-4-2'] },
  { canonicalName: 'RL-10A-4-2', entityType: 'engine', aliases: ['RL-10A-4-2', 'RL10A-4-2'] },
  { canonicalName: 'RL-10B-2', entityType: 'engine', aliases: ['RL-10B-2', 'RL10B-2'] },
  { canonicalName: 'RL-10C', entityType: 'engine', aliases: ['RL10C', 'RL-10C-1'] },

  // Russian Engines - RD Series
  { canonicalName: 'RD-107', entityType: 'engine', aliases: ['RD-107', 'RD107'] },
  { canonicalName: 'RD-108', entityType: 'engine', aliases: ['RD-108', 'RD108'] },
  { canonicalName: 'RD-120', entityType: 'engine', aliases: ['RD-120', 'RD120'] },
  { canonicalName: 'RD-170', entityType: 'engine', aliases: ['RD170'] },
  { canonicalName: 'RD-171', entityType: 'engine', aliases: ['RD171'] },
  { canonicalName: 'RD-180', entityType: 'engine', aliases: ['RD180'] },
  { canonicalName: 'RD-181', entityType: 'engine', aliases: ['RD181'] },
  { canonicalName: 'RD-191', entityType: 'engine', aliases: ['RD191'] },
  { canonicalName: 'RD-191M', entityType: 'engine', aliases: ['RD-191M', 'RD191M'] },
  { canonicalName: 'RD-193', entityType: 'engine', aliases: ['RD-193', 'RD193'] },
  { canonicalName: 'RD-253', entityType: 'engine', aliases: ['RD253'] },
  { canonicalName: 'RD-275', entityType: 'engine', aliases: ['RD-275', 'RD275'] },
  { canonicalName: 'RD-58', entityType: 'engine', aliases: ['RD-58', 'RD58', 'RD-58M'] },
  { canonicalName: 'RD-843', entityType: 'engine', aliases: ['RD-843', 'RD843'] },
  { canonicalName: 'RD-0110', entityType: 'engine', aliases: ['RD-0110', 'RD0110'] },
  { canonicalName: 'RD-0120', entityType: 'engine', aliases: ['RD-0120', 'RD0120'] },
  { canonicalName: 'RD-0124', entityType: 'engine', aliases: ['RD0124'] },
  { canonicalName: 'NK-33', entityType: 'engine', aliases: ['NK33', 'AJ26'] },

  // European Engines
  { canonicalName: 'Vulcain', entityType: 'engine', aliases: ['Vulcain', 'Vulcain 1'] },
  { canonicalName: 'Vulcain 2', entityType: 'engine', aliases: ['Vulcain-2', 'Vulcain2'] },
  { canonicalName: 'Vulcain 2.1', entityType: 'engine', aliases: ['Vulcain 2.1'] },
  { canonicalName: 'Vinci', entityType: 'engine', aliases: ['Vinci Engine'] },
  { canonicalName: 'HM7B', entityType: 'engine', aliases: ['HM7-B', 'HM-7B'] },
  { canonicalName: 'Viking 5C', entityType: 'engine', aliases: ['Viking 5C', 'Viking-5C'] },
  { canonicalName: 'Viking 6', entityType: 'engine', aliases: ['Viking 6', 'Viking-6'] },
  { canonicalName: 'Prometheus', entityType: 'engine', aliases: ['ArianeGroup Prometheus'] },
  { canonicalName: 'P120C', entityType: 'engine', aliases: ['P120C', 'P120'] },

  // Japanese Engines
  { canonicalName: 'LE-5', entityType: 'engine', aliases: ['LE-5', 'LE5'] },
  { canonicalName: 'LE-5B', entityType: 'engine', aliases: ['LE-5B', 'LE5B'] },
  { canonicalName: 'LE-7', entityType: 'engine', aliases: ['LE-7', 'LE7'] },
  { canonicalName: 'LE-7A', entityType: 'engine', aliases: ['LE-7A', 'LE7A'] },
  { canonicalName: 'LE-9', entityType: 'engine', aliases: ['LE-9', 'LE9'] },

  // Chinese Engines
  { canonicalName: 'YF-20', entityType: 'engine', aliases: ['YF-20', 'YF20'] },
  { canonicalName: 'YF-21', entityType: 'engine', aliases: ['YF-21', 'YF21'] },
  { canonicalName: 'YF-22', entityType: 'engine', aliases: ['YF-22', 'YF22'] },
  { canonicalName: 'YF-23', entityType: 'engine', aliases: ['YF-23', 'YF23'] },
  { canonicalName: 'YF-24', entityType: 'engine', aliases: ['YF-24', 'YF24'] },
  { canonicalName: 'YF-40', entityType: 'engine', aliases: ['YF-40', 'YF40'] },
  { canonicalName: 'YF-73', entityType: 'engine', aliases: ['YF-73', 'YF73'] },
  { canonicalName: 'YF-75D', entityType: 'engine', aliases: ['YF75D', 'YF-75'] },
  { canonicalName: 'YF-77', entityType: 'engine', aliases: ['YF77'] },
  { canonicalName: 'YF-100', entityType: 'engine', aliases: ['YF100'] },
  { canonicalName: 'YF-115', entityType: 'engine', aliases: ['YF-115', 'YF115'] },

  // Indian Engines
  { canonicalName: 'Vikas', entityType: 'engine', aliases: ['Vikas', 'Vikas engine'] },
  { canonicalName: 'CE-7.5', entityType: 'engine', aliases: ['CE-7.5', 'CE7.5'] },
  { canonicalName: 'CE-20', entityType: 'engine', aliases: ['CE-20', 'CE20', 'Cryogenic Engine 20'] },

  // Rocket Lab Engines
  { canonicalName: 'Rutherford', entityType: 'engine', aliases: ['Rutherford Engine'] },
  { canonicalName: 'Curie', entityType: 'engine', aliases: ['Curie', 'Curie engine'] },
  { canonicalName: 'Archimedes', entityType: 'engine', aliases: ['Archimedes', 'Rocket Lab Archimedes'] },

  // Relativity Engines
  { canonicalName: 'Aeon', entityType: 'engine', aliases: ['Aeon', 'Relativity Aeon'] },
  { canonicalName: 'Aeon 1', entityType: 'engine', aliases: ['Aeon1', 'Aeon-1', 'Aeon'] },
  { canonicalName: 'Aeon R', entityType: 'engine', aliases: ['AeonR', 'Aeon-R'] },
  { canonicalName: 'Miranda', entityType: 'engine', aliases: ['Miranda', 'Relativity Miranda'] },

  // Firefly Engines
  { canonicalName: 'Reaver', entityType: 'engine', aliases: ['Reaver 1', 'Firefly Reaver'] },
  { canonicalName: 'Lightning', entityType: 'engine', aliases: ['Lightning 1', 'Firefly Lightning'] },
  { canonicalName: 'E-2', entityType: 'engine', aliases: ['E-2', 'E2', 'Firefly E-2'] },

  // Other US Engines
  { canonicalName: 'GEM 63', entityType: 'engine', aliases: ['GEM63', 'GEM-63', 'GEM 63XL'] },
  { canonicalName: 'Newton', entityType: 'engine', aliases: ['Newton', 'Newton engine'] },
  { canonicalName: 'Hadley', entityType: 'engine', aliases: ['Hadley', 'Astra Hadley'] },
  { canonicalName: 'Delphin', entityType: 'engine', aliases: ['Delphin'] },

  // Historic US Engines
  { canonicalName: 'F-1', entityType: 'engine', aliases: ['F-1', 'F1', 'Rocketdyne F-1'] },
  { canonicalName: 'F-1B', entityType: 'engine', aliases: ['F-1B', 'F1B'] },
  { canonicalName: 'J-2', entityType: 'engine', aliases: ['J-2', 'J2', 'Rocketdyne J-2'] },
  { canonicalName: 'J-2X', entityType: 'engine', aliases: ['J-2X', 'J2X'] },
];

// ============================================================================
// LAUNCH VEHICLES (222 vehicles)
// ============================================================================

export const LAUNCH_VEHICLE_SEEDS: EntitySeed[] = [
  // SpaceX Launch Vehicles
  { canonicalName: 'Falcon 1', entityType: 'launch_vehicle', aliases: ['F1', 'SpaceX Falcon 1'] },
  { canonicalName: 'Falcon 9', entityType: 'launch_vehicle', aliases: ['F9', 'SpaceX Falcon 9'] },
  { canonicalName: 'Falcon 9 v1.0', entityType: 'launch_vehicle', aliases: ['F9 v1.0', 'Falcon 9 v1', 'Falcon 9 Block 1'] },
  { canonicalName: 'Falcon 9 v1.1', entityType: 'launch_vehicle', aliases: ['F9 v1.1', 'Falcon 9 Block 2', 'Falcon 9 Block 3'] },
  { canonicalName: 'Falcon 9 Full Thrust', entityType: 'launch_vehicle', aliases: ['Falcon 9 v1.2', 'F9 FT', 'Falcon 9 Block 4'] },
  { canonicalName: 'Falcon 9 Block 5', entityType: 'launch_vehicle', aliases: ['F9 Block 5', 'Falcon 9 B5', 'F9 B5'] },
  { canonicalName: 'Falcon Heavy', entityType: 'launch_vehicle', aliases: ['FH', 'Falcon Heavy Block 5', 'SpaceX Falcon Heavy'] },
  { canonicalName: 'Super Heavy', entityType: 'launch_vehicle', aliases: ['Super Heavy Booster', 'Starship Booster', 'B7', 'B9', 'B10', 'B11', 'B12', 'B13'] },
  { canonicalName: 'Starship', entityType: 'launch_vehicle', aliases: ['Starship Super Heavy', 'SpaceX Starship', 'BFR', 'Big Falcon Rocket'] },
  { canonicalName: 'Starship HLS', entityType: 'launch_vehicle', aliases: ['Starship Human Landing System', 'Lunar Starship', 'HLS Starship'] },
  { canonicalName: 'Starship V2', entityType: 'launch_vehicle', aliases: ['Starship Block 2', 'Starship Version 2', 'Ship V2'] },
  { canonicalName: 'Starship V3', entityType: 'launch_vehicle', aliases: ['Starship Block 3', 'Starship Version 3', 'Ship V3', 'S39'] },
  { canonicalName: 'Starship V4', entityType: 'launch_vehicle', aliases: ['Starship Block 4', 'Starship Version 4', 'Ship V4'] },
  { canonicalName: 'Starship Tanker', entityType: 'launch_vehicle', aliases: ['Starship Propellant Tanker', 'Tanker Starship', 'Starship Refueler'] },
  { canonicalName: 'Starship Depot', entityType: 'launch_vehicle', aliases: ['Starship Propellant Depot', 'Depot Starship', 'Orbital Propellant Depot'] },
  { canonicalName: 'Starship Cargo', entityType: 'launch_vehicle', aliases: ['Cargo Starship', 'Starship Cargo Variant'] },
  { canonicalName: 'Super Heavy V3', entityType: 'launch_vehicle', aliases: ['Super Heavy Block 3', 'Booster V3', 'B18', 'B19'] },
  { canonicalName: 'Falcon Heavy Block 5', entityType: 'launch_vehicle', aliases: ['FH Block 5', 'Falcon Heavy B5', 'FH B5'] },

  // SpaceX Spacecraft
  { canonicalName: 'Dragon', entityType: 'launch_vehicle', aliases: ['SpaceX Dragon', 'Dragon 1'] },
  { canonicalName: 'Dragon 2', entityType: 'launch_vehicle', aliases: ['Dragon 2', 'SpaceX Dragon 2'] },
  { canonicalName: 'Crew Dragon', entityType: 'launch_vehicle', aliases: ['Crew Dragon 2', 'Dragon Crew', 'SpaceX Crew Dragon'] },
  { canonicalName: 'Cargo Dragon', entityType: 'launch_vehicle', aliases: ['Cargo Dragon 2', 'Dragon Cargo', 'SpaceX Cargo Dragon', 'CRS Dragon'] },
  { canonicalName: 'Dragon XL', entityType: 'launch_vehicle', aliases: ['SpaceX Dragon XL', 'Gateway Cargo'] },

  // Blue Origin
  { canonicalName: 'New Shepard', entityType: 'launch_vehicle', aliases: ['Blue Origin New Shepard'] },
  { canonicalName: 'New Glenn', entityType: 'launch_vehicle', aliases: ['Blue Origin New Glenn'] },

  // ULA
  { canonicalName: 'Atlas I', entityType: 'launch_vehicle', aliases: ['Atlas 1', 'Atlas-I'] },
  { canonicalName: 'Atlas II', entityType: 'launch_vehicle', aliases: ['Atlas II', 'Atlas 2'] },
  { canonicalName: 'Atlas III', entityType: 'launch_vehicle', aliases: ['Atlas III', 'Atlas 3'] },
  { canonicalName: 'Atlas V', entityType: 'launch_vehicle', aliases: ['Atlas 5', 'Atlas V 551', 'Atlas V 401'] },
  { canonicalName: 'Atlas V 551', entityType: 'launch_vehicle', aliases: ['Atlas V551', 'Atlas 5 551'] },
  { canonicalName: 'Atlas V N22', entityType: 'launch_vehicle', aliases: ['Atlas VN22', 'Atlas V Starliner'] },
  { canonicalName: 'Atlas-Agena', entityType: 'launch_vehicle', aliases: ['Atlas Agena', 'Atlas-Agena D'] },
  { canonicalName: 'Atlas-Centaur', entityType: 'launch_vehicle', aliases: ['Atlas Centaur', 'SLV-3C'] },
  { canonicalName: 'Delta II', entityType: 'launch_vehicle', aliases: ['Delta II', 'Delta 2'] },
  { canonicalName: 'Delta III', entityType: 'launch_vehicle', aliases: ['Delta III', 'Delta 3'] },
  { canonicalName: 'Delta IV', entityType: 'launch_vehicle', aliases: ['Delta 4', 'Delta IV Medium'] },
  { canonicalName: 'Delta IV Heavy', entityType: 'launch_vehicle', aliases: ['Delta IV Heavy', 'Delta 4 Heavy', 'DIV Heavy'] },
  { canonicalName: 'Vulcan Centaur', entityType: 'launch_vehicle', aliases: ['Vulcan', 'Vulcan VC2S', 'Vulcan VC4L'] },
  { canonicalName: 'Vulcan Centaur VC2', entityType: 'launch_vehicle', aliases: ['Vulcan VC2', 'VC2S'] },
  { canonicalName: 'Centaur', entityType: 'launch_vehicle', aliases: ['Centaur V', 'Centaur III'] },

  // Rocket Lab
  { canonicalName: 'Electron', entityType: 'launch_vehicle', aliases: ['Rocket Lab Electron'] },
  { canonicalName: 'Electron Heavy', entityType: 'launch_vehicle', aliases: ['Rocket Lab Electron Heavy'] },
  { canonicalName: 'Neutron', entityType: 'launch_vehicle', aliases: ['Rocket Lab Neutron'] },

  // Firefly
  { canonicalName: 'Firefly Alpha', entityType: 'launch_vehicle', aliases: ['Firefly Alpha', 'Alpha rocket', 'Alpha'] },

  // Relativity
  { canonicalName: 'Terran 1', entityType: 'launch_vehicle', aliases: ['Terran1', 'Terran-1'] },
  { canonicalName: 'Terran R', entityType: 'launch_vehicle', aliases: ['TerranR', 'Terran-R'] },

  // Astra
  { canonicalName: 'Astra Rocket 3', entityType: 'launch_vehicle', aliases: ['Rocket 3', 'Astra 3.0', 'Rocket 3.3'] },
  { canonicalName: 'Rocket 4', entityType: 'launch_vehicle', aliases: ['Astra Rocket 4', 'Astra 4'] },

  // NASA / US Gov
  { canonicalName: 'SLS', entityType: 'launch_vehicle', aliases: ['Space Launch System', 'SLS Block 1', 'SLS Block 2'] },
  { canonicalName: 'SLS Block 1B', entityType: 'launch_vehicle', aliases: ['Space Launch System Block 1B', 'SLS 1B'] },
  { canonicalName: 'SLS Block 2', entityType: 'launch_vehicle', aliases: ['Space Launch System Block 2', 'SLS 2'] },
  { canonicalName: 'Ares I', entityType: 'launch_vehicle', aliases: ['Ares 1', 'Ares I rocket'] },
  { canonicalName: 'Ares V', entityType: 'launch_vehicle', aliases: ['Ares 5', 'Ares V rocket'] },
  { canonicalName: 'Space Shuttle', entityType: 'launch_vehicle', aliases: ['Space Shuttle', 'STS', 'Shuttle'] },

  // Other US
  { canonicalName: 'Antares', entityType: 'launch_vehicle', aliases: ['Antares', 'Northrop Antares'] },
  { canonicalName: 'Antares 330', entityType: 'launch_vehicle', aliases: ['Antares-330', 'Antares 300 series'] },
  { canonicalName: 'Athena I', entityType: 'launch_vehicle', aliases: ['Athena 1', 'Athena-I', 'LLV'] },
  { canonicalName: 'Athena II', entityType: 'launch_vehicle', aliases: ['Athena 2', 'Athena-II'] },
  { canonicalName: 'Minotaur', entityType: 'launch_vehicle', aliases: ['Minotaur', 'Minotaur IV'] },
  { canonicalName: 'Minotaur-C', entityType: 'launch_vehicle', aliases: ['Minotaur C', 'Taurus XL'] },
  { canonicalName: 'Minotaur I', entityType: 'launch_vehicle', aliases: ['Minotaur 1', 'Minotaur-1'] },
  { canonicalName: 'Minotaur IV', entityType: 'launch_vehicle', aliases: ['Minotaur 4', 'Minotaur-4'] },
  { canonicalName: 'Minotaur V', entityType: 'launch_vehicle', aliases: ['Minotaur 5', 'Minotaur-5'] },
  { canonicalName: 'Pegasus', entityType: 'launch_vehicle', aliases: ['Pegasus', 'Orbital Pegasus'] },
  { canonicalName: 'Pegasus XL', entityType: 'launch_vehicle', aliases: ['Pegasus-XL', 'Orbital Pegasus XL'] },
  { canonicalName: 'LauncherOne', entityType: 'launch_vehicle', aliases: ['LauncherOne', 'Launcher One', 'Virgin Orbit LauncherOne'] },
  { canonicalName: 'Omega', entityType: 'launch_vehicle', aliases: ['OmegA', 'Northrop Omega'] },
  { canonicalName: 'RS1', entityType: 'launch_vehicle', aliases: ['ABL RS1', 'ABL Space RS1'] },
  { canonicalName: 'Dauntless', entityType: 'launch_vehicle', aliases: ['Impulse Space Dauntless'] },
  { canonicalName: 'Daytona', entityType: 'launch_vehicle', aliases: ['Phantom Space Daytona'] },
  { canonicalName: 'MLV', entityType: 'launch_vehicle', aliases: ['Medium Launch Vehicle', 'ULA MLV'] },
  { canonicalName: 'Nova', entityType: 'launch_vehicle', aliases: ['Stoke Space Nova'] },
  { canonicalName: 'Vector-R', entityType: 'launch_vehicle', aliases: ['Vector R', 'Vector Rapid'] },
  { canonicalName: 'K1', entityType: 'launch_vehicle', aliases: ['Kistler K-1', 'Rocketplane K-1'] },
  { canonicalName: 'Phantom 1', entityType: 'launch_vehicle', aliases: ['Phantom Space Phantom'] },
  { canonicalName: 'Vaya Space Dauntless', entityType: 'launch_vehicle', aliases: ['Vaya Dauntless'] },

  // Historic US
  { canonicalName: 'Saturn V', entityType: 'launch_vehicle', aliases: ['Saturn V', 'Saturn 5'] },
  { canonicalName: 'Saturn IB', entityType: 'launch_vehicle', aliases: ['Saturn IB', 'Saturn 1B'] },
  { canonicalName: 'Titan II', entityType: 'launch_vehicle', aliases: ['Titan II', 'Titan 2'] },
  { canonicalName: 'Titan III', entityType: 'launch_vehicle', aliases: ['Titan III', 'Titan 3'] },
  { canonicalName: 'Titan IV', entityType: 'launch_vehicle', aliases: ['Titan IV', 'Titan 4'] },
  { canonicalName: 'Thor', entityType: 'launch_vehicle', aliases: ['Thor rocket', 'Thor-Able', 'Thor-Delta'] },
  { canonicalName: 'Thor-Delta', entityType: 'launch_vehicle', aliases: ['Thor Delta', 'Delta A'] },
  { canonicalName: 'Juno I', entityType: 'launch_vehicle', aliases: ['Juno 1', 'Juno-I'] },
  { canonicalName: 'Juno II', entityType: 'launch_vehicle', aliases: ['Juno 2', 'Juno-II'] },
  { canonicalName: 'Scout', entityType: 'launch_vehicle', aliases: ['Scout rocket', 'Scout D'] },
  { canonicalName: 'Redstone', entityType: 'launch_vehicle', aliases: ['Redstone rocket', 'PGM-11'] },
  { canonicalName: 'Jupiter', entityType: 'launch_vehicle', aliases: ['Jupiter rocket', 'Jupiter-C'] },
  { canonicalName: 'Vanguard', entityType: 'launch_vehicle', aliases: ['Vanguard rocket', 'Project Vanguard'] },

  // Russian
  { canonicalName: 'Soyuz', entityType: 'launch_vehicle', aliases: ['Soyuz 2', 'Soyuz-2', 'Soyuz 2.1a', 'Soyuz 2.1b'] },
  { canonicalName: 'Soyuz-2.1a', entityType: 'launch_vehicle', aliases: ['Soyuz 2.1a', 'Soyuz-2-1a'] },
  { canonicalName: 'Soyuz-2.1b', entityType: 'launch_vehicle', aliases: ['Soyuz 2.1b', 'Soyuz-2-1b'] },
  { canonicalName: 'Soyuz-2.1v', entityType: 'launch_vehicle', aliases: ['Soyuz 2.1v', 'Soyuz-2-1v'] },
  { canonicalName: 'Soyuz 5', entityType: 'launch_vehicle', aliases: ['Soyuz-5', 'Irtysh'] },
  { canonicalName: 'Soyuz-7', entityType: 'launch_vehicle', aliases: ['Soyuz 7', 'Amur rocket'] },
  { canonicalName: 'Proton', entityType: 'launch_vehicle', aliases: ['Proton-M', 'Proton M', 'Proton Heavy'] },
  { canonicalName: 'Proton-M', entityType: 'launch_vehicle', aliases: ['Proton M', 'Proton-M/Briz-M'] },
  { canonicalName: 'Angara', entityType: 'launch_vehicle', aliases: ['Angara A5', 'Angara-A5', 'Angara 1.2'] },
  { canonicalName: 'Angara 1', entityType: 'launch_vehicle', aliases: ['Angara 1.2', 'Angara-1', 'Angara 1.2PP'] },
  { canonicalName: 'Angara A5M', entityType: 'launch_vehicle', aliases: ['Angara-A5M', 'Angara A5 Modernized'] },
  { canonicalName: 'Angara A5P', entityType: 'launch_vehicle', aliases: ['Angara-A5P', 'Angara A5 Piloted'] },
  { canonicalName: 'Amur', entityType: 'launch_vehicle', aliases: ['Amur rocket', 'Roscosmos Amur'] },
  { canonicalName: 'Zenit', entityType: 'launch_vehicle', aliases: ['Zenit', 'Zenit-2', 'Zenit-3'] },
  { canonicalName: 'Rokot', entityType: 'launch_vehicle', aliases: ['Rokot-M', 'Rockot'] },
  { canonicalName: 'Rokot-M', entityType: 'launch_vehicle', aliases: ['Rockot-M', 'Rokot M'] },
  { canonicalName: 'Dnepr', entityType: 'launch_vehicle', aliases: ['Dnepr rocket', 'Dnepr-1'] },
  { canonicalName: 'Tsyklon', entityType: 'launch_vehicle', aliases: ['Tsyklon-3', 'Tsyklon-4', 'Cyclone'] },
  { canonicalName: 'Kosmos', entityType: 'launch_vehicle', aliases: ['Kosmos-3M', 'Cosmos rocket'] },
  { canonicalName: 'Start', entityType: 'launch_vehicle', aliases: ['Start-1', 'Start rocket'] },
  { canonicalName: 'Shtil', entityType: 'launch_vehicle', aliases: ['Shtil rocket', 'Shtil-1'] },
  { canonicalName: 'Energia', entityType: 'launch_vehicle', aliases: ['Energia', 'Energia rocket'] },
  { canonicalName: 'N1', entityType: 'launch_vehicle', aliases: ['N1', 'N-1', 'Soviet N1'] },

  // European - Ariane
  { canonicalName: 'Ariane 1', entityType: 'launch_vehicle', aliases: ['Ariane 1', 'Ariane-1'] },
  { canonicalName: 'Ariane 2', entityType: 'launch_vehicle', aliases: ['Ariane 2', 'Ariane-2'] },
  { canonicalName: 'Ariane 3', entityType: 'launch_vehicle', aliases: ['Ariane 3', 'Ariane-3'] },
  { canonicalName: 'Ariane 4', entityType: 'launch_vehicle', aliases: ['Ariane 4', 'Ariane-4', 'Ariane 44L', 'Ariane 44P'] },
  { canonicalName: 'Ariane 5', entityType: 'launch_vehicle', aliases: ['Ariane5', 'Ariane V'] },
  { canonicalName: 'Ariane 6', entityType: 'launch_vehicle', aliases: ['Ariane6', 'Ariane VI', 'A62', 'A64'] },
  { canonicalName: 'Ariane 6 A62', entityType: 'launch_vehicle', aliases: ['A62', 'Ariane 62'] },
  { canonicalName: 'Ariane 6 A64', entityType: 'launch_vehicle', aliases: ['A64', 'Ariane 64'] },

  // European - Vega
  { canonicalName: 'Vega', entityType: 'launch_vehicle', aliases: ['Vega rocket', 'ESA Vega'] },
  { canonicalName: 'Vega C', entityType: 'launch_vehicle', aliases: ['Vega-C', 'VegaC', 'Vega C rocket'] },
  { canonicalName: 'Vega E', entityType: 'launch_vehicle', aliases: ['Vega Evolution', 'Vega-E'] },

  // European - Other
  { canonicalName: 'Diamant', entityType: 'launch_vehicle', aliases: ['Diamant A', 'Diamant B', 'Diamant BP4'] },
  { canonicalName: 'Europa', entityType: 'launch_vehicle', aliases: ['Europa rocket', 'Europa 1', 'Europa 2'] },
  { canonicalName: 'Maia', entityType: 'launch_vehicle', aliases: ['Avio Maia'] },
  { canonicalName: 'Spectrum', entityType: 'launch_vehicle', aliases: ['Isar Aerospace Spectrum'] },
  { canonicalName: 'RFA One', entityType: 'launch_vehicle', aliases: ['RFA ONE', 'Rocket Factory Augsburg One'] },
  { canonicalName: 'Skyrora XL', entityType: 'launch_vehicle', aliases: ['Skyrora XL rocket'] },
  { canonicalName: 'Prime', entityType: 'launch_vehicle', aliases: ['Orbex Prime'] },
  { canonicalName: 'OB-1 Mk1', entityType: 'launch_vehicle', aliases: ['OB-1', 'Orbex OB-1'] },
  { canonicalName: 'Zephyr', entityType: 'launch_vehicle', aliases: ['Latitude Zephyr', 'Zephyr rocket'] },
  { canonicalName: 'Zephyr FR', entityType: 'launch_vehicle', aliases: ['Latitude Zephyr'] },

  // Chinese - Long March
  { canonicalName: 'Long March 1', entityType: 'launch_vehicle', aliases: ['CZ-1', 'Chang Zheng 1', 'LM-1'] },
  { canonicalName: 'Long March 2', entityType: 'launch_vehicle', aliases: ['Long March 2', 'CZ-2', 'Chang Zheng 2'] },
  { canonicalName: 'Long March 2C', entityType: 'launch_vehicle', aliases: ['CZ-2C', 'Chang Zheng 2C'] },
  { canonicalName: 'Long March 2D', entityType: 'launch_vehicle', aliases: ['CZ-2D', 'Chang Zheng 2D'] },
  { canonicalName: 'Long March 2F', entityType: 'launch_vehicle', aliases: ['CZ-2F', 'Chang Zheng 2F', 'Shenjian'] },
  { canonicalName: 'Long March 3', entityType: 'launch_vehicle', aliases: ['Long March 3', 'CZ-3', 'Chang Zheng 3'] },
  { canonicalName: 'Long March 3A', entityType: 'launch_vehicle', aliases: ['CZ-3A', 'Chang Zheng 3A'] },
  { canonicalName: 'Long March 3B', entityType: 'launch_vehicle', aliases: ['CZ-3B', 'Chang Zheng 3B'] },
  { canonicalName: 'Long March 3B/E', entityType: 'launch_vehicle', aliases: ['CZ-3B/E', 'Long March 3BE'] },
  { canonicalName: 'Long March 3C', entityType: 'launch_vehicle', aliases: ['CZ-3C', 'Chang Zheng 3C'] },
  { canonicalName: 'Long March 4', entityType: 'launch_vehicle', aliases: ['Long March 4', 'CZ-4', 'Chang Zheng 4'] },
  { canonicalName: 'Long March 4B', entityType: 'launch_vehicle', aliases: ['CZ-4B', 'Chang Zheng 4B'] },
  { canonicalName: 'Long March 4C', entityType: 'launch_vehicle', aliases: ['CZ-4C', 'Chang Zheng 4C'] },
  { canonicalName: 'Long March 5', entityType: 'launch_vehicle', aliases: ['CZ-5', 'Chang Zheng 5', 'LM-5'] },
  { canonicalName: 'Long March 5B', entityType: 'launch_vehicle', aliases: ['CZ-5B', 'Chang Zheng 5B'] },
  { canonicalName: 'Long March 6', entityType: 'launch_vehicle', aliases: ['Long March 6', 'CZ-6', 'Chang Zheng 6'] },
  { canonicalName: 'Long March 6A', entityType: 'launch_vehicle', aliases: ['CZ-6A', 'Chang Zheng 6A'] },
  { canonicalName: 'Long March 6C', entityType: 'launch_vehicle', aliases: ['CZ-6C', 'Chang Zheng 6C'] },
  { canonicalName: 'Long March 7', entityType: 'launch_vehicle', aliases: ['CZ-7', 'Chang Zheng 7', 'LM-7'] },
  { canonicalName: 'Long March 7A', entityType: 'launch_vehicle', aliases: ['CZ-7A', 'Chang Zheng 7A'] },
  { canonicalName: 'Long March 8', entityType: 'launch_vehicle', aliases: ['CZ-8', 'Chang Zheng 8', 'LM-8'] },
  { canonicalName: 'Long March 8A', entityType: 'launch_vehicle', aliases: ['CZ-8A', 'Chang Zheng 8A'] },
  { canonicalName: 'Long March 9', entityType: 'launch_vehicle', aliases: ['CZ-9', 'Chang Zheng 9', 'LM-9'] },
  { canonicalName: 'Long March 10', entityType: 'launch_vehicle', aliases: ['CZ-10', 'Chang Zheng 10'] },
  { canonicalName: 'Long March 10A', entityType: 'launch_vehicle', aliases: ['CZ-10A', 'Chang Zheng 10A'] },
  { canonicalName: 'Long March 11', entityType: 'launch_vehicle', aliases: ['Long March 11', 'CZ-11', 'Chang Zheng 11'] },
  { canonicalName: 'Kuaizhou', entityType: 'launch_vehicle', aliases: ['Kuaizhou', 'KZ-1', 'KZ-11'] },
  { canonicalName: 'Kuaizhou 1A', entityType: 'launch_vehicle', aliases: ['KZ-1A', 'Kuaizhou-1A'] },
  { canonicalName: 'Kuaizhou 11', entityType: 'launch_vehicle', aliases: ['KZ-11', 'Kuaizhou-11'] },

  // Chinese - Commercial
  { canonicalName: 'Jielong-1', entityType: 'launch_vehicle', aliases: ['Smart Dragon 1', 'SD-1'] },
  { canonicalName: 'Jielong-3', entityType: 'launch_vehicle', aliases: ['Smart Dragon 3', 'SD-3'] },
  { canonicalName: 'Jielong-4', entityType: 'launch_vehicle', aliases: ['Jielong 4', 'Smart Dragon 4', 'SD-4'] },
  { canonicalName: 'Ceres-1', entityType: 'launch_vehicle', aliases: ['Ceres 1', 'Galactic Energy Ceres-1'] },
  { canonicalName: 'Ceres-1S', entityType: 'launch_vehicle', aliases: ['Ceres 1S', 'Galactic Energy Ceres-1S'] },
  { canonicalName: 'Pallas-1', entityType: 'launch_vehicle', aliases: ['Pallas 1', 'Galactic Energy Pallas-1'] },
  { canonicalName: 'Kinetica-1', entityType: 'launch_vehicle', aliases: ['Kinetica 1', 'CAS Space Kinetica'] },
  { canonicalName: 'Hyperbola-1', entityType: 'launch_vehicle', aliases: ['Hyperbola 1', 'iSpace Hyperbola-1'] },
  { canonicalName: 'Hyperbola-3', entityType: 'launch_vehicle', aliases: ['Hyperbola 3', 'iSpace Hyperbola-3'] },
  { canonicalName: 'Zhuque-2', entityType: 'launch_vehicle', aliases: ['ZQ-2', 'Landspace Zhuque-2'] },
  { canonicalName: 'Zhuque-3', entityType: 'launch_vehicle', aliases: ['ZQ-3', 'Landspace Zhuque-3'] },
  { canonicalName: 'Tianlong-2', entityType: 'launch_vehicle', aliases: ['TL-2', 'Space Pioneer Tianlong-2'] },
  { canonicalName: 'Tianlong-3', entityType: 'launch_vehicle', aliases: ['TL-3', 'Space Pioneer Tianlong-3'] },
  { canonicalName: 'Gravity-1', entityType: 'launch_vehicle', aliases: ['Gravity 1', 'OrienSpace Gravity-1'] },
  { canonicalName: 'Gravity-2', entityType: 'launch_vehicle', aliases: ['Gravity 2', 'OrienSpace Gravity-2'] },
  { canonicalName: 'Nebula-1', entityType: 'launch_vehicle', aliases: ['Nebula 1', 'Deep Blue Aerospace Nebula-1'] },

  // Japanese
  { canonicalName: 'H-I', entityType: 'launch_vehicle', aliases: ['H-1', 'H1'] },
  { canonicalName: 'H-II', entityType: 'launch_vehicle', aliases: ['H-2', 'H2'] },
  { canonicalName: 'H-IIA', entityType: 'launch_vehicle', aliases: ['H2A', 'H-2A'] },
  { canonicalName: 'H-IIB', entityType: 'launch_vehicle', aliases: ['H-IIB', 'H2B', 'HII-B'] },
  { canonicalName: 'H3', entityType: 'launch_vehicle', aliases: ['H-3', 'H3 Launch Vehicle'] },
  { canonicalName: 'H3-22S', entityType: 'launch_vehicle', aliases: ['H3 22S', 'H-3 22S'] },
  { canonicalName: 'H3-22L', entityType: 'launch_vehicle', aliases: ['H3 22L', 'H-3 22L'] },
  { canonicalName: 'H3-24L', entityType: 'launch_vehicle', aliases: ['H3 24L', 'H-3 24L'] },
  { canonicalName: 'H3-30S', entityType: 'launch_vehicle', aliases: ['H3 30S', 'H-3 30S'] },
  { canonicalName: 'Epsilon', entityType: 'launch_vehicle', aliases: ['Epsilon Rocket'] },
  { canonicalName: 'Epsilon S', entityType: 'launch_vehicle', aliases: ['Epsilon-S', 'Enhanced Epsilon'] },
  { canonicalName: 'M-V', entityType: 'launch_vehicle', aliases: ['M-5', 'Mu-5'] },
  { canonicalName: 'Lambda', entityType: 'launch_vehicle', aliases: ['Lambda rocket', 'Lambda 4S'] },
  { canonicalName: 'N-I', entityType: 'launch_vehicle', aliases: ['N-1 Japan', 'N1 Japan'] },
  { canonicalName: 'N-II', entityType: 'launch_vehicle', aliases: ['N-2 Japan', 'N2 Japan'] },
  { canonicalName: 'SS-520', entityType: 'launch_vehicle', aliases: ['SS-520 rocket'] },
  { canonicalName: 'Kairos', entityType: 'launch_vehicle', aliases: ['Space One Kairos'] },
  { canonicalName: 'Zero', entityType: 'launch_vehicle', aliases: ['IHI Zero', 'Zero rocket'] },

  // Indian
  { canonicalName: 'SLV', entityType: 'launch_vehicle', aliases: ['SLV-3', 'Satellite Launch Vehicle'] },
  { canonicalName: 'ASLV', entityType: 'launch_vehicle', aliases: ['Augmented Satellite Launch Vehicle'] },
  { canonicalName: 'PSLV', entityType: 'launch_vehicle', aliases: ['Polar Satellite Launch Vehicle'] },
  { canonicalName: 'PSLV-CA', entityType: 'launch_vehicle', aliases: ['PSLV CA', 'PSLV Core Alone'] },
  { canonicalName: 'PSLV-DL', entityType: 'launch_vehicle', aliases: ['PSLV DL', 'PSLV Dual Launch'] },
  { canonicalName: 'PSLV-QL', entityType: 'launch_vehicle', aliases: ['PSLV QL', 'PSLV Quad Launch'] },
  { canonicalName: 'PSLV-XL', entityType: 'launch_vehicle', aliases: ['PSLV XL', 'PSLV Extended'] },
  { canonicalName: 'GSLV', entityType: 'launch_vehicle', aliases: ['Geosynchronous Satellite Launch Vehicle', 'GSLV Mk III', 'LVM3'] },
  { canonicalName: 'GSLV Mk II', entityType: 'launch_vehicle', aliases: ['GSLV Mark 2', 'GSLV-Mk2'] },
  { canonicalName: 'GSLV Mk III', entityType: 'launch_vehicle', aliases: ['LVM3', 'GSLV Mark 3', 'Geosynchronous Satellite Launch Vehicle Mk III'] },
  { canonicalName: 'LVM 3', entityType: 'launch_vehicle', aliases: ['LVM3', 'Launch Vehicle Mark 3'] },
  { canonicalName: 'SSLV', entityType: 'launch_vehicle', aliases: ['Small Satellite Launch Vehicle', 'ISRO SSLV'] },
  { canonicalName: 'RLV-TD', entityType: 'launch_vehicle', aliases: ['Reusable Launch Vehicle', 'ISRO RLV'] },
  { canonicalName: 'Agnibaan', entityType: 'launch_vehicle', aliases: ['Agnikul Agnibaan', 'Agnibaan SOrTeD'] },

  // South Korean
  { canonicalName: 'Naro', entityType: 'launch_vehicle', aliases: ['KSLV-1', 'Naro-1'] },
  { canonicalName: 'Nuri', entityType: 'launch_vehicle', aliases: ['KSLV-II', 'Nuri rocket'] },
  { canonicalName: 'KSLV-III', entityType: 'launch_vehicle', aliases: ['KSLV-3', 'Nuri-2'] },
  { canonicalName: 'Blue Whale 1', entityType: 'launch_vehicle', aliases: ['Blue Whale', 'Perigee Blue Whale'] },
  { canonicalName: 'Hanbit-Nano', entityType: 'launch_vehicle', aliases: ['Hanbit Nano', 'Innospace Hanbit'] },

  // Israeli
  { canonicalName: 'Shavit', entityType: 'launch_vehicle', aliases: ['Shavit rocket', 'Shavit 2'] },
  { canonicalName: 'Shavit-2', entityType: 'launch_vehicle', aliases: ['Shavit 2', 'Shavit-2 rocket'] },

  // Iranian
  { canonicalName: 'Safir', entityType: 'launch_vehicle', aliases: ['Safir rocket', 'Safir SLV'] },
  { canonicalName: 'Simorgh', entityType: 'launch_vehicle', aliases: ['Simorgh rocket', 'Simorgh SLV'] },
  { canonicalName: 'Qased', entityType: 'launch_vehicle', aliases: ['Qased rocket'] },
  { canonicalName: 'Qaem 100', entityType: 'launch_vehicle', aliases: ['Qaem-100', 'Ghaem 100'] },

  // North Korean
  { canonicalName: 'Unha', entityType: 'launch_vehicle', aliases: ['Unha rocket', 'Unha-3', 'Paektusan'] },
  { canonicalName: 'Chollima-1', entityType: 'launch_vehicle', aliases: ['Chollima 1'] },

  // Ukrainian
  { canonicalName: 'Cyclone-4M', entityType: 'launch_vehicle', aliases: ['Tsyklon-4M', 'Cyclone 4M'] },

  // Other Countries
  { canonicalName: 'VLS', entityType: 'launch_vehicle', aliases: ['VLS-1', 'Veículo Lançador de Satélites'] },
  { canonicalName: 'Aurora', entityType: 'launch_vehicle', aliases: ['Maritime Launch Aurora'] },
  { canonicalName: 'Aventura 1', entityType: 'launch_vehicle', aliases: ['Aventura I', 'CONAE Aventura'] },
  { canonicalName: 'Tronador II', entityType: 'launch_vehicle', aliases: ['Tronador 2', 'Tronador II-250'] },
  { canonicalName: 'SL1', entityType: 'launch_vehicle', aliases: ['HyImpulse SL1', 'SR75'] },
  { canonicalName: 'Siraya', entityType: 'launch_vehicle', aliases: ['TiSPACE Siraya', 'Hapith I'] },
  { canonicalName: 'Volans', entityType: 'launch_vehicle', aliases: ['Equatorial Space Volans', 'Volans V500'] },
  { canonicalName: 'ŞIMŞEK-1', entityType: 'launch_vehicle', aliases: ['Simsek-1', 'ROKETSAN ŞIMŞEK'] },
  { canonicalName: 'Miura 1', entityType: 'launch_vehicle', aliases: ['Miura-1', 'PLD Space Miura 1'] },
  { canonicalName: 'Miura 5', entityType: 'launch_vehicle', aliases: ['Miura-5', 'PLD Space Miura 5'] },
  { canonicalName: 'Eris', entityType: 'launch_vehicle', aliases: ['Gilmour Space Eris'] },
  { canonicalName: 'Stardust 1.0', entityType: 'launch_vehicle', aliases: ['Stardust 1', 'bluShift Stardust'] },
];

// ============================================================================
// LAUNCH SITES (70+ sites worldwide)
// ============================================================================

export const LAUNCH_SITE_SEEDS: EntitySeed[] = [
  // United States - Florida
  { canonicalName: 'Kennedy Space Center', entityType: 'launch_site', aliases: ['KSC', 'Cape Kennedy', 'John F. Kennedy Space Center'] },
  { canonicalName: 'Cape Canaveral Space Force Station', entityType: 'launch_site', aliases: ['CCSFS', 'Cape Canaveral', 'CCAFS', 'Cape Canaveral Air Force Station', 'Eastern Range'] },
  { canonicalName: 'LC-39A', entityType: 'launch_site', aliases: ['Launch Complex 39A', 'Pad 39A', 'KSC LC-39A'] },
  { canonicalName: 'LC-39B', entityType: 'launch_site', aliases: ['Launch Complex 39B', 'Pad 39B', 'KSC LC-39B'] },
  { canonicalName: 'SLC-40', entityType: 'launch_site', aliases: ['Space Launch Complex 40', 'CCSFS SLC-40'] },
  { canonicalName: 'SLC-41', entityType: 'launch_site', aliases: ['Space Launch Complex 41', 'CCSFS SLC-41'] },

  // United States - California
  { canonicalName: 'Vandenberg Space Force Base', entityType: 'launch_site', aliases: ['VSFB', 'Vandenberg AFB', 'Vandenberg', 'Western Range', 'VAFB'] },
  { canonicalName: 'SLC-4E', entityType: 'launch_site', aliases: ['Space Launch Complex 4 East', 'Vandenberg SLC-4E'] },
  { canonicalName: 'SLC-4W', entityType: 'launch_site', aliases: ['Space Launch Complex 4 West', 'Vandenberg SLC-4W'] },
  { canonicalName: 'SLC-6', entityType: 'launch_site', aliases: ['Space Launch Complex 6', 'Slick Six', 'Vandenberg SLC-6'] },
  { canonicalName: 'Mojave Air and Space Port', entityType: 'launch_site', aliases: ['Mojave Spaceport', 'Mojave', 'MASP'] },

  // United States - Texas
  { canonicalName: 'SpaceX Starbase', entityType: 'launch_site', aliases: ['Starbase', 'Boca Chica', 'SpaceX South Texas', 'Boca Chica Launch Site'] },

  // United States - Virginia
  { canonicalName: 'Wallops Flight Facility', entityType: 'launch_site', aliases: ['Wallops', 'WFF', 'NASA Wallops', 'Mid-Atlantic Regional Spaceport', 'MARS'] },

  // United States - Alaska
  { canonicalName: 'Pacific Spaceport Complex', entityType: 'launch_site', aliases: ['PSCA', 'Kodiak Launch Complex', 'Kodiak Island'] },

  // United States - New Mexico
  { canonicalName: 'Spaceport America', entityType: 'launch_site', aliases: ['New Mexico Spaceport', 'Virgin Galactic Spaceport'] },

  // United States - Other
  { canonicalName: 'Corn Ranch', entityType: 'launch_site', aliases: ['Blue Origin West Texas', 'Launch Site One', 'Van Horn'] },
  { canonicalName: 'Rocket Lab Launch Complex 2', entityType: 'launch_site', aliases: ['LC-2', 'Wallops LC-2', 'Rocket Lab LC-2'] },

  // Russia
  { canonicalName: 'Baikonur Cosmodrome', entityType: 'launch_site', aliases: ['Baikonur', 'Tyuratam', 'NIIP-5', 'Cosmodrome Baikonur'] },
  { canonicalName: 'Plesetsk Cosmodrome', entityType: 'launch_site', aliases: ['Plesetsk', 'Cosmodrome Plesetsk', 'NIIP-53'] },
  { canonicalName: 'Vostochny Cosmodrome', entityType: 'launch_site', aliases: ['Vostochny', 'Cosmodrome Vostochny'] },
  { canonicalName: 'Kapustin Yar', entityType: 'launch_site', aliases: ['Kapustin Yar Cosmodrome', 'GTsP-4'] },
  { canonicalName: 'Svobodny Cosmodrome', entityType: 'launch_site', aliases: ['Svobodny'] },

  // China
  { canonicalName: 'Jiuquan Satellite Launch Center', entityType: 'launch_site', aliases: ['Jiuquan', 'JSLC', 'Shuang Cheng Tzu'] },
  { canonicalName: 'Xichang Satellite Launch Center', entityType: 'launch_site', aliases: ['Xichang', 'XSLC'] },
  { canonicalName: 'Taiyuan Satellite Launch Center', entityType: 'launch_site', aliases: ['Taiyuan', 'TSLC', 'Wuzhai'] },
  { canonicalName: 'Wenchang Space Launch Site', entityType: 'launch_site', aliases: ['Wenchang', 'Wenchang Spacecraft Launch Site', 'Hainan'] },
  { canonicalName: 'Dongfeng Aerospace City', entityType: 'launch_site', aliases: ['Dongfeng', 'Base 10'] },

  // Europe - French Guiana
  { canonicalName: 'Guiana Space Centre', entityType: 'launch_site', aliases: ['Kourou', 'CSG', 'Centre Spatial Guyanais', 'Europe\'s Spaceport'] },
  { canonicalName: 'ELA-3', entityType: 'launch_site', aliases: ['Ariane Launch Area 3', 'Ensemble de Lancement Ariane 3'] },
  { canonicalName: 'ELA-4', entityType: 'launch_site', aliases: ['Ariane Launch Area 4', 'Ariane 6 Launch Complex'] },
  { canonicalName: 'ELV', entityType: 'launch_site', aliases: ['Vega Launch Complex', 'Ensemble de Lancement Vega'] },

  // Europe - Other
  { canonicalName: 'Esrange Space Center', entityType: 'launch_site', aliases: ['Esrange', 'Kiruna'] },
  { canonicalName: 'Andøya Space', entityType: 'launch_site', aliases: ['Andøya', 'Andoya Rocket Range', 'Andøya Spaceport'] },
  { canonicalName: 'SaxaVord Spaceport', entityType: 'launch_site', aliases: ['SaxaVord', 'Shetland Space Centre', 'Unst'] },
  { canonicalName: 'Sutherland Spaceport', entityType: 'launch_site', aliases: ['Space Hub Sutherland', 'A\'Mhoine'] },
  { canonicalName: 'Cornwall Spaceport', entityType: 'launch_site', aliases: ['Spaceport Cornwall', 'Newquay'] },

  // Japan
  { canonicalName: 'Tanegashima Space Center', entityType: 'launch_site', aliases: ['Tanegashima', 'TNSC', 'JAXA Tanegashima'] },
  { canonicalName: 'Uchinoura Space Center', entityType: 'launch_site', aliases: ['Uchinoura', 'USC', 'Kagoshima Space Center'] },
  { canonicalName: 'Noshiro Rocket Testing Center', entityType: 'launch_site', aliases: ['Noshiro', 'NTC'] },

  // India
  { canonicalName: 'Satish Dhawan Space Centre', entityType: 'launch_site', aliases: ['SDSC', 'Sriharikota', 'SHAR', 'ISRO Sriharikota'] },
  { canonicalName: 'First Launch Pad', entityType: 'launch_site', aliases: ['FLP', 'Sriharikota FLP'] },
  { canonicalName: 'Second Launch Pad', entityType: 'launch_site', aliases: ['SLP', 'Sriharikota SLP'] },
  { canonicalName: 'Thumba Equatorial Rocket Launching Station', entityType: 'launch_site', aliases: ['TERLS', 'Thumba'] },

  // South Korea
  { canonicalName: 'Naro Space Center', entityType: 'launch_site', aliases: ['Naro', 'Goheung', 'Korea Space Launch Complex'] },

  // Israel
  { canonicalName: 'Palmachim Airbase', entityType: 'launch_site', aliases: ['Palmachim', 'Palmahim'] },

  // Iran
  { canonicalName: 'Imam Khomeini Spaceport', entityType: 'launch_site', aliases: ['Imam Khomeini Space Center', 'Semnan Launch Site'] },
  { canonicalName: 'Shahrud Missile Test Site', entityType: 'launch_site', aliases: ['Shahrud', 'Shahrud Launch Site'] },

  // North Korea
  { canonicalName: 'Sohae Satellite Launching Station', entityType: 'launch_site', aliases: ['Sohae', 'Tongchang-ri', 'Sohae Launch Facility'] },
  { canonicalName: 'Tonghae Satellite Launching Ground', entityType: 'launch_site', aliases: ['Tonghae', 'Musudan-ri'] },

  // Brazil
  { canonicalName: 'Alcântara Launch Center', entityType: 'launch_site', aliases: ['Alcântara', 'CLA', 'Centro de Lançamento de Alcântara'] },
  { canonicalName: 'Barreira do Inferno Launch Center', entityType: 'launch_site', aliases: ['Barreira do Inferno', 'CLBI'] },

  // Australia
  { canonicalName: 'Woomera Range Complex', entityType: 'launch_site', aliases: ['Woomera', 'Woomera Test Range'] },
  { canonicalName: 'Arnhem Space Centre', entityType: 'launch_site', aliases: ['Arnhem', 'Equatorial Launch Australia'] },
  { canonicalName: 'Bowen Orbital Spaceport', entityType: 'launch_site', aliases: ['Bowen', 'Gilmour Space Bowen'] },

  // New Zealand
  { canonicalName: 'Rocket Lab Launch Complex 1', entityType: 'launch_site', aliases: ['LC-1', 'Māhia Peninsula', 'Rocket Lab LC-1', 'Onenui Station'] },

  // Pakistan
  { canonicalName: 'Sonmiani', entityType: 'launch_site', aliases: ['Sonmiani Flight Test Range', 'SUPARCO Sonmiani'] },

  // Argentina
  { canonicalName: 'Punta Indio', entityType: 'launch_site', aliases: ['Centro de Experimentación y Lanzamiento de Proyectiles Autopropulsados'] },

  // Sea Launch
  { canonicalName: 'Sea Launch', entityType: 'launch_site', aliases: ['Sea Launch Platform', 'Odyssey Platform', 'Ocean Odyssey'] },

  // Historic Sites
  { canonicalName: 'San Marco Platform', entityType: 'launch_site', aliases: ['San Marco', 'Luigi Broglio Space Centre'] },
  { canonicalName: 'Hammaguir', entityType: 'launch_site', aliases: ['Centre interarmées d\'essais d\'engins spéciaux', 'CIEES'] },
  { canonicalName: 'White Sands Missile Range', entityType: 'launch_site', aliases: ['White Sands', 'WSMR'] },
  { canonicalName: 'Edwards Air Force Base', entityType: 'launch_site', aliases: ['Edwards AFB', 'Dryden Flight Research Center'] },
];

// ============================================================================
// SPACE MISSIONS (100+ missions)
// ============================================================================

export const MISSION_SEEDS: EntitySeed[] = [
  // NASA Human Spaceflight Programs
  { canonicalName: 'Mercury Program', entityType: 'space_mission', aliases: ['Project Mercury', 'Mercury'] },
  { canonicalName: 'Mercury-Redstone 3', entityType: 'space_mission', aliases: ['Freedom 7', 'MR-3', 'Alan Shepard flight'] },
  { canonicalName: 'Mercury-Atlas 6', entityType: 'space_mission', aliases: ['Friendship 7', 'MA-6', 'John Glenn orbital'] },
  { canonicalName: 'Gemini Program', entityType: 'space_mission', aliases: ['Project Gemini', 'Gemini'] },
  { canonicalName: 'Gemini 4', entityType: 'space_mission', aliases: ['Gemini IV', 'First US EVA'] },
  { canonicalName: 'Gemini 8', entityType: 'space_mission', aliases: ['Gemini VIII', 'First docking'] },
  { canonicalName: 'Apollo Program', entityType: 'space_mission', aliases: ['Project Apollo', 'Apollo'] },
  { canonicalName: 'Apollo 1', entityType: 'space_mission', aliases: ['AS-204', 'Apollo 204'] },
  { canonicalName: 'Apollo 7', entityType: 'space_mission', aliases: ['First crewed Apollo'] },
  { canonicalName: 'Apollo 8', entityType: 'space_mission', aliases: ['First lunar orbit'] },
  { canonicalName: 'Apollo 11', entityType: 'space_mission', aliases: ['First Moon landing', 'Eagle', 'Tranquility Base'] },
  { canonicalName: 'Apollo 12', entityType: 'space_mission', aliases: ['Second Moon landing', 'Intrepid'] },
  { canonicalName: 'Apollo 13', entityType: 'space_mission', aliases: ['Successful failure', 'Aquarius'] },
  { canonicalName: 'Apollo 14', entityType: 'space_mission', aliases: ['Fra Mauro', 'Antares'] },
  { canonicalName: 'Apollo 15', entityType: 'space_mission', aliases: ['Hadley Rille', 'Falcon'] },
  { canonicalName: 'Apollo 16', entityType: 'space_mission', aliases: ['Descartes Highlands', 'Orion'] },
  { canonicalName: 'Apollo 17', entityType: 'space_mission', aliases: ['Last Moon landing', 'Challenger'] },
  { canonicalName: 'Skylab', entityType: 'space_mission', aliases: ['Skylab Program', 'Skylab 1'] },
  { canonicalName: 'Apollo-Soyuz', entityType: 'space_mission', aliases: ['ASTP', 'Apollo-Soyuz Test Project'] },

  // Space Shuttle Program
  { canonicalName: 'Space Shuttle Program', entityType: 'space_mission', aliases: ['STS', 'Space Transportation System'] },
  { canonicalName: 'STS-1', entityType: 'space_mission', aliases: ['First Shuttle flight', 'Columbia STS-1'] },
  { canonicalName: 'STS-41-B', entityType: 'space_mission', aliases: ['First untethered EVA', 'Challenger STS-41-B'] },
  { canonicalName: 'STS-51-L', entityType: 'space_mission', aliases: ['Challenger disaster', 'Challenger accident'] },
  { canonicalName: 'STS-31', entityType: 'space_mission', aliases: ['Hubble deployment', 'Discovery STS-31'] },
  { canonicalName: 'STS-71', entityType: 'space_mission', aliases: ['First Shuttle-Mir docking'] },
  { canonicalName: 'STS-107', entityType: 'space_mission', aliases: ['Columbia disaster', 'Columbia accident'] },
  { canonicalName: 'STS-135', entityType: 'space_mission', aliases: ['Final Shuttle flight', 'Atlantis STS-135'] },

  // Artemis Program
  { canonicalName: 'Artemis Program', entityType: 'space_mission', aliases: ['Artemis', 'Moon to Mars'] },
  { canonicalName: 'Artemis I', entityType: 'space_mission', aliases: ['Artemis 1', 'EM-1', 'Exploration Mission 1'] },
  { canonicalName: 'Artemis II', entityType: 'space_mission', aliases: ['Artemis 2', 'First crewed Artemis'] },
  { canonicalName: 'Artemis III', entityType: 'space_mission', aliases: ['Artemis 3', 'First woman on Moon'] },

  // ISS Missions
  { canonicalName: 'International Space Station', entityType: 'space_mission', aliases: ['ISS', 'Space Station'] },
  { canonicalName: 'Expedition 1', entityType: 'space_mission', aliases: ['ISS Expedition 1', 'First ISS crew'] },

  // SpaceX Missions
  { canonicalName: 'COTS Demo Flight 1', entityType: 'space_mission', aliases: ['Dragon C1', 'SpaceX COTS 1'] },
  { canonicalName: 'COTS Demo Flight 2', entityType: 'space_mission', aliases: ['Dragon C2+', 'SpaceX COTS 2'] },
  { canonicalName: 'CRS-1', entityType: 'space_mission', aliases: ['SpX-1', 'SpaceX CRS-1'] },
  { canonicalName: 'Demo-2', entityType: 'space_mission', aliases: ['SpaceX Demo-2', 'Crew Dragon Demo-2', 'First commercial crew'] },
  { canonicalName: 'Crew-1', entityType: 'space_mission', aliases: ['SpaceX Crew-1', 'Resilience'] },
  { canonicalName: 'Inspiration4', entityType: 'space_mission', aliases: ['Inspiration 4', 'First all-civilian orbital'] },
  { canonicalName: 'Polaris Dawn', entityType: 'space_mission', aliases: ['Polaris Program', 'First commercial EVA'] },
  { canonicalName: 'Starlink', entityType: 'space_mission', aliases: ['Starlink constellation', 'SpaceX Starlink'] },
  { canonicalName: 'Starship IFT-1', entityType: 'space_mission', aliases: ['Starship Flight 1', 'Integrated Flight Test 1'] },
  { canonicalName: 'Starship IFT-2', entityType: 'space_mission', aliases: ['Starship Flight 2', 'Integrated Flight Test 2'] },
  { canonicalName: 'Starship IFT-3', entityType: 'space_mission', aliases: ['Starship Flight 3', 'Integrated Flight Test 3'] },
  { canonicalName: 'Starship IFT-4', entityType: 'space_mission', aliases: ['Starship Flight 4', 'Integrated Flight Test 4'] },
  { canonicalName: 'Starship IFT-5', entityType: 'space_mission', aliases: ['Starship Flight 5', 'Integrated Flight Test 5', 'First booster catch'] },
  { canonicalName: 'Starship IFT-6', entityType: 'space_mission', aliases: ['Starship Flight 6', 'Integrated Flight Test 6'] },

  // Blue Origin
  { canonicalName: 'NS-15', entityType: 'space_mission', aliases: ['New Shepard 15', 'First crewed New Shepard'] },

  // Soviet/Russian Programs
  { canonicalName: 'Sputnik 1', entityType: 'space_mission', aliases: ['Sputnik', 'PS-1', 'First artificial satellite'] },
  { canonicalName: 'Sputnik 2', entityType: 'space_mission', aliases: ['Laika mission', 'First animal in orbit'] },
  { canonicalName: 'Vostok 1', entityType: 'space_mission', aliases: ['First human spaceflight', 'Gagarin flight'] },
  { canonicalName: 'Vostok 6', entityType: 'space_mission', aliases: ['First woman in space', 'Valentina Tereshkova'] },
  { canonicalName: 'Voskhod 1', entityType: 'space_mission', aliases: ['First multi-crew', 'Voskhod'] },
  { canonicalName: 'Voskhod 2', entityType: 'space_mission', aliases: ['First EVA', 'Alexei Leonov spacewalk'] },
  { canonicalName: 'Soyuz 1', entityType: 'space_mission', aliases: ['Komarov mission'] },
  { canonicalName: 'Soyuz 11', entityType: 'space_mission', aliases: ['First space station crew', 'Salyut 1 crew'] },
  { canonicalName: 'Salyut Program', entityType: 'space_mission', aliases: ['Salyut', 'Soviet space stations'] },
  { canonicalName: 'Mir', entityType: 'space_mission', aliases: ['Mir station', 'Mir space station'] },
  { canonicalName: 'Luna 2', entityType: 'space_mission', aliases: ['First Moon impact', 'Lunik 2'] },
  { canonicalName: 'Luna 3', entityType: 'space_mission', aliases: ['First far side photos', 'Lunik 3'] },
  { canonicalName: 'Luna 9', entityType: 'space_mission', aliases: ['First soft Moon landing'] },
  { canonicalName: 'Luna 16', entityType: 'space_mission', aliases: ['First robotic sample return'] },
  { canonicalName: 'Venera 7', entityType: 'space_mission', aliases: ['First Venus landing'] },
  { canonicalName: 'Mars 3', entityType: 'space_mission', aliases: ['First Mars soft landing'] },

  // NASA Robotic Missions - Mars
  { canonicalName: 'Mariner 4', entityType: 'space_mission', aliases: ['First Mars flyby'] },
  { canonicalName: 'Viking 1', entityType: 'space_mission', aliases: ['First US Mars landing'] },
  { canonicalName: 'Viking 2', entityType: 'space_mission', aliases: ['Viking Lander 2'] },
  { canonicalName: 'Mars Pathfinder', entityType: 'space_mission', aliases: ['Pathfinder', 'Sojourner'] },
  { canonicalName: 'Mars Global Surveyor', entityType: 'space_mission', aliases: ['MGS'] },
  { canonicalName: 'Mars Odyssey', entityType: 'space_mission', aliases: ['2001 Mars Odyssey'] },
  { canonicalName: 'Spirit', entityType: 'space_mission', aliases: ['MER-A', 'Mars Exploration Rover A'] },
  { canonicalName: 'Opportunity', entityType: 'space_mission', aliases: ['MER-B', 'Mars Exploration Rover B', 'Oppy'] },
  { canonicalName: 'Mars Reconnaissance Orbiter', entityType: 'space_mission', aliases: ['MRO'] },
  { canonicalName: 'Phoenix', entityType: 'space_mission', aliases: ['Phoenix Mars Lander'] },
  { canonicalName: 'Curiosity', entityType: 'space_mission', aliases: ['MSL', 'Mars Science Laboratory'] },
  { canonicalName: 'InSight', entityType: 'space_mission', aliases: ['Interior Exploration using Seismic Investigations'] },
  { canonicalName: 'Perseverance', entityType: 'space_mission', aliases: ['Mars 2020', 'Percy'] },
  { canonicalName: 'Ingenuity', entityType: 'space_mission', aliases: ['Mars Helicopter', 'Ginny'] },

  // NASA Robotic Missions - Outer Planets
  { canonicalName: 'Pioneer 10', entityType: 'space_mission', aliases: ['First Jupiter flyby'] },
  { canonicalName: 'Pioneer 11', entityType: 'space_mission', aliases: ['First Saturn flyby'] },
  { canonicalName: 'Voyager 1', entityType: 'space_mission', aliases: ['Farthest human-made object'] },
  { canonicalName: 'Voyager 2', entityType: 'space_mission', aliases: ['Grand Tour', 'Only Uranus/Neptune flyby'] },
  { canonicalName: 'Galileo', entityType: 'space_mission', aliases: ['Galileo spacecraft', 'Jupiter orbiter'] },
  { canonicalName: 'Cassini-Huygens', entityType: 'space_mission', aliases: ['Cassini', 'Saturn orbiter'] },
  { canonicalName: 'Huygens', entityType: 'space_mission', aliases: ['Titan lander', 'Huygens probe'] },
  { canonicalName: 'Juno', entityType: 'space_mission', aliases: ['Jupiter Polar Orbiter'] },
  { canonicalName: 'New Horizons', entityType: 'space_mission', aliases: ['Pluto flyby', 'Kuiper Belt mission'] },
  { canonicalName: 'Europa Clipper', entityType: 'space_mission', aliases: ['Europa mission'] },

  // NASA Space Telescopes
  { canonicalName: 'Hubble Space Telescope', entityType: 'space_mission', aliases: ['Hubble', 'HST'] },
  { canonicalName: 'Chandra X-ray Observatory', entityType: 'space_mission', aliases: ['Chandra', 'CXO'] },
  { canonicalName: 'Spitzer Space Telescope', entityType: 'space_mission', aliases: ['Spitzer', 'SIRTF'] },
  { canonicalName: 'James Webb Space Telescope', entityType: 'space_mission', aliases: ['JWST', 'Webb', 'James Webb'] },
  { canonicalName: 'Kepler', entityType: 'space_mission', aliases: ['Kepler Space Telescope', 'K2'] },
  { canonicalName: 'TESS', entityType: 'space_mission', aliases: ['Transiting Exoplanet Survey Satellite'] },
  { canonicalName: 'Nancy Grace Roman Space Telescope', entityType: 'space_mission', aliases: ['Roman', 'WFIRST'] },

  // Other NASA Missions
  { canonicalName: 'OSIRIS-REx', entityType: 'space_mission', aliases: ['Bennu sample return'] },
  { canonicalName: 'Parker Solar Probe', entityType: 'space_mission', aliases: ['Solar Probe Plus', 'PSP'] },
  { canonicalName: 'DART', entityType: 'space_mission', aliases: ['Double Asteroid Redirection Test', 'Dimorphos impact'] },
  { canonicalName: 'Lucy', entityType: 'space_mission', aliases: ['Trojan asteroids mission'] },
  { canonicalName: 'Psyche', entityType: 'space_mission', aliases: ['16 Psyche mission'] },

  // ESA Missions
  { canonicalName: 'Giotto', entityType: 'space_mission', aliases: ['Halley flyby', 'ESA Giotto'] },
  { canonicalName: 'Rosetta', entityType: 'space_mission', aliases: ['Comet mission', '67P mission'] },
  { canonicalName: 'Philae', entityType: 'space_mission', aliases: ['Comet lander', 'Rosetta lander'] },
  { canonicalName: 'Mars Express', entityType: 'space_mission', aliases: ['ESA Mars Express'] },
  { canonicalName: 'Venus Express', entityType: 'space_mission', aliases: ['ESA Venus Express'] },
  { canonicalName: 'Gaia', entityType: 'space_mission', aliases: ['ESA Gaia', 'Star mapper'] },
  { canonicalName: 'BepiColombo', entityType: 'space_mission', aliases: ['Mercury mission', 'ESA/JAXA Mercury'] },
  { canonicalName: 'JUICE', entityType: 'space_mission', aliases: ['Jupiter Icy Moons Explorer'] },
  { canonicalName: 'Euclid', entityType: 'space_mission', aliases: ['ESA Euclid', 'Dark energy mission'] },
  { canonicalName: 'Hera', entityType: 'space_mission', aliases: ['DART follow-up', 'ESA Hera'] },

  // JAXA Missions
  { canonicalName: 'Hayabusa', entityType: 'space_mission', aliases: ['MUSES-C', 'Itokawa sample return'] },
  { canonicalName: 'Hayabusa2', entityType: 'space_mission', aliases: ['Ryugu sample return'] },
  { canonicalName: 'Akatsuki', entityType: 'space_mission', aliases: ['Venus Climate Orbiter', 'Planet-C'] },
  { canonicalName: 'SLIM', entityType: 'space_mission', aliases: ['Smart Lander for Investigating Moon'] },
  { canonicalName: 'MMX', entityType: 'space_mission', aliases: ['Martian Moons eXploration', 'Phobos sample return'] },

  // ISRO Missions
  { canonicalName: 'Chandrayaan-1', entityType: 'space_mission', aliases: ['Chandrayaan 1', 'First Indian Moon mission'] },
  { canonicalName: 'Chandrayaan-2', entityType: 'space_mission', aliases: ['Chandrayaan 2', 'Vikram lander'] },
  { canonicalName: 'Chandrayaan-3', entityType: 'space_mission', aliases: ['Chandrayaan 3', 'First Indian Moon landing'] },
  { canonicalName: 'Mangalyaan', entityType: 'space_mission', aliases: ['Mars Orbiter Mission', 'MOM', 'First Indian Mars mission'] },
  { canonicalName: 'Aditya-L1', entityType: 'space_mission', aliases: ['Aditya L1', 'Indian solar mission'] },
  { canonicalName: 'Gaganyaan', entityType: 'space_mission', aliases: ['Indian human spaceflight', 'ISRO crewed'] },

  // CNSA Missions
  { canonicalName: 'Chang\'e 1', entityType: 'space_mission', aliases: ['Chang\'e-1', 'First Chinese lunar orbiter'] },
  { canonicalName: 'Chang\'e 3', entityType: 'space_mission', aliases: ['Chang\'e-3', 'Yutu rover', 'First Chinese Moon landing'] },
  { canonicalName: 'Chang\'e 4', entityType: 'space_mission', aliases: ['Chang\'e-4', 'Yutu-2', 'First far side landing'] },
  { canonicalName: 'Chang\'e 5', entityType: 'space_mission', aliases: ['Chang\'e-5', 'Chinese sample return'] },
  { canonicalName: 'Chang\'e 6', entityType: 'space_mission', aliases: ['Chang\'e-6', 'Far side sample return'] },
  { canonicalName: 'Tianwen-1', entityType: 'space_mission', aliases: ['Tianwen 1', 'Zhurong rover', 'First Chinese Mars landing'] },
  { canonicalName: 'Tiangong', entityType: 'space_mission', aliases: ['Chinese Space Station', 'CSS', 'Tiangong station'] },
  { canonicalName: 'Shenzhou 5', entityType: 'space_mission', aliases: ['First Chinese crewed spaceflight', 'Yang Liwei'] },

  // Commercial Lunar Missions
  { canonicalName: 'Beresheet', entityType: 'space_mission', aliases: ['SpaceIL Beresheet', 'First Israeli lunar'] },
  { canonicalName: 'HAKUTO-R M1', entityType: 'space_mission', aliases: ['ispace M1', 'Hakuto-R Mission 1'] },
  { canonicalName: 'Peregrine Mission One', entityType: 'space_mission', aliases: ['Peregrine 1', 'Astrobotic Peregrine'] },
  { canonicalName: 'IM-1', entityType: 'space_mission', aliases: ['Odysseus', 'Intuitive Machines 1', 'Nova-C'] },
  { canonicalName: 'IM-2', entityType: 'space_mission', aliases: ['Intuitive Machines 2', 'PRIME-1'] },

  // Historic Firsts
  { canonicalName: 'Explorer 1', entityType: 'space_mission', aliases: ['First US satellite', 'Van Allen discovery'] },
  { canonicalName: 'Telstar 1', entityType: 'space_mission', aliases: ['Telstar', 'First active communications satellite'] },
  { canonicalName: 'Syncom 3', entityType: 'space_mission', aliases: ['First geostationary satellite'] },
  { canonicalName: 'GPS', entityType: 'space_mission', aliases: ['Global Positioning System', 'Navstar GPS'] },
  { canonicalName: 'Landsat 1', entityType: 'space_mission', aliases: ['ERTS-1', 'First Earth observation satellite'] },

  // ============================================================================
  // UPCOMING MISSIONS (2024-2030)
  // ============================================================================

  // Artemis Program - Future Missions
  { canonicalName: 'Artemis IV', entityType: 'space_mission', aliases: ['Artemis 4', 'First Gateway mission'] },
  { canonicalName: 'Artemis V', entityType: 'space_mission', aliases: ['Artemis 5', 'Blue Moon lander'] },
  { canonicalName: 'Artemis VI', entityType: 'space_mission', aliases: ['Artemis 6'] },
  { canonicalName: 'Artemis VII', entityType: 'space_mission', aliases: ['Artemis 7'] },
  { canonicalName: 'Artemis VIII', entityType: 'space_mission', aliases: ['Artemis 8'] },
  { canonicalName: 'Artemis IX', entityType: 'space_mission', aliases: ['Artemis 9'] },
  { canonicalName: 'Artemis X', entityType: 'space_mission', aliases: ['Artemis 10'] },
  { canonicalName: 'Gateway', entityType: 'space_mission', aliases: ['Lunar Gateway', 'Lunar Orbital Platform-Gateway', 'LOP-G'] },
  { canonicalName: 'PPE', entityType: 'space_mission', aliases: ['Power and Propulsion Element', 'Gateway PPE'] },
  { canonicalName: 'HALO', entityType: 'space_mission', aliases: ['Habitation and Logistics Outpost', 'Gateway HALO'] },

  // SpaceX Starship - Future Flights
  { canonicalName: 'Starship IFT-7', entityType: 'space_mission', aliases: ['Starship Flight 7', 'Integrated Flight Test 7'] },
  { canonicalName: 'Starship IFT-8', entityType: 'space_mission', aliases: ['Starship Flight 8', 'Integrated Flight Test 8'] },
  { canonicalName: 'Starship IFT-9', entityType: 'space_mission', aliases: ['Starship Flight 9', 'Integrated Flight Test 9'] },
  { canonicalName: 'Starship IFT-10', entityType: 'space_mission', aliases: ['Starship Flight 10', 'Integrated Flight Test 10'] },
  { canonicalName: 'Starship IFT-11', entityType: 'space_mission', aliases: ['Starship Flight 11', 'Integrated Flight Test 11'] },
  { canonicalName: 'Starship IFT-12', entityType: 'space_mission', aliases: ['Starship Flight 12', 'Integrated Flight Test 12'] },
  { canonicalName: 'Starship HLS Demo', entityType: 'space_mission', aliases: ['HLS uncrewed demo', 'Starship lunar demo'] },
  { canonicalName: 'Starship Propellant Transfer Demo', entityType: 'space_mission', aliases: ['Orbital refueling demo', 'Ship-to-Ship transfer test', 'Starship refueling test'] },
  { canonicalName: 'Starship Tanker Test Flight', entityType: 'space_mission', aliases: ['Tanker demo', 'First tanker flight'] },
  { canonicalName: 'Starship V3 First Flight', entityType: 'space_mission', aliases: ['Block 3 first flight', 'Raptor 3 first flight', 'B18/S39 flight'] },
  { canonicalName: 'Starship Depot Demo', entityType: 'space_mission', aliases: ['Orbital depot demo', 'Propellant depot test'] },
  { canonicalName: 'dearMoon', entityType: 'space_mission', aliases: ['Dear Moon', 'Yusaku Maezawa lunar mission'] },

  // Intuitive Machines - Future Missions
  { canonicalName: 'IM-3', entityType: 'space_mission', aliases: ['Intuitive Machines 3', 'Nova-C IM-3'] },
  { canonicalName: 'IM-4', entityType: 'space_mission', aliases: ['Intuitive Machines 4'] },
  { canonicalName: 'IM-5', entityType: 'space_mission', aliases: ['Intuitive Machines 5'] },

  // Astrobotic - Future Missions
  { canonicalName: 'Griffin Mission One', entityType: 'space_mission', aliases: ['Griffin 1', 'VIPER delivery'] },
  { canonicalName: 'Griffin Mission Two', entityType: 'space_mission', aliases: ['Griffin 2'] },

  // NASA CLPS & Lunar Missions
  { canonicalName: 'VIPER', entityType: 'space_mission', aliases: ['Volatiles Investigating Polar Exploration Rover', 'Lunar VIPER'] },
  { canonicalName: 'PRIME-1', entityType: 'space_mission', aliases: ['Polar Resources Ice Mining Experiment'] },
  { canonicalName: 'Lunar Trailblazer', entityType: 'space_mission', aliases: ['Trailblazer'] },
  { canonicalName: 'LunaH-Map', entityType: 'space_mission', aliases: ['Lunar Polar Hydrogen Mapper'] },
  { canonicalName: 'Lunar Flashlight', entityType: 'space_mission', aliases: ['NASA Lunar Flashlight'] },
  { canonicalName: 'CAPSTONE', entityType: 'space_mission', aliases: ['Cislunar Autonomous Positioning System'] },

  // Chinese Lunar Program - Future
  { canonicalName: 'Chang\'e 7', entityType: 'space_mission', aliases: ['Chang\'e-7', 'South pole exploration'] },
  { canonicalName: 'Chang\'e 8', entityType: 'space_mission', aliases: ['Chang\'e-8', 'ISRU demonstration'] },
  { canonicalName: 'ILRS', entityType: 'space_mission', aliases: ['International Lunar Research Station', 'China-Russia lunar base'] },
  { canonicalName: 'Tianwen-2', entityType: 'space_mission', aliases: ['Tianwen 2', 'Asteroid sample return', 'Zhenghe'] },
  { canonicalName: 'Tianwen-3', entityType: 'space_mission', aliases: ['Tianwen 3', 'Mars sample return'] },
  { canonicalName: 'Tianwen-4', entityType: 'space_mission', aliases: ['Tianwen 4', 'Jupiter system'] },

  // Russian Lunar Program
  { canonicalName: 'Luna 25', entityType: 'space_mission', aliases: ['Luna-25', 'Luna-Glob'] },
  { canonicalName: 'Luna 26', entityType: 'space_mission', aliases: ['Luna-26', 'Luna-Resurs Orbiter'] },
  { canonicalName: 'Luna 27', entityType: 'space_mission', aliases: ['Luna-27', 'Luna-Resurs Lander'] },
  { canonicalName: 'Luna 28', entityType: 'space_mission', aliases: ['Luna-28', 'Luna-Grunt'] },

  // ISRO Future Missions
  { canonicalName: 'Chandrayaan-4', entityType: 'space_mission', aliases: ['Chandrayaan 4', 'Lunar sample return'] },
  { canonicalName: 'Chandrayaan-5', entityType: 'space_mission', aliases: ['Chandrayaan 5'] },
  { canonicalName: 'Shukrayaan-1', entityType: 'space_mission', aliases: ['Shukrayaan', 'Venus Orbiter Mission'] },
  { canonicalName: 'Mangalyaan-2', entityType: 'space_mission', aliases: ['Mars Orbiter Mission 2', 'MOM-2'] },
  { canonicalName: 'LUPEX', entityType: 'space_mission', aliases: ['Lunar Polar Exploration', 'ISRO-JAXA lunar'] },

  // JAXA Future Missions
  { canonicalName: 'HAKUTO-R M2', entityType: 'space_mission', aliases: ['ispace M2', 'Hakuto-R Mission 2'] },
  { canonicalName: 'HAKUTO-R M3', entityType: 'space_mission', aliases: ['ispace M3', 'Hakuto-R Mission 3'] },
  { canonicalName: 'DESTINY+', entityType: 'space_mission', aliases: ['Demonstration and Experiment of Space Technology for INterplanetary voYage'] },
  { canonicalName: 'OKEANOS', entityType: 'space_mission', aliases: ['Outsized Kite-craft for Exploration and Astronautics in the Outer Solar System'] },

  // ESA Future Missions
  { canonicalName: 'Argonaut', entityType: 'space_mission', aliases: ['European Large Logistics Lander', 'EL3'] },
  { canonicalName: 'PLATO', entityType: 'space_mission', aliases: ['PLAnetary Transits and Oscillations of stars'] },
  { canonicalName: 'ARIEL', entityType: 'space_mission', aliases: ['Atmospheric Remote-sensing Infrared Exoplanet Large-survey'] },
  { canonicalName: 'EnVision', entityType: 'space_mission', aliases: ['Venus radar mapper', 'ESA EnVision'] },
  { canonicalName: 'Comet Interceptor', entityType: 'space_mission', aliases: ['ESA Comet Interceptor'] },
  { canonicalName: 'LISA', entityType: 'space_mission', aliases: ['Laser Interferometer Space Antenna', 'Gravitational wave detector'] },
  { canonicalName: 'Athena', entityType: 'space_mission', aliases: ['Advanced Telescope for High Energy Astrophysics'] },

  // NASA Deep Space - Future
  { canonicalName: 'Dragonfly', entityType: 'space_mission', aliases: ['Titan rotorcraft', 'Titan Dragonfly'] },
  { canonicalName: 'Mars Sample Return', entityType: 'space_mission', aliases: ['MSR', 'Perseverance sample return'] },
  { canonicalName: 'Mars Ascent Vehicle', entityType: 'space_mission', aliases: ['MAV', 'MSR MAV'] },
  { canonicalName: 'Earth Return Orbiter', entityType: 'space_mission', aliases: ['ERO', 'MSR ERO'] },
  { canonicalName: 'Sample Retrieval Lander', entityType: 'space_mission', aliases: ['SRL', 'MSR lander'] },
  { canonicalName: 'NEO Surveyor', entityType: 'space_mission', aliases: ['Near-Earth Object Surveyor', 'NEOSM'] },
  { canonicalName: 'Uranus Orbiter and Probe', entityType: 'space_mission', aliases: ['Uranus Flagship', 'UOP'] },
  { canonicalName: 'Enceladus Orbilander', entityType: 'space_mission', aliases: ['Enceladus mission'] },
  { canonicalName: 'Titan Saturn System Mission', entityType: 'space_mission', aliases: ['TSSM'] },
  { canonicalName: 'Venus Flagship', entityType: 'space_mission', aliases: ['Venus Flagship Mission'] },
  { canonicalName: 'VERITAS', entityType: 'space_mission', aliases: ['Venus Emissivity, Radio Science, InSAR, Topography, and Spectroscopy'] },
  { canonicalName: 'DAVINCI', entityType: 'space_mission', aliases: ['Deep Atmosphere Venus Investigation of Noble gases, Chemistry, and Imaging'] },
  { canonicalName: 'Interstellar Probe', entityType: 'space_mission', aliases: ['ISP', 'Interstellar mission'] },
  { canonicalName: 'Solar Cruiser', entityType: 'space_mission', aliases: ['NASA Solar Cruiser', 'Solar sail mission'] },
  { canonicalName: 'SPHEREx', entityType: 'space_mission', aliases: ['Spectro-Photometer for the History of the Universe'] },
  { canonicalName: 'IMAP', entityType: 'space_mission', aliases: ['Interstellar Mapping and Acceleration Probe'] },

  // Blue Origin - Future
  { canonicalName: 'Blue Moon Mark 1', entityType: 'space_mission', aliases: ['Blue Moon Mk1', 'Artemis V lander'] },
  { canonicalName: 'Blue Moon Mark 2', entityType: 'space_mission', aliases: ['Blue Moon Mk2', 'Blue Origin lunar lander'] },
  { canonicalName: 'Orbital Reef', entityType: 'space_mission', aliases: ['Blue Origin space station', 'Commercial space station'] },

  // Commercial Space Stations
  { canonicalName: 'Axiom Station', entityType: 'space_mission', aliases: ['Axiom Space Station', 'Axiom Segment'] },
  { canonicalName: 'Starlab', entityType: 'space_mission', aliases: ['Voyager Starlab', 'Nanoracks Starlab'] },
  { canonicalName: 'Haven-1', entityType: 'space_mission', aliases: ['Vast Haven-1', 'Vast Space Station'] },
  { canonicalName: 'Haven-2', entityType: 'space_mission', aliases: ['Vast Haven-2'] },

  // Axiom Missions
  { canonicalName: 'Axiom-1', entityType: 'space_mission', aliases: ['Ax-1', 'First Axiom mission'] },
  { canonicalName: 'Axiom-2', entityType: 'space_mission', aliases: ['Ax-2'] },
  { canonicalName: 'Axiom-3', entityType: 'space_mission', aliases: ['Ax-3'] },
  { canonicalName: 'Axiom-4', entityType: 'space_mission', aliases: ['Ax-4'] },

  // Firefly Aerospace
  { canonicalName: 'Blue Ghost M1', entityType: 'space_mission', aliases: ['Blue Ghost Mission 1', 'Firefly lunar'] },
  { canonicalName: 'Blue Ghost M2', entityType: 'space_mission', aliases: ['Blue Ghost Mission 2'] },

  // Rocket Lab
  { canonicalName: 'ESCAPADE', entityType: 'space_mission', aliases: ['Escape and Plasma Acceleration and Dynamics Explorers', 'Mars smallsats'] },

  // Other Commercial Lunar
  { canonicalName: 'Beresheet 2', entityType: 'space_mission', aliases: ['SpaceIL Beresheet 2', 'Israeli lunar 2'] },
  { canonicalName: 'Lunar Outpost', entityType: 'space_mission', aliases: ['MAPP rover', 'Mobile Autonomous Prospecting Platform'] },
  { canonicalName: 'XL-1', entityType: 'space_mission', aliases: ['Masten XL-1', 'Masten lunar lander'] },

  // South Korean Missions
  { canonicalName: 'KPLO', entityType: 'space_mission', aliases: ['Korea Pathfinder Lunar Orbiter', 'Danuri'] },
  { canonicalName: 'KLEP', entityType: 'space_mission', aliases: ['Korea Lunar Exploration Program Phase 2', 'Korean lunar lander'] },

  // UAE Missions
  { canonicalName: 'Rashid 2', entityType: 'space_mission', aliases: ['Rashid rover 2', 'Emirates lunar rover 2'] },
  { canonicalName: 'Emirates Mars Mission 2', entityType: 'space_mission', aliases: ['EMM2', 'Hope 2'] },
  { canonicalName: 'MBR Explorer', entityType: 'space_mission', aliases: ['Emirates asteroid mission', 'UAE asteroid belt'] },

  // Other International
  { canonicalName: 'Colmena', entityType: 'space_mission', aliases: ['UNAM Colmena', 'Mexican lunar robots'] },
  { canonicalName: 'SLIM-2', entityType: 'space_mission', aliases: ['JAXA SLIM 2', 'Smart Lander 2'] },
  { canonicalName: 'Lunar Cruiser', entityType: 'space_mission', aliases: ['Toyota Lunar Cruiser', 'JAXA pressurized rover'] },

  // SpaceX Crew & Cargo - Ongoing
  { canonicalName: 'Crew-9', entityType: 'space_mission', aliases: ['SpaceX Crew-9'] },
  { canonicalName: 'Crew-10', entityType: 'space_mission', aliases: ['SpaceX Crew-10'] },
  { canonicalName: 'Crew-11', entityType: 'space_mission', aliases: ['SpaceX Crew-11'] },
  { canonicalName: 'Crew-12', entityType: 'space_mission', aliases: ['SpaceX Crew-12'] },
  { canonicalName: 'CRS-30', entityType: 'space_mission', aliases: ['SpaceX CRS-30', 'SpX-30'] },
  { canonicalName: 'CRS-31', entityType: 'space_mission', aliases: ['SpaceX CRS-31', 'SpX-31'] },
  { canonicalName: 'CRS-32', entityType: 'space_mission', aliases: ['SpaceX CRS-32', 'SpX-32'] },

  // Boeing Starliner
  { canonicalName: 'Starliner-1', entityType: 'space_mission', aliases: ['CFT-1', 'First operational Starliner'] },
  { canonicalName: 'Starliner-2', entityType: 'space_mission', aliases: ['CFT-2'] },
  { canonicalName: 'Starliner-3', entityType: 'space_mission', aliases: ['CFT-3'] },

  // Sierra Space Dream Chaser
  { canonicalName: 'Dream Chaser Tenacity', entityType: 'space_mission', aliases: ['SNC-1', 'First Dream Chaser'] },
  { canonicalName: 'SNC-2', entityType: 'space_mission', aliases: ['Dream Chaser 2'] },
];

// Combined export
export const ALL_ENTITY_SEEDS: EntitySeed[] = [...ENGINE_SEEDS, ...LAUNCH_VEHICLE_SEEDS, ...LAUNCH_SITE_SEEDS, ...MISSION_SEEDS];

// Summary stats
export const SEED_STATS = {
  engines: ENGINE_SEEDS.length,
  launchVehicles: LAUNCH_VEHICLE_SEEDS.length,
  launchSites: LAUNCH_SITE_SEEDS.length,
  missions: MISSION_SEEDS.length,
  total: ALL_ENTITY_SEEDS.length,
};
