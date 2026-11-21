#!/usr/bin/env python3
"""
INNOVIO VC – Robot „Fonduri europene active” (versiunea GitHub Actions)
Preia apelurile ACTIVE de pe https://oportunitati-ue.gov.ro și regenerează:
  fonduri-europene/index.html, fonduri-europene/fonduri.json,
  secțiunea <!--FONDURI-START-->…<!--FONDURI-END--> din index.html, lastmod în sitemap.xml.
Rulează zilnic, automat, prin .github/workflows/fonduri.yml (independent de Claude).

Test local:  python robot/fonduri_robot.py --seed robot/seed.json
             python robot/fonduri_robot.py --source-file pagina.html --dry-run
Variabile de mediu: SITE_EMAIL (adresa pentru „Aplică acum”).
"""
import argparse, html, json, os, re, sys, time, datetime, urllib.request, urllib.parse
from html.parser import HTMLParser
from zoneinfo import ZoneInfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TZ = ZoneInfo("Europe/Bucharest")
CFG = {
    "source_list": "https://oportunitati-ue.gov.ro/apeluri/?_sfm_status=activ&sf_paged={}",
    "max_pages": 45, "delay": 0.7, "min_items": 8, "teaser_count": 6,
    "email": os.environ.get("SITE_EMAIL", "").strip() or "__SITE_EMAIL__",
    "whatsapp": "40724393484", "site_url": "https://www.innoviovc.com",
}
UA = "Mozilla/5.0 (compatible; INNOVIOVC-FundingBot/1.0; +https://www.innoviovc.com)"

def log(m): print(f"[{datetime.datetime.now(TZ):%Y-%m-%d %H:%M:%S}] {m}", flush=True)
def clean(s): return re.sub(r"\s+", " ", html.unescape(s or "")).strip()
def h(s): return html.escape(s or "", quote=True)
def cut(s, n):
    if len(s) <= n: return s
    t = re.sub(r"\s+\S*$", "", s[:n]); return t.rstrip(" ,.;–-") + "…"

# ---------- parsare (fără dependențe externe) ----------
class ListParser(HTMLParser):
    """Extrage <div class="item"> … <h4><a href>titlu</a></h4> … <div class="item-meta"><div><p class="label">X</p><p>val</p></div>…"""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items, self.stack, self.cur = [], [], None
        self.in_h4 = self.in_a = False; self.col = None; self.p = None; self.meta_depth = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); cls = " " + (a.get("class") or "") + " "
        if tag == "div":
            self.stack.append(cls)
            if " item " in cls and self.cur is None:
                self.cur = {"title": "", "url": "", "meta": {}, "depth": len(self.stack)}
            elif self.cur is not None and "item-meta" in cls:
                self.meta_depth = len(self.stack)
            elif self.cur is not None and self.meta_depth and len(self.stack) == self.meta_depth + 1:
                self.col = {"label": "", "vals": []}
        elif self.cur is not None:
            if tag == "h4": self.in_h4 = True
            elif tag == "a" and self.in_h4 and not self.cur["url"]:
                self.in_a = True; self.cur["url"] = (a.get("href") or "").strip()
            elif tag == "p" and self.col is not None:
                self.p = {"label": "label" in cls, "text": ""}
    def handle_endtag(self, tag):
        if tag == "div" and self.stack:
            depth = len(self.stack); self.stack.pop()
            if self.col is not None and self.meta_depth and depth == self.meta_depth + 1:
                if self.col["label"]: self.cur["meta"][self.col["label"]] = " / ".join(v for v in self.col["vals"] if v)
                self.col = None
            elif self.meta_depth and depth == self.meta_depth: self.meta_depth = None
            elif self.cur is not None and depth == self.cur["depth"]:
                if self.cur["title"] and self.cur["url"]: self.items.append(self.cur)
                self.cur = None
        elif tag == "h4": self.in_h4 = False
        elif tag == "a": self.in_a = False
        elif tag == "p" and self.p is not None and self.col is not None:
            t = clean(self.p["text"])
            if self.p["label"]: self.col["label"] = t
            elif t: self.col["vals"].append(t)
            self.p = None
    def handle_data(self, d):
        if self.cur is None: return
        if self.in_a: self.cur["title"] += d
        if self.p is not None: self.p["text"] += d

