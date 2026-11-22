"""Teste automate pentru robotul „Fonduri europene active”.
Rulare:  python3 -m unittest robot/test_fonduri_robot.py -v   (din rădăcina repo-ului)
Testele rulează robotul pe o copie temporară a site-ului, cu date de test (fără rețea).
"""
import datetime, json, os, shutil, subprocess, sys, tempfile, unittest, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
spec = importlib.util.spec_from_file_location("robot", os.path.join(HERE, "fonduri_robot.py"))
robot = importlib.util.module_from_spec(spec); spec.loader.exec_module(robot)

LUNI = ["", "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"]
def ro(d): return f"{d.day} {LUNI[d.month]} {d.year} 16:00"
NOW = datetime.datetime.now(robot.TZ)

def item(i, **kw):
    c = {"title": f"Apel de test digitalizare IMM nr. {i}", "url": f"https://oportunitati-ue.gov.ro/apel/test-{i}/", "program": "Programul Creștere Inteligentă, Digitalizare și Instrumente Financiare",
         "type": "", "status": "Activ", "opened": ro(NOW - datetime.timedelta(days=10)), "deadline": ro(NOW + datetime.timedelta(days=40)), "budget": "1.000.000 lei"}
    c.update(kw); return c

class Units(unittest.TestCase):
    def test_norm_url_dedup_key(self):
        a = robot.norm_url("https://Oportunitati-UE.gov.ro/apel/x/?utm_source=fb#top")
        b = robot.norm_url("https://oportunitati-ue.gov.ro/apel/x")
        self.assertEqual(a, b)
    def test_ro_date(self):
        ts = robot.ro_date("15 decembrie 2026 16:00")
        d = datetime.datetime.fromtimestamp(ts, robot.TZ)
        self.assertEqual((d.year, d.month, d.day, d.hour), (2026, 12, 15, 16))
        self.assertIsNone(robot.ro_date("în curând"))
    def test_ro_date_without_time_is_end_of_day(self):
        d = datetime.datetime.fromtimestamp(robot.ro_date("1 martie 2027"), robot.TZ)
        self.assertEqual((d.hour, d.minute), (23, 59))
    def test_categorize(self):
        self.assertIn("digital", robot.categorize({"title": "Digitalizarea IMM", "program": "", "type": ""}))
        self.assertIn("sanatate", robot.categorize({"title": "Echipamente pentru spitale", "program": "Programul Sănătate", "type": ""}))
        self.assertEqual(robot.categorize({"title": "Xyz", "program": "", "type": ""}), ["altele"])

class EndToEnd(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        for name in ("index.html", "sitemap.xml"):
            shutil.copy(os.path.join(REPO, name), self.tmp)
        os.makedirs(os.path.join(self.tmp, "robot")); os.makedirs(os.path.join(self.tmp, "fonduri-europene"))
        shutil.copy(os.path.join(HERE, "fonduri_robot.py"), os.path.join(self.tmp, "robot"))
        shutil.copy(os.path.join(HERE, "template-fonduri.html"), os.path.join(self.tmp, "robot"))
        self.page = os.path.join(self.tmp, "fonduri-europene", "index.html")
        open(self.page, "w", encoding="utf-8").write("PAGINA-VECHE")
    def tearDown(self): shutil.rmtree(self.tmp)
    def run_seed(self, items):
        f = os.path.join(self.tmp, "seed.json"); json.dump(items, open(f, "w", encoding="utf-8"), ensure_ascii=False)
        env = dict(os.environ); env.pop("SITE_EMAIL", None)
        r = subprocess.run([sys.executable, "-I", os.path.join(self.tmp, "robot", "fonduri_robot.py"), "--seed", f], capture_output=True, text=True, env=env, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr); return r

    def test_filters_expired_inactive_duplicates_and_keeps_missing_deadline(self):
        items = [item(i) for i in range(10)]
        items.append(item(1, url="https://oportunitati-ue.gov.ro/apel/test-1"))                 # duplicat (slash final)
        items.append(item(50, deadline=ro(NOW - datetime.timedelta(days=2))))                  # expirat
        items.append(item(51, status="Închis"))                                                # închis
        items.append(item(54, status="Inactiv"))                                               # „Inactiv” conține „activ” – trebuie exclus
        items.append(item(52, deadline=""))                                                    # fără termen pe sursă
        items.append(item(53, title=""))                                                       # câmp obligatoriu lipsă
        self.run_seed(items)
        data = json.load(open(os.path.join(self.tmp, "fonduri-europene", "fonduri.json"), encoding="utf-8"))
        ids = [c["id"] for c in data["calls"]]
        self.assertEqual(len(ids), len(set(ids)), "duplicate în feed")
        self.assertEqual(data["count"], 11)
        urls = " ".join(ids)
        self.assertNotIn("test-50", urls); self.assertNotIn("test-51", urls); self.assertNotIn("test-53", urls); self.assertNotIn("test-54", urls)
        c52 = [c for c in data["calls"] if "test-52" in c["id"]][0]
        self.assertIsNone(c52["deadline"]); self.assertEqual(c52["deadlineRaw"], "")
        for k in ("id", "title", "program", "status", "openingDate", "deadline", "timezone", "officialUrl", "source", "fetchedAt", "categories"):
            self.assertIn(k, data["calls"][0])
        html = open(self.page, encoding="utf-8").read()
        self.assertIn("nespecificat pe sursă", html)
        self.assertIn("Termen limită depunere", html); self.assertIn("Data deschiderii", html)
        self.assertNotIn("__SITE_EMAIL__", html)
        self.assertIn('data-apply', html)
        self.assertEqual(html.count('class="call"'), 11)

    def test_keeps_last_known_good_when_source_too_small(self):
        self.run_seed([item(i) for i in range(3)])
        self.assertEqual(open(self.page, encoding="utf-8").read(), "PAGINA-VECHE")

    def test_source_outage_keeps_page(self):
        self.run_seed([])
        self.assertEqual(open(self.page, encoding="utf-8").read(), "PAGINA-VECHE")

    def test_feed_object_uses_fetched_at_for_freshness(self):
        feed = {"fetchedAt": "2026-11-20T06:30:00+02:00", "pages": 1, "calls": [item(i) for i in range(9)]}
        self.run_seed(feed)
        data = json.load(open(os.path.join(self.tmp, "fonduri-europene", "fonduri.json"), encoding="utf-8"))
        self.assertTrue(data["fetchedAt"].startswith("2026-11-20T06:30"))
        self.assertIn("20 noiembrie 2026, ora 06:30", open(self.page, encoding="utf-8").read())

    def test_html_is_escaped(self):
        items = [item(i) for i in range(9)] + [item(99, title='Apel <script>alert(1)</script> „ăîșț”')]
        self.run_seed(items)
        html = open(self.page, encoding="utf-8").read()
        self.assertNotIn("<script>alert(1)</script>", html)
        self.assertIn("„ăîșț”", html)

if __name__ == "__main__":
    unittest.main(verbosity=2)
