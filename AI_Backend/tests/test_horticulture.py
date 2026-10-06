"""Fruit preferences: detected in the farmer's words, answered next to (never inside) the model's ranking."""
from AI_Backend.agents.crop_planning_growth.crop_prediction import horticulture as h

FIELD = {"ph": 7.6, "ec_ds_m": 0.6, "soil_type": "Black Cotton", "month": "September",
         "irrigation_available": True}


def test_detects_fruit_in_three_languages():
    assert h.detect_preference("I like to grow some fruites") == {"group": "fruit", "crops": []}
    assert h.detect_preference("मुझे फल उगाने हैं")["group"] == "fruit"
    assert h.detect_preference("મારે દાડમ વાવવું છે")["crops"] == ["pomegranate"]


def test_ignores_look_alike_words():
    assert h.detect_preference("should I add lime to my soil") is None
    assert h.detect_preference("ye aam samasya hai") is None
    assert h.detect_preference("a fruitful season") is None
    assert h.detect_preference("should I water today?") is None


def test_ranks_fruits_with_reasons():
    block = h.recommend(FIELD, {"group": "fruit", "crops": []}, climate={"temp_mean_c": 26.3})
    assert block["preference"] == "fruit" and len(block["options"]) == 3
    scores = [o["suitability_score"] for o in block["options"]]
    assert scores == sorted(scores, reverse=True)
    assert all(o["reasons"] or o["cautions"] for o in block["options"])
    assert "not the trained crop model" in block["method"]


def test_named_fruit_is_always_answered():
    block = h.recommend(FIELD, {"group": "fruit", "crops": ["banana"]})
    assert block["options"][0]["crop"] == "Banana"


def test_poor_fit_is_explained():
    salty = {**FIELD, "ec_ds_m": 3.0, "irrigation_available": False}
    banana = next(o for o in h.recommend(salty, {"group": "fruit", "crops": ["banana"]})["options"]
                  if o["crop"] == "Banana")
    assert banana["suitability_score"] < 70
    assert any("salinity" in c for c in banana["cautions"])
    assert any("irrigation" in c for c in banana["cautions"])