def parse_list(page_html):
    p = ListParser(); p.feed(page_html); out = []
    for it in p.items:
        m = it["meta"]; url = it["url"]
        if not url.startswith("http"): url = "https://oportunitati-ue.gov.ro/" + url.lstrip("/")
        out.append({"title": clean(it["title"]), "url": url,
            "program": m.get("Program de finanţare") or m.get("Program de finanțare") or "",
            "status": m.get("Status", ""), "opened": m.get("Data deschiderii", ""), "deadline": m.get("Data limită", ""),
            "budget": m.get("Buget național") or m.get("Buget") or m.get("Buget total") or "",
            "type": m.get("Tipul de acţiune") or m.get("Tipul de acțiune") or ""})
    return out

def http_get(url):
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ro-RO,ro;q=0.9", "Accept": "text/html"})
            with urllib.request.urlopen(req, timeout=60) as r: return r.read().decode("utf-8", "replace")
        except Exception as e:
            log(f"Încercarea {i+1} eșuată pentru {url}: {e}"); time.sleep(2 * (i + 1))
    return None

LUNI = {"ianuarie":1,"februarie":2,"martie":3,"aprilie":4,"mai":5,"iunie":6,"iulie":7,"august":8,"septembrie":9,"octombrie":10,"noiembrie":11,"decembrie":12}
def ro_date(s):
    m = re.search(r"(\d{1,2})\s+([a-zăâîșşțţ]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?", (s or "").lower())
    if not m or m.group(2) not in LUNI: return None
    hh = int(m.group(4)) if m.group(4) else 23; mm = int(m.group(5)) if m.group(5) else 59
    return datetime.datetime(int(m.group(3)), LUNI[m.group(2)], int(m.group(1)), hh, mm, tzinfo=TZ).timestamp()

RULES = {
 "imm": ["imm", "innov", "întreprinder", "intreprinder", "startup", "start-up", "inova", "competitiv", "parcuri industriale", "accelerator", "scale up", "step", "antreprenor", "piaţa unică", "piața unică", "eco-tech", "investiţii interregionale", "investiții interregionale", "instrumente financiare"],
 "digital": ["digital", " tic ", "tic-", "cibernet", "inteligență artificială", "inteligenta artificiala", " ai ", "ai4", "llm", " date ", "software", "cloud", "quantum", "photon"],
 "energie": ["energ", "fotovolt", "climat", "hidrogen", "regenerabil", "mediu", "ocean", "eco", "verde", "decarbon", "tranziție justă", "tranzitie justa", "agro", "agri"],
 "sanatate": ["sănăt", "sanat", "medic", "clinic", "spital", "terapi", "îngrijire", "ingrijire", "amr", "cardiovascular", "genic"],
 "educatie": ["educa", "învăț", "invat", "școl", "scoal", "universit", "burs", "erasmus", "formare", "student", "master", "diplome", "primii"],
 "cercetare": ["cercet", "pilonul", "orizont", "horizon", "erc", "eic", "research", "demonstrarea conceptului", "proof of concept"],
 "social": ["social", "incluziune", "vârstnic", "varstnic", "dizabil", "ocupare", "cetăţeni", "cetățeni", "egalitate", "victime", "tineret"],
 "public": ["infrastruct", "transport", "frontier", "administra", "autorități", "autoritati", "poliţi", "poliți", "consular", " iti ", "municip", "vize"],
}
def categorize(c):
    t = " " + (c["title"] + " " + c["program"] + " " + c["type"]).lower().replace("o europă inovatoare", "orizont").replace("o europa inovatoare", "orizont") + " "
    cats = [k for k, words in RULES.items() if any(w in t for w in words)]
    return cats or ["altele"]
