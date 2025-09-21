import { supabase } from "./supabase";

// Common college abbreviations mapping
const COLLEGE_ABBREVIATIONS: Record<string, string[]> = {
  // Major universities
  MIT: ["MASSACHUSETTS INSTITUTE OF TECHNOLOGY"],
  UCLA: ["UNIVERSITY OF CALIFORNIA-LOS ANGELES"],
  USC: ["UNIVERSITY OF SOUTHERN CALIFORNIA", "UNIVERSITY OF SOUTH CAROLINA"],
  UGA: ["UNIVERSITY OF GEORGIA"],
  GT: ["GEORGIA INSTITUTE OF TECHNOLOGY", "GEORGIA TECH"],
  VT: ["VIRGINIA TECH", "VIRGINIA POLYTECHNIC"],
  PSU: ["PENNSYLVANIA STATE UNIVERSITY", "PENN STATE"],
  ODU: ["OLD DOMINION UNIVERSITY", "OHIO DOMINICAN UNIVERSITY"],
  JMU: ["JAMES MADISON UNIVERSITY"],
  VCU: ["VIRGINIA COMMONWEALTH UNIVERSITY"],
  GMU: ["GEORGE MASON UNIVERSITY"],
  UVA: ["UNIVERSITY OF VIRGINIA"],
  UNC: ["UNIVERSITY OF NORTH CAROLINA"],
  NCSU: ["NORTH CAROLINA STATE UNIVERSITY"],
  FSU: ["FLORIDA STATE UNIVERSITY"],
  UF: ["UNIVERSITY OF FLORIDA"],
  UM: ["UNIVERSITY OF MIAMI", "UNIVERSITY OF MICHIGAN"],
  MSU: [
    "MICHIGAN STATE UNIVERSITY",
    "MONTANA STATE UNIVERSITY",
    "MISSISSIPPI STATE UNIVERSITY",
    "MISSOURI STATE UNIVERSITY",
  ],
  OSU: ["OHIO STATE UNIVERSITY", "OKLAHOMA STATE UNIVERSITY", "OREGON STATE UNIVERSITY"],
  ASU: ["ARIZONA STATE UNIVERSITY", "ARKANSAS STATE UNIVERSITY"],
  LSU: ["LOUISIANA STATE UNIVERSITY"],
  UT: ["UNIVERSITY OF TEXAS", "UNIVERSITY OF TENNESSEE"],
  "A&M": ["TEXAS A&M", "AGRICULTURAL AND MECHANICAL"],
  TAMU: ["TEXAS A&M UNIVERSITY"],
  UIUC: ["UNIVERSITY OF ILLINOIS URBANA-CHAMPAIGN"],
  UMICH: ["UNIVERSITY OF MICHIGAN"],
  WISC: ["UNIVERSITY OF WISCONSIN"],
  PURDUE: ["PURDUE UNIVERSITY"],
  IU: ["INDIANA UNIVERSITY"],
  ISU: ["IOWA STATE UNIVERSITY", "ILLINOIS STATE UNIVERSITY", "IDAHO STATE UNIVERSITY"],
  KU: ["UNIVERSITY OF KANSAS"],
  KSU: ["KANSAS STATE UNIVERSITY", "KENTUCKY STATE UNIVERSITY"],
  MU: ["UNIVERSITY OF MISSOURI", "MARQUETTE UNIVERSITY"],
  NU: ["NORTHWESTERN UNIVERSITY", "NEBRASKA UNIVERSITY"],
  CU: ["UNIVERSITY OF COLORADO", "CLEMSON UNIVERSITY"],
  DU: ["DUKE UNIVERSITY", "UNIVERSITY OF DENVER"],
  WU: ["WASHINGTON UNIVERSITY", "WAKE FOREST UNIVERSITY"],
  BU: ["BOSTON UNIVERSITY", "BAYLOR UNIVERSITY"],
  GU: ["GEORGETOWN UNIVERSITY", "GONZAGA UNIVERSITY"],
  SU: ["SYRACUSE UNIVERSITY", "STANFORD UNIVERSITY"],
  NYU: ["NEW YORK UNIVERSITY"],
  CUNY: ["CITY UNIVERSITY OF NEW YORK"],
  SUNY: ["STATE UNIVERSITY OF NEW YORK"],
  RIT: ["ROCHESTER INSTITUTE OF TECHNOLOGY"],
  RPI: ["RENSSELAER POLYTECHNIC INSTITUTE"],
  WPI: ["WORCESTER POLYTECHNIC INSTITUTE"],
  CMU: ["CARNEGIE MELLON UNIVERSITY"],
  JHU: ["JOHNS HOPKINS UNIVERSITY"],
  GWU: ["GEORGE WASHINGTON UNIVERSITY"],
  AU: ["AMERICAN UNIVERSITY"],
  CUA: ["CATHOLIC UNIVERSITY OF AMERICA"],
  Howard: ["HOWARD UNIVERSITY"],
  FAMU: ["FLORIDA A&M UNIVERSITY"],
  HBCU: ["HISTORICALLY BLACK"],
  CC: ["COMMUNITY COLLEGE"],
  JC: ["JUNIOR COLLEGE"],
  TC: ["TECHNICAL COLLEGE"],
  TECH: ["TECHNICAL", "TECHNOLOGY"],
};

/**
 * Generate potential abbreviations from a college name
 */
