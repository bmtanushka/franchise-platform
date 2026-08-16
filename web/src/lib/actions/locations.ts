"use server";

import { listCitiesForState } from "@/lib/us-locations";

// Cities are fetched on demand per selected state, rather than sending the
// whole US cities dataset (country-state-city ships every country) to the
// browser — only ever the small slice for one state, called directly from
// the client ServiceAreaPicker component.
export async function getCitiesForStateAction(stateCode: string): Promise<string[]> {
  if (!stateCode) return [];
  return listCitiesForState(stateCode);
}
