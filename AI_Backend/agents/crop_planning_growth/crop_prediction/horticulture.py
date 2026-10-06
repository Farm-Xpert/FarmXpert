"""Fruit crops, for a farmer who asks for them.

The trained recommender ranks field crops (cotton, groundnut, wheat, ...) and
knows almost no fruit. When the farmer says they want fruit, this adds a
second, clearly labelled list next to that ranking - it never changes it.

It is a transparent agronomic guide, not a trained model: each fruit's
tolerances (pH, salinity, temperature, soil, water) are checked against the
same field reading the model used, and every point of the score comes with a
reason. Ranges follow common ICAR / NHB guidance for western and central India.

    detect_preference(text)  -> {"group": "fruit", "crops": [...]} or None
    recommend(reading, ...)  -> the `preferred` block for the agent's output
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
          "september", "october", "november", "december"]


@dataclass(frozen=True)
class Fruit:
    key: str
    name: str
    ph_opt: Tuple[float, float]
    ph_tol: Tuple[float, float]
    ec_max: float                    # dS/m before yield suffers
    temp_opt: Tuple[float, float]    # mean °C
    temp_tol: Tuple[float, float]
    soils_good: Tuple[str, ...]
    soils_poor: Tuple[str, ...]
    needs_irrigation: bool
    planting: Tuple[int, ...]        # month numbers
    first_harvest: str
    water: str                       # low | medium | high
    humid_sensitive: bool = False    # disease pressure in humid weather


FRUITS: Tuple[Fruit, ...] = (
    Fruit("banana", "Banana", (6.0, 7.5), (5.5, 8.0), 1.0, (20, 30), (15, 36),
          ("alluvial", "loam", "clay loam", "black"), ("sandy", "gravel", "saline"),
          True, (6, 7, 10, 11), "11-14 months", "high"),
    Fruit("papaya", "Papaya", (6.0, 7.0), (5.5, 7.8), 1.0, (22, 32), (15, 38),
          ("sandy loam", "loam", "red", "alluvial"), ("clay", "black", "saline"),
          True, (2, 3, 6, 7, 9, 10), "9-11 months", "medium"),
    Fruit("guava", "Guava", (5.5, 7.5), (4.5, 8.5), 2.0, (15, 32), (8, 42),
          ("alluvial", "loam", "black", "sandy loam", "red"), ("saline",),
          False, (2, 3, 6, 7, 8), "2-3 years", "low"),
    Fruit("pomegranate", "Pomegranate", (6.5, 8.0), (5.5, 8.5), 4.0, (20, 35), (10, 42),
          ("sandy loam", "loam", "black", "gravel", "red"), ("clay",),
          True, (2, 3, 6, 7), "2-3 years", "low", humid_sensitive=True),
    Fruit("mango", "Mango", (5.5, 7.5), (5.0, 8.0), 1.5, (24, 30), (10, 40),
          ("alluvial", "loam", "laterite", "red", "black"), ("saline", "clay"),
          False, (7, 8), "3-5 years (grafted)", "medium"),
    Fruit("sapota", "Sapota (chikoo)", (6.0, 8.0), (5.5, 8.5), 2.0, (20, 35), (10, 42),
          ("alluvial", "sandy loam", "loam", "black"), ("clay",),
          False, (6, 7, 8), "3 years", "medium"),
    Fruit("lemon", "Lemon / lime", (5.5, 7.5), (5.0, 8.0), 1.5, (20, 32), (10, 40),
          ("loam", "sandy loam", "alluvial", "red"), ("clay", "saline"),
          True, (6, 7, 8), "3 years", "medium"),
    Fruit("custard_apple", "Custard apple (sitafal)", (5.5, 8.0), (5.0, 8.5), 2.0, (20, 35), (10, 42),
          ("sandy loam", "gravel", "red", "loam", "black"), ("clay",),
          False, (6, 7), "3-4 years", "low"),
)
BY_KEY = {f.key: f for f in FRUITS}

# ── what the farmer asked for ───────────────────────────────────────────────
# Any word here, in English, Hindi or Gujarati (script or English letters).

_GROUP_WORDS = r"fruit|fruits|fruites|frut|orchard|horticulture|bagicha|bagayat|फल|फलों|बाग|बगीचा|बागवानी|ફળ|ફળો|બાગ|બગીચો|બાગાયત"
_NAMES: Dict[str, str] = {
    "banana": r"banana|kela|केला|केले|કેળ",
    "papaya": r"papaya|papita|पपीता|પપૈય",
    "guava": r"guava|amrud|jamfal|अमरूद|જામફળ",
    "pomegranate": r"pomegranate|anar|dadam|अनार|દાડમ",
    "mango": r"mango|aam ka|aam ki|keri|आम का|आम की|आम के|कलमी आम|કેરી|આંબ",   # bare "aam" also means "common"
    "sapota": r"sapota|chikoo|chiku|चीकू|ચીકુ",
    "lemon": r"lemon|nimbu|limbu|नींबू|નીંબુ|લીંબુ",   # not "lime": farmers add lime to soil
    "custard_apple": r"custard apple|sitafal|sitaphal|सीताफल|સીતાફળ",
}


def detect_preference(*texts: Optional[str]) -> Optional[Dict[str, Any]]:
    """The fruit wish in the farmer's words, or None when there is none."""
    text = " ".join(t for t in texts if t).lower()
    if not text:
        return None
    # English-letter words match whole words only ("fruit" not inside "fruitful")
    whole = lambda pattern: rf"(?<![a-z])(?:{pattern})(?![a-z])"
    named = [key for key, pattern in _NAMES.items() if re.search(whole(pattern), text)]
    wants_group = re.search(whole(_GROUP_WORDS), text) is not None
    if not named and not wants_group:
        return None
    return {"group": "fruit", "crops": named}


