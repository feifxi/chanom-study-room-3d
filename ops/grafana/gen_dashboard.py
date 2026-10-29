#!/usr/bin/env python3
"""Builds dashboards/service-overview.json. Edit the panels here, then: python3 ops/grafana/gen_dashboard.py"""
import json
from pathlib import Path

PROM = {"type": "prometheus", "uid": "prometheus"}
LOKI = {"type": "loki", "uid": "loki"}
API = 'route!~"/metrics|/health"'
panels, y = [], 0
pid = 0


def nid():
    global pid
    pid += 1
    return pid


def row(title):
    global y
    panels.append({"type": "row", "title": title, "id": nid(), "collapsed": False, "gridPos": {"h": 1, "w": 24, "x": 0, "y": y}})
    y += 1


def stat(title, expr, x, w, unit="percentunit", decimals=2, thresholds=None, desc=""):
    panels.append({
        "type": "stat", "title": title, "id": nid(), "description": desc, "datasource": PROM,
        "gridPos": {"h": 5, "w": w, "x": x, "y": y},
        "targets": [{"refId": "A", "expr": expr, "datasource": PROM}],
        "options": {"reduceOptions": {"calcs": ["lastNotNull"]}, "colorMode": "background", "graphMode": "none", "textMode": "value"},
        "fieldConfig": {"defaults": {"unit": unit, "decimals": decimals, "noValue": "no traffic",
                                     "thresholds": {"mode": "absolute", "steps": thresholds or [{"color": "green", "value": None}]}}, "overrides": []},
    })


def ts(title, targets, x, w, h=8, unit="short", desc="", stack=False):
    panels.append({
        "type": "timeseries", "title": title, "id": nid(), "description": desc, "datasource": PROM,
        "gridPos": {"h": h, "w": w, "x": x, "y": y},
        "targets": [{"refId": chr(65 + i), "expr": e, "legendFormat": l, "datasource": PROM} for i, (e, l) in enumerate(targets)],
        "options": {"legend": {"displayMode": "list", "placement": "bottom"}, "tooltip": {"mode": "multi"}},
        "fieldConfig": {"defaults": {"unit": unit, "custom": {"lineWidth": 2, "fillOpacity": 10, "stacking": {"mode": "normal" if stack else "none"}}}, "overrides": []},
    })


def budget_left(slo, objective):
    # Share of the 30-day error budget still unspent (local data is short, so this uses the longest window we keep: 3d)
    return f"1 - (slo:{slo}:error_ratio_rate3d / (1 - {objective}))"


RED_GREEN = [{"color": "red", "value": None}, {"color": "orange", "value": 0.25}, {"color": "green", "value": 0.5}]

row("SLOs: is it good enough for people right now?")
stat("API availability (1h)", "1 - slo:api_availability:error_ratio_rate1h", 0, 4,
     thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 0.995}], desc="Target 99.5% non-5xx")
stat("Budget left: availability", budget_left("api_availability", 0.995), 4, 4, unit="percentunit", decimals=0, thresholds=RED_GREEN,
     desc="Error budget left over the last 3 days (a real SLO uses 30 days)")
stat("API latency < 300 ms (1h)", "1 - slo:api_latency:error_ratio_rate1h", 8, 4,
     thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 0.99}], desc="Target 99% under 300 ms")
stat("Budget left: latency", budget_left("api_latency", 0.99), 12, 4, decimals=0, thresholds=RED_GREEN)
stat("Sessions not lost (1h)", "1 - slo:session_stability:error_ratio_rate1h", 16, 4,
     thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 0.99}], desc="Target 99% of sessions don't end with a lost connection")
stat("Burn rate: availability (1h)", "slo:api_availability:error_ratio_rate1h / (1 - 0.995)", 20, 4, unit="none", decimals=1,
     thresholds=[{"color": "green", "value": None}, {"color": "orange", "value": 1}, {"color": "red", "value": 6}],
     desc="1 = spending the budget exactly on schedule; 14.4 over 1h pages")
y += 5

row("API traffic (RED)")
ts("Requests / s by route", [(f"sum by (route) (rate(study_http_requests_total{{{API}}}[$__rate_interval]))", "{{route}}")], 0, 8, unit="reqps", stack=True)
ts("Errors (5xx share)", [(f'sum(rate(study_http_requests_total{{{API},code=~"5.."}}[$__rate_interval])) / sum(rate(study_http_requests_total{{{API}}}[$__rate_interval]))', "5xx share")],
   8, 8, unit="percentunit")
ts("Latency", [(f"histogram_quantile({q}, sum by (le) (rate(study_http_request_duration_seconds_bucket{{{API}}}[$__rate_interval])))", f"p{int(q*100)}") for q in (0.5, 0.95, 0.99)],
   16, 8, unit="s")
y += 8

row("Rooms and sessions")
ts("People and rooms", [("study_players", "people online"), ("study_rooms", "rooms open")], 0, 8)
ts("Joins and disconnects / min", [("sum(rate(study_joins_total[$__rate_interval])) * 60", "joins"),
                                     ("sum by (kind) (rate(study_disconnects_total[$__rate_interval])) * 60", "{{kind}}")], 8, 8,
   desc="dropped = connection lost; reconnected = came back within 20 s; timed_out = never came back (burns the session SLO)")
ts("NPC tick time", [(f"histogram_quantile({q}, sum by (le) (rate(study_npc_tick_seconds_bucket[$__rate_interval])))", f"p{int(q*100)}") for q in (0.5, 0.99)],
   16, 8, unit="s", desc="One 10 Hz simulation step; the budget is 100 ms")
y += 8

row("Process")
ts("Event loop lag", [("study_game_nodejs_eventloop_lag_p99_seconds", "p99"), ("study_game_nodejs_eventloop_lag_p50_seconds", "p50")], 0, 8, unit="s",
   desc="Above ~100 ms players feel rubber-banding")
ts("Memory", [("study_game_process_resident_memory_bytes", "RSS"), ("study_game_nodejs_heap_size_used_bytes", "heap used")], 8, 8, unit="bytes")
ts("CPU", [("rate(study_game_process_cpu_seconds_total[$__rate_interval])", "cores")], 16, 8, unit="percentunit")
y += 8

row("Logs")
panels.append({
    "type": "logs", "title": "Game server warnings and errors", "id": nid(), "datasource": LOKI,
    "gridPos": {"h": 10, "w": 24, "x": 0, "y": y},
    "targets": [{"refId": "A", "expr": '{service="game", level=~"warn|error|fatal"}', "datasource": LOKI}],
    "options": {"showTime": True, "wrapLogMessage": True, "sortOrder": "Descending", "enableLogDetails": True},
})
y += 10

dashboard = {
    "uid": "chanom-service",
    "title": "Chanom Study Room · Service overview",
    "tags": ["chanom", "slo"],
    "timezone": "browser",
    "refresh": "10s",
    "time": {"from": "now-1h", "to": "now"},
    "schemaVersion": 39,
    "editable": True,
    "panels": panels,
}
Path(__file__).with_name("dashboards").joinpath("service-overview.json").write_text(json.dumps(dashboard, indent=2) + "\n")
print(f"wrote dashboards/service-overview.json ({len(panels)} panels)")
