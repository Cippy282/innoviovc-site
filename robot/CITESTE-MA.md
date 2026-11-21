# Robot „Fonduri europene active” – INNOVIO VC

Rulează automat în fiecare dimineață prin GitHub Actions (`.github/workflows/fonduri.yml`), complet independent de Claude.

- Preia apelurile **active** de pe https://oportunitati-ue.gov.ro (portalul oficial MIPE), elimină apelurile expirate, le clasifică pe domenii.
- Regenerează `fonduri-europene/index.html`, `fonduri-europene/fonduri.json`, secțiunea „Apeluri active acum” din `index.html` și `sitemap.xml`.
- Butoanele **„Aplică acum”** deschid un mesaj pre-completat pe email sau pe WhatsApp.
- Dacă sursa nu răspunde sau întoarce sub 8 apeluri, pagina existentă **nu** este suprascrisă.

**Rulare manuală:** tab-ul *Actions* → „Fonduri europene – actualizare zilnica” → *Run workflow*.
**Adresa de email** din site: *Settings → Secrets and variables → Actions → Variables* → `SITE_EMAIL`.
