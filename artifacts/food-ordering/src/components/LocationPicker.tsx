import { useState } from "react";
import { MapPin } from "lucide-react";

interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  label: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  placeholder?: string;
}

// Default Accra coordinates for fallback
const DEFAULT_ACCRA_LAT = 5.6037;
const DEFAULT_ACCRA_LNG = -0.1870;

// Common Accra locations with coordinates
const COMMON_LOCATIONS: Record<string, Location> = {
  "accra mall": { name: "Accra Mall, Accra", lat: 5.6247, lng: -0.1871 },
  "east legon": { name: "East Legon, Accra", lat: 5.6450, lng: -0.1450 },
  "osu": { name: "Osu, Accra", lat: 5.5850, lng: -0.1650 },
  "labone": { name: "Labone, Accra", lat: 5.5750, lng: -0.1750 },
  "airport": { name: "Kotoka International Airport", lat: 5.6052, lng: -0.1669 },
  "circle": { name: "Makola Circle, Accra", lat: 5.5500, lng: -0.2100 },
  "tema": { name: "Tema, Greater Accra", lat: 5.6500, lng: -0.0100 },
  "spintex": { name: "Spintex, Accra", lat: 5.6700, lng: -0.1200 },
  "cantonments": { name: "Cantonments, Accra", lat: 5.5900, lng: -0.1900 },
  "dansoman": { name: "Dansoman, Accra", lat: 5.5600, lng: -0.2500 },
};

export const LocationPicker = ({ label, value, onChange, placeholder }: LocationPickerProps) => {
  const [input, setInput] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Search common locations
    const query = val.toLowerCase();
    const filtered = Object.entries(COMMON_LOCATIONS)
      .filter(([key]) => key.includes(query))
      .map(([, loc]) => loc);

    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
  };

  const handleSelect = (location: Location) => {
    setInput(location.name);
    onChange(location);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleManualEntry = () => {
    if (input.trim()) {
      // If user types a location not in suggestions, use default Accra coordinates
      const location: Location = {
        name: input.trim(),
        lat: DEFAULT_ACCRA_LAT,
        lng: DEFAULT_ACCRA_LNG,
      };
      onChange(location);
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={input}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 100);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleManualEntry();
            }
          }}
          placeholder={placeholder || "Search location or type address…"}
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          {suggestions.map((loc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(loc)}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted flex items-start gap-2 border-b border-border last:border-b-0 transition-colors"
            >
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium truncate">{loc.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {value && (
        <button
          type="button"
          onClick={() => {
            setInput("");
            onChange(null);
            setSuggestions([]);
          }}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
};
