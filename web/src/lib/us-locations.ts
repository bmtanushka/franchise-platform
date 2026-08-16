import { State, City } from "country-state-city";

export type USState = { code: string; name: string };

export function listUSStates(): USState[] {
  return State.getStatesOfCountry("US")
    .map((s) => ({ code: s.isoCode, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listCitiesForState(stateCode: string): string[] {
  return City.getCitiesOfState("US", stateCode)
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
}
