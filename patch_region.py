import re

with open("apps/web/src/app/book/request/page.tsx", "r") as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    'import { fetchPublicVehicles } from "@/lib/vehicle-api";',
    'import { fetchPublicVehicles } from "@/lib/vehicle-api";\nimport { fetchActiveRegions } from "@/lib/region-api";'
)
content = content.replace(
    'import type { Vehicle, User as AuthUser } from "@smart-dispatch/types";',
    'import type { Vehicle, User as AuthUser, Region } from "@smart-dispatch/types";'
)

# 2. Add state
content = content.replace(
    '  const [pickup, setPickup] = useState("");',
    '  const [regionId, setRegionId] = useState<string>("");\n  const [regions, setRegions] = useState<Region[]>([]);\n  const [pickup, setPickup] = useState("");'
)

# 3. Add fetch logic
old_fetch = '''      try {
        const data = await fetchPublicVehicles();
        const found = data.vehicles.filter((v) => ids.includes(v.id));
        if (active) {
          setVehicles(found);
        }'''
new_fetch = '''      try {
        const [data, regionsData] = await Promise.all([
          fetchPublicVehicles(),
          fetchActiveRegions(locale)
        ]);
        const found = data.vehicles.filter((v) => ids.includes(v.id));
        if (active) {
          setVehicles(found);
          setRegions(regionsData);
        }'''
content = content.replace(old_fetch, new_fetch)

# 4. Add validation
old_val = '''    const newErrors: Record<string, string> = {};
    if (!passengerName) newErrors.passengerName = locale === "am" ? "የተሳፋሪ ስም ያስፈልጋል" : "Passenger name is required";'''
new_val = '''    const newErrors: Record<string, string> = {};
    if (!regionId) newErrors.regionId = locale === "am" ? "የአገልግሎት ክልል ያስፈልጋል" : "Service region is required";
    if (!passengerName) newErrors.passengerName = locale === "am" ? "የተሳፋሪ ስም ያስፈልጋል" : "Passenger name is required";'''
content = content.replace(old_val, new_val)

# 5. Add payload
old_payload = '''      const payload: CreateRideRequestInput = {
        request_type: requestType,
        pickup_address: pickup,'''
new_payload = '''      const payload: CreateRideRequestInput = {
        request_type: requestType,
        region_id: regionId,
        pickup_address: pickup,'''
content = content.replace(old_payload, new_payload)

# 6. Add UI field
old_ui = '''                  <div className="grid gap-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-6">

                        {/* Pickup */}'''
new_ui = '''                  <div className="grid gap-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="space-y-6">

                        {/* Region Selection */}
                        <AdminSelectField
                          id="region-selection"
                          label={locale === "am" ? "የአገልግሎት ክልል" : "Service Region"}
                          value={regionId}
                          onValueChange={setRegionId}
                          options={[
                            { label: locale === "am" ? "ክልል ይምረጡ" : "Select Region", value: "" },
                            ...regions.map(r => ({ label: r.name, value: r.id }))
                          ]}
                          disabled={isSubmitting}
                          error={errors.regionId}
                        />

                        {/* Pickup */}'''
content = content.replace(old_ui, new_ui)

with open("apps/web/src/app/book/request/page.tsx", "w") as f:
    f.write(content)