# ── scoring ─────────────────────────────────────────────────────────────────

def _band(value: Optional[float], opt: Tuple[float, float], tol: Tuple[float, float]) -> Optional[float]:
    """1 inside the optimum, falling to 0 at the tolerance edge, 0 beyond it."""
    if value is None:
        return None
    lo, hi = opt
    if lo <= value <= hi:
        return 1.0
    edge_lo, edge_hi = tol
    if value < lo:
        return max(0.0, (value - edge_lo) / (lo - edge_lo)) if lo > edge_lo else 0.0
    return max(0.0, (edge_hi - value) / (edge_hi - hi)) if edge_hi > hi else 0.0


def _soil_fit(soil_type: Optional[str], fruit: Fruit) -> Tuple[Optional[float], Optional[str]]:
    if not soil_type:
        return None, None
    soil = soil_type.lower()
    if any(p in soil for p in fruit.soils_poor):
        return 0.45, f"{soil_type} soil is not ideal for {fruit.name.lower()}"
    if any(g in soil for g in fruit.soils_good):
        return 1.0, f"{soil_type} soil suits {fruit.name.lower()}"
    return 0.75, None


def _month_number(month: Optional[str]) -> Optional[int]:
    if not month:
        return None
    m = str(month).strip().lower()
    for i, name in enumerate(MONTHS, start=1):
        if name.startswith(m[:3]):
            return i
    return None