def tag_for(c):
    p = c["program"]; parts = p.split(" / ")
    if "Regional" in p: return cut(parts[-1], 34)
    if "Redresare" in p or "PNRR" in c["title"]: return "PNRR"
    if "Pilonul" in p: return "Orizont Europa"
    return cut(parts[-1] or "Apel de finanțare", 34)

def card(c, teaser=False):
    E, WA = CFG["email"], CFG["whatsapp"]
    title = cut(c["title"], 190)
    days = int((c["deadline_ts"] - time.time()) // 86400) if c["deadline_ts"] else None
    urgent = days is not None and days <= 14
    tag = ("Termen: " + ("azi" if days <= 0 else "mâine" if days == 1 else f"{days} zile")) if urgent else tag_for(c)
    msg = f"Bună ziua, domnule Ghioc,\n\nDoresc o ofertă de consultanță pentru apelul de finanțare:\n„{title}”\nLink: {c['url']}\n\n(mesaj trimis de pe innoviovc.com)"
    q = urllib.parse.quote
    mailto = f"mailto:{E}?subject={q('Cerere ofertă – ' + cut(title, 90))}&body={q(msg)}"
    wa = f"https://wa.me/{WA}?text={q(msg)}"
    dl = ""
    if c["program"]: dl += f"<dt>Program</dt><dd>{h(cut(c['program'], 90))}</dd>"
    if c["opened"]: dl += f"<dt>Deschis</dt><dd>{h(c['opened'])}</dd>"
    if c["deadline"]: dl += f"<dt>Termen</dt><dd>{h(c['deadline'])}</dd>"
    if c["budget"]: dl += f"<dt>Buget</dt><dd>{h(c['budget'])}</dd>"
    src = "Detalii oficiale" if c["domestic"] else "Portal Comisia Europeană"
    hl = "h3" if teaser else "h2"
    return (f'<article class="call" data-cat="{h(" ".join(c["cats"]))}"><span class="tag{" urgent" if urgent else ""}">{h(tag)}</span>'
            f'<{hl} style="font-size:1.02rem;line-height:1.35;margin-bottom:10px;font-weight:500"><a href="{h(c["url"])}" target="_blank" rel="noopener nofollow">{h(title)}</a></{hl}>'
            f'<dl>{dl}</dl><div class="actions"><a class="btn btn-primary btn-sm" href="{h(mailto)}" data-apply data-call="{h(title)}" data-url="{h(c["url"])}">Aplică acum</a>'
            f'<a class="btn btn-wa btn-sm" href="{h(wa)}" target="_blank" rel="noopener" aria-label="Cere ofertă pe WhatsApp pentru acest apel">WhatsApp</a>'
            f'<a class="src" href="{h(c["url"])}" target="_blank" rel="noopener nofollow">{src} ↗</a></div></article>')

def write(path, data):
    p = os.path.join(ROOT, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"; open(tmp, "w", encoding="utf-8").write(data); os.replace(tmp, p)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--seed"); ap.add_argument("--source-file"); ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.seed: items = json.load(open(a.seed, encoding="utf-8")); log(f"Mod seed: {len(items)} apeluri")
    elif a.source_file: items = parse_list(open(a.source_file, encoding="utf-8").read()); log(f"Mod fișier: {len(items)} apeluri")
    else:
        items, first = [], None
        for p in range(1, CFG["max_pages"] + 1):
            page = http_get(CFG["source_list"].format(p))
            if page is None: break
            got = parse_list(page)
            if not got: break
            if p > 1 and got[0]["url"] == first: break
            if p == 1: first = got[0]["url"]
            items += got; time.sleep(CFG["delay"])
        log(f"Preluate de pe sursă: {len(items)} apeluri")

    now, seen, calls = time.time(), set(), []
    for c in items:
        k = c["url"] + "|" + c["title"]
        if k in seen: continue
        seen.add(k)
        if c.get("status") and "activ" not in c["status"].lower(): continue
        dl = ro_date(c["deadline"]) if c.get("deadline") else None
        if dl is not None and dl < now: continue
        c["deadline_ts"] = dl; c["opened_ts"] = ro_date(c["opened"]) if c.get("opened") else None
        c["cats"] = categorize(c); c["domestic"] = "oportunitati-ue.gov.ro" in c["url"]
        calls.append(c)
    if len(calls) < CFG["min_items"]:
        log(f"Prea puține apeluri valide ({len(calls)}) – păstrez pagina existentă."); return 0

    luni = ["", "ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"]
    d = datetime.datetime.now(TZ); updated = f"{d.day} {luni[d.month]} {d.year}, ora {d:%H:%M}"; iso = d.isoformat(timespec="seconds")
    S = CFG["site_url"]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": S + "/fonduri-europene/#page", "url": S + "/fonduri-europene/", "name": "Fonduri europene active acum – apeluri de finanțare deschise",
         "inLanguage": "ro-RO", "dateModified": iso, "isPartOf": {"@id": S + "/#website"}, "publisher": {"@id": S + "/#org"},
         "mainEntity": {"@type": "ItemList", "numberOfItems": len(calls),
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": cut(c["title"], 150), "url": c["url"]} for i, c in enumerate(calls[:100])]}},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Acasă", "item": S + "/"},
            {"@type": "ListItem", "position": 2, "name": "Fonduri europene active", "item": S + "/fonduri-europene/"}]}]}
    tpl = open(os.path.join(ROOT, "robot", "template-fonduri.html"), encoding="utf-8").read()
    page = (tpl.replace("{{COUNT}}", str(len(calls))).replace("{{UPDATED}}", h(updated)).replace("{{UPDATED_ISO}}", iso)
               .replace("{{JSONLD}}", '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>")
               .replace("{{CARDS}}", "\n".join(card(c) for c in calls)))

    def score(c): return ((3 if c["domestic"] else 0) + (2 if set(c["cats"]) & {"imm","digital","energie","sanatate","educatie"} else 0) + (1 if c["budget"] else 0), c["opened_ts"] or 0)
    top = sorted(calls, key=score, reverse=True)[:CFG["teaser_count"]]
    teaser = ('<div class="calls">' + "\n".join(card(c, True) for c in top) + "</div>"
              f'<p class="updated" style="margin-top:14px">Actualizat automat: {h(updated)} · {len(calls)} apeluri active · sursa: oportunitati-ue.gov.ro</p>')
    if a.dry_run: print(teaser[:2000]); return 0

    write("fonduri-europene/index.html", page)
    write("fonduri-europene/fonduri.json", json.dumps({"updated": iso, "count": len(calls), "calls": calls}, ensure_ascii=False, indent=1))
    idx = os.path.join(ROOT, "index.html")
    s = open(idx, encoding="utf-8").read()
    s2, n = re.subn(r"<!--FONDURI-START-->.*?<!--FONDURI-END-->", lambda m: "<!--FONDURI-START-->\n" + teaser + "\n<!--FONDURI-END-->", s, count=1, flags=re.S)
    if n: write("index.html", s2)
    sm = os.path.join(ROOT, "sitemap.xml")
    if os.path.exists(sm):
        x = open(sm, encoding="utf-8").read(); today = d.date().isoformat()
        x = re.sub(r"(<loc>[^<]*/fonduri-europene/</loc><lastmod>)[^<]*", lambda m: m.group(1) + today, x)
        x = re.sub(r"(<loc>[^<]*\.com/</loc><lastmod>)[^<]*", lambda m: m.group(1) + today, x)
        write("sitemap.xml", x)
    log(f"OK – {len(calls)} apeluri publicate; actualizat {updated}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
