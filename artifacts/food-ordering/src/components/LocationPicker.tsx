import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const ACCRA_BOUNDS = [[-0.35, 5.45], [0.15, 5.85]];

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

export const LocationPicker = ({ label, value, onChange, placeholder }: LocationPickerProps) => {
  const [input, setInput] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const geocode = async (query: string): Promise<Location[]> => {
    if (!query.trim() || !MAPBOX_TOKEN) return [];
    
    try {
      const q = encodeURIComponent(query + ", Ghana");
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&country=GH&limit=5&bbox=${ACCRA_BOUNDS[0][0]},${ACCRA_BOUNDS[0][1]},${ACCRA_BOUNDS[1][0]},${ACCRA_BOUNDS[1][1]}`
      );
      const json = await res.json();
      return (json.features || []).map((f: any) => ({
        name: f.place_name,
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }));
    } catch (e) {
      console.error("Geocoding error:", e);
      return [];
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setShowDropdown(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await geocode(val);
      setSuggestions(results);
      setLoading(false);
    }, 300);
  };

  const handleSelect = (location: Location) => {
    setInput(location.name);
    onChange(location);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={input}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder || "Search location…"}
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          {suggestions.map((loc, i) => (
            <button
              key={i}
              onClick={() => handleSelect(loc)}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted flex items-start gap-2 border-b border-border last:border-b-0"
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
