"use client";

import { useState } from "react";
import { getCitiesForStateAction } from "@/lib/actions/locations";
import type { USState } from "@/lib/us-locations";
import type { ServiceArea } from "@/lib/db/providers";
import { inputClass, secondaryButtonClass } from "@/lib/dashboard-ui";

const CITY_LIST_LIMIT = 200;

export function ServiceAreaPicker({
  states,
  defaultValue,
}: {
  states: USState[];
  defaultValue?: ServiceArea[];
}) {
  const [areas, setAreas] = useState<ServiceArea[]>(defaultValue ?? []);
  const [pendingState, setPendingState] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [loadingCities, setLoadingCities] = useState(false);

  async function handleStateChange(code: string) {
    setPendingState(code);
    setSelectedCities(new Set());
    setCitySearch("");
    setCityOptions([]);
    if (!code) return;
    setLoadingCities(true);
    const cities = await getCitiesForStateAction(code);
    setCityOptions(cities);
    setLoadingCities(false);
  }

  function toggleCity(city: string) {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  }

  function addArea() {
    if (!pendingState || selectedCities.size === 0) return;
    const stateName = states.find((s) => s.code === pendingState)?.name ?? pendingState;
    setAreas((prev) => [...prev, { state: pendingState, stateName, cities: [...selectedCities].sort() }]);
    setPendingState("");
    setCityOptions([]);
    setSelectedCities(new Set());
    setCitySearch("");
  }

  function removeArea(state: string) {
    setAreas((prev) => prev.filter((a) => a.state !== state));
  }

  const availableStates = states.filter((s) => !areas.some((a) => a.state === s.code));
  const filteredCities = cityOptions
    .filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()))
    .slice(0, CITY_LIST_LIMIT);

  return (
    <div className="space-y-3">
      {areas.length > 0 && (
        <ul className="space-y-1.5">
          {areas.map((a) => (
            <li
              key={a.state}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-sage-tint/40 px-3 py-2"
            >
              <div>
                <div className="font-body text-sm font-medium text-ink">{a.stateName}</div>
                <div className="font-body text-xs text-slate">{a.cities.join(", ")}</div>
              </div>
              <button
                type="button"
                onClick={() => removeArea(a.state)}
                className="font-body shrink-0 text-xs text-error-text hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-md border border-dashed border-border p-3">
        <select
          value={pendingState}
          onChange={(e) => handleStateChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Add a state...</option>
          {availableStates.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>

        {pendingState && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search cities..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className={inputClass}
            />
            {loadingCities ? (
              <p className="font-body text-xs text-slate">Loading cities...</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2">
                {filteredCities.length === 0 ? (
                  <p className="font-body px-1 py-1 text-xs text-slate">No cities match.</p>
                ) : (
                  filteredCities.map((city) => (
                    <label key={city} className="font-body flex items-center gap-2 py-0.5 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={selectedCities.has(city)}
                        onChange={() => toggleCity(city)}
                        className="h-4 w-4 accent-forest"
                      />
                      {city}
                    </label>
                  ))
                )}
              </div>
            )}
            <button
              type="button"
              onClick={addArea}
              disabled={selectedCities.size === 0}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Add {selectedCities.size > 0 ? `${selectedCities.size} ` : ""}
              {selectedCities.size === 1 ? "city" : "cities"}
            </button>
          </div>
        )}
      </div>

      {areas.length === 0 && (
        <p className="font-body text-xs text-slate">No service areas added yet.</p>
      )}

      <input type="hidden" name="serviceAreas" value={JSON.stringify(areas)} />
    </div>
  );
}