function generateAbbreviations(collegeName: string): string[] {
  const abbreviations: string[] = [];
  const name = collegeName.toUpperCase();

  // Extract initials from major words (excluding common words)
  const excludeWords = ["OF", "THE", "AND", "AT", "IN", "FOR", "A", "AN"];
  const words = name.split(/[\s-]+/).filter((word) => word.length > 0 && !excludeWords.includes(word));

  // Create initials abbreviation
  if (words.length >= 2) {
    const initials = words.map((word) => word.charAt(0)).join("");
    abbreviations.push(initials);
  }

  // Create common patterns
  if (name.includes("UNIVERSITY")) {
    const withoutUniversity = name.replace(/\s+UNIVERSITY.*$/, "");
    const universityWords = withoutUniversity
      .split(/[\s-]+/)
      .filter((word) => word.length > 0 && !excludeWords.includes(word));
    if (universityWords.length >= 1) {
      abbreviations.push(universityWords.map((word) => word.charAt(0)).join("") + "U");
    }
  }

  if (name.includes("STATE")) {
    const stateWords = name.split(/[\s-]+/).filter((word) => word.length > 0 && !excludeWords.includes(word));
    const stateIndex = stateWords.findIndex((word) => word === "STATE");
    if (stateIndex > 0) {
      abbreviations.push(
        stateWords
          .slice(0, stateIndex + 1)
          .map((word) => word.charAt(0))
          .join(""),
      );
    }
  }

  return abbreviations;
}

/**
 * Check if a query matches college abbreviations
 */
function matchesAbbreviation(query: string, collegeName: string): boolean {
  const queryUpper = query.toUpperCase().trim();
  const nameUpper = collegeName.toUpperCase();

  // Check predefined abbreviations
  if (COLLEGE_ABBREVIATIONS[queryUpper]) {
    return COLLEGE_ABBREVIATIONS[queryUpper].some((pattern) => nameUpper.includes(pattern));
  }

  // Check generated abbreviations
  const generatedAbbrevs = generateAbbreviations(collegeName);
  return generatedAbbrevs.includes(queryUpper);
}

export interface College {
  id: string;
  name: string;
  city: string;
  state: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  institution_type: "university" | "college" | "community_college" | "trade_school";
  alias?: string;
  scorecard_id?: number;
}

export interface CollegeSearchResult {
  id: string;
  name: string;
  city: string;
  state: string;
  fullName: string;
  type: "college";
  institutionType: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Search for colleges by name, location, or abbreviation
 */
export async function searchColleges(query: string, limit: number = 10): Promise<CollegeSearchResult[]> {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    const queryUpper = query.trim().toUpperCase();

    // First, try regular name/location/alias search
    const { data, error } = await supabase
      .from("colleges")
      .select("id, name, city, state, coordinates, institution_type, alias, scorecard_id")
      .or(
        `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%,alias.ilike.%${searchTerm}%`,
      )
      .order("name")
      .limit(limit * 2); // Get more results for abbreviation filtering

    if (error) {
      console.warn("Error searching colleges:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    let results = data;

    // If the query looks like an abbreviation (2-6 uppercase letters), also search by abbreviation
    if (/^[A-Z]{2,6}$/.test(queryUpper)) {
      // Filter results to include abbreviation matches
      const abbreviationMatches = data.filter((college) => matchesAbbreviation(queryUpper, college.name));

      // If we found abbreviation matches, prioritize them
      if (abbreviationMatches.length > 0) {
        // Combine abbreviation matches with regular matches, prioritizing abbreviations
        const regularMatches = data.filter((college) => !matchesAbbreviation(queryUpper, college.name));
        results = [...abbreviationMatches, ...regularMatches];
      }
    }

    // Limit results
    results = results.slice(0, limit);

    // Transform to search result format
    return results.map(
      (college): CollegeSearchResult => ({
        id: college.id,
        name: college.name,
        city: college.city,
        state: college.state,
        fullName: `${college.name} - ${college.city}, ${college.state}`,
        type: "college",
        institutionType: college.institution_type,
        coordinates: college.coordinates
          ? {
              latitude: typeof college.coordinates === 'object' && college.coordinates !== null && 'latitude' in college.coordinates
                ? (college.coordinates as any).latitude
                : typeof college.coordinates === 'object' && college.coordinates !== null && Array.isArray(college.coordinates) && college.coordinates.length >= 2
                ? college.coordinates[1]
                : 0,
              longitude: typeof college.coordinates === 'object' && college.coordinates !== null && 'longitude' in college.coordinates
                ? (college.coordinates as any).longitude
                : typeof college.coordinates === 'object' && college.coordinates !== null && Array.isArray(college.coordinates) && college.coordinates.length >= 2
                ? college.coordinates[0]
                : 0,
            }
          : undefined,
      }),
    );
  } catch (error) {
    console.warn("Error in searchColleges:", error);
    return [];
  }
}

/**
 * Get colleges by state for location-based filtering
 */
export async function getCollegesByState(state: string, limit: number = 50): Promise<College[]> {
  try {
    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .eq("state", state.toUpperCase())
      .order("name")
      .limit(limit);

    if (error) {
      console.warn("Error getting colleges by state:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn("Error in getCollegesByState:", error);
    return [];
  }
}

/**
 * Get college by ID
 */
export async function getCollegeById(id: string): Promise<College | null> {
  try {
    const { data, error } = await supabase.from("colleges").select("*").eq("id", id).single();

    if (error) {
      console.warn("Error getting college by ID:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Error in getCollegeById:", error);
    return null;
  }
}

/**
 * Get popular colleges (by institution type)
 */
export async function getPopularColleges(institutionType?: string, limit: number = 20): Promise<College[]> {
  try {
    let query = supabase.from("colleges").select("*").order("name");

    if (institutionType) {
      query = query.eq("institution_type", institutionType);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.warn("Error getting popular colleges:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn("Error in getPopularColleges:", error);
    return [];
  }
}
