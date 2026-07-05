package dispatch

import "avex-backend/internal/shared"

// ComputeDriverFee calculates driver fee from tier × zone pricing matrix.
func ComputeDriverFee(tierID, zoneID string, distanceM float64) float64 {
	if tierID == "" || zoneID == "" {
		return 0
	}
	var base, perKm, mn, mx, freeAbove float64
	err := shared.DB.QueryRow("SELECT base_fee, per_km_fee, min_fee, max_fee, free_above FROM tier_zone_prices WHERE tier_id = ? AND zone_id = ? AND is_active = 1", tierID, zoneID).Scan(&base, &perKm, &mn, &mx, &freeAbove)
	if err != nil {
		return 0
	}
	fee := base + (distanceM/1000.0)*perKm
	if fee < mn {
		fee = mn
	}
	if mx > 0 && fee > mx {
		fee = mx
	}
	_ = freeAbove
	return fee
}