def _score(fruit: Fruit, *, ph, ec, temp, humidity, soil_type, irrigation, month) -> Dict[str, Any]:
    reasons: List[str] = []
    cautions: List[str] = []
    parts: List[Tuple[float, float]] = []            # (weight, fit)

    ph_fit = _band(ph, fruit.ph_opt, fruit.ph_tol)
    if ph_fit is not None:
        parts.append((0.30, ph_fit))
        (reasons if ph_fit >= 0.8 else cautions).append(
            f"soil pH {ph:g} {'is within' if ph_fit >= 0.8 else 'is outside'} the {fruit.ph_opt[0]:g}-{fruit.ph_opt[1]:g} it prefers")

    if ec is not None:
        ec_fit = 1.0 if ec <= fruit.ec_max else max(0.0, 1 - (ec - fruit.ec_max) / fruit.ec_max)
        parts.append((0.20, ec_fit))
        if ec_fit < 1:
            cautions.append(f"salinity {ec:g} dS/m is above what it tolerates ({fruit.ec_max:g})")

    temp_fit = _band(temp, fruit.temp_opt, fruit.temp_tol)
    if temp_fit is not None:
        parts.append((0.20, temp_fit))
        if temp_fit >= 0.8:
            reasons.append(f"average {temp:g} °C suits it")
        else:
            cautions.append(f"average {temp:g} °C is outside its comfortable {fruit.temp_opt[0]}-{fruit.temp_opt[1]} °C")

    soil_fit, soil_note = _soil_fit(soil_type, fruit)
    if soil_fit is not None:
        parts.append((0.15, soil_fit))
        if soil_note:
            (reasons if soil_fit >= 1 else cautions).append(soil_note)

    water_fit = 1.0
    if fruit.needs_irrigation and irrigation is False:
        water_fit = 0.4
        cautions.append("needs regular irrigation, which this farm has not reported")
    if fruit.humid_sensitive and humidity is not None and humidity > 75:
        water_fit = min(water_fit, 0.7)
        cautions.append(f"humidity around {humidity:g}% raises disease risk")
    parts.append((0.15, water_fit))

    weight = sum(w for w, _ in parts) or 1.0
    score = round(100 * sum(w * f for w, f in parts) / weight, 1)

    plant_now = month in fruit.planting if month else None
    upcoming = None
    if month and not plant_now:
        upcoming = next((MONTHS[(month - 1 + k) % 12].title() for k in range(1, 13)
                         if ((month - 1 + k) % 12) + 1 in fruit.planting), None)
    return {
        "crop": fruit.name,
        "suitability_score": score,
        "planting_months": _months_text(fruit.planting),
        "plant_now": plant_now,
        "next_planting_month": upcoming,
        "first_harvest": fruit.first_harvest,
        "water_need": fruit.water,
        "reasons": reasons[:3],
        "cautions": cautions[:3],
    }


def recommend(reading: Dict[str, Any], preference: Dict[str, Any], *,
              climate: Optional[Dict[str, Any]] = None, top_n: int = 3) -> Dict[str, Any]:
    """The `preferred` block: fruits ranked for this field, named ones always kept."""
    month = _month_number(reading.get("month"))
    if month is None:
        from datetime import date
        month = date.today().month
    climate = climate or {}
    inputs = dict(
        ph=_num(reading.get("ph")),
        ec=_num(reading.get("ec_ds_m")),
        temp=_num(climate.get("temp_mean_c")),
        humidity=_num(climate.get("humidity_mean_percent")),
        soil_type=reading.get("soil_type"),
        irrigation=reading.get("irrigation_available"),
        month=month,
    )
    scored = sorted((_score(f, **inputs) for f in FRUITS), key=lambda r: -r["suitability_score"])
    named = {BY_KEY[k].name for k in preference.get("crops") or [] if k in BY_KEY}
    chosen = [r for r in scored if r["crop"] in named]
    chosen += [r for r in scored if r["crop"] not in named][:max(0, top_n - len(chosen))]
    return {
        "preference": "fruit",
        "asked_for": sorted(named) or ["fruit crops"],
        "method": "rule-based horticulture guide (soil, salinity, temperature, water); not the trained crop model",
        "options": chosen,
        "note": ("Fruit trees are a multi-year investment: confirm variety, saplings and water "
                 "with the local horticulture office before planting."),
    }


def _months_text(months: Tuple[int, ...]) -> str:
    """(2, 3, 6, 7) -> "February, March, June or July": every window, never a merged range."""
    named = [MONTHS[m - 1].title() for m in months]
    return named[0] if len(named) == 1 else ", ".join(named[:-1]) + " or " + named[-1]


def _num(value: Any) -> Optional[float]:
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def names() -> Iterable[str]:
    return (f.name for f in FRUITS)
