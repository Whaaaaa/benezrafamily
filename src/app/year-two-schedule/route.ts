import { NextResponse } from "next/server";

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Year Two — Schedule Builder</title>
<style>
  html{ scroll-behavior:smooth; }
  :root{
    --paper:#f4efe4;
    --paper-warm:#ece4d3;
    --ink:#211d17;
    --ink-soft:#5a5347;
    --cobalt:#1c3a63;
    --cobalt-soft:#3f5d85;
    --ochre:#a9752f;
    --rule:#c9bea5;
    --card:#fbf8f1;
    --green:#3f6b46;
    --red:#a3402f;
  }
  *{box-sizing:border-box;}
  body{
    margin:0;
    background:var(--paper);
    color:var(--ink);
    font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
    line-height:1.55;
  }
  .sans{ font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  a{ color:inherit; }

  /* ===== Masthead ===== */
  .masthead{
    position:relative;
    padding:56px 48px 36px;
    border-bottom:3px solid var(--ink);
    background: radial-gradient(ellipse at top left, rgba(28,58,99,0.06), transparent 60%), var(--paper);
  }
  .eyebrow{ font-family:-apple-system,Helvetica,Arial,sans-serif; letter-spacing:.22em; text-transform:uppercase; font-size:11.5px; color:var(--cobalt); font-weight:600; }
  .masthead h1{ font-size:58px; margin:10px 0 6px; letter-spacing:-0.01em; font-weight:400; }
  .masthead h1 em{ font-style:italic; color:var(--cobalt); }
  .masthead .sub{ font-family:-apple-system,Helvetica,Arial,sans-serif; color:var(--ink-soft); font-size:15px; max-width:680px; }
  .stamp{
    position:absolute; top:50px; right:52px; width:112px; height:112px; border:1.5px solid var(--ink); border-radius:50%;
    display:flex; align-items:center; justify-content:center; text-align:center; transform:rotate(-8deg);
    font-family:-apple-system,Helvetica,Arial,sans-serif; color:var(--ink);
  }
  .stamp .n{ font-size:36px; font-weight:700; line-height:1; }
  .stamp .l{ font-size:9px; letter-spacing:.15em; text-transform:uppercase; }

  /* ===== Top status strip (always visible) ===== */
  .status-strip{
    display:flex; gap:0; margin-top:24px; max-width:760px; border:1px solid var(--cobalt); border-radius:4px; overflow:hidden;
    font-family:-apple-system,Helvetica,Arial,sans-serif;
  }
  .status-cell{ flex:1; padding:12px 16px; border-right:1px solid var(--rule); }
  .status-cell:last-child{ border-right:none; }
  .status-cell .label{ font-size:10.5px; text-transform:uppercase; letter-spacing:.1em; color:var(--ink-soft); }
  .status-cell .value{ font-size:20px; font-family:Georgia,serif; color:var(--cobalt); margin-top:2px; }
  .status-cell .value.done{ color:var(--green); }
  .status-cell .bar-track{ height:5px; background:var(--rule); border-radius:4px; margin-top:6px; overflow:hidden; }
  .status-cell .bar-fill{ height:100%; background:var(--cobalt); width:0%; transition:width .3s; }

  /* ===== Section shell ===== */
  section{ padding:44px 48px; border-bottom:1px solid var(--rule); scroll-margin-top:16px; }
  .section-head{ display:flex; align-items:baseline; gap:16px; margin-bottom:20px; }
  .section-num{
    font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:13px; color:var(--cobalt); letter-spacing:.1em; font-weight:700;
    border:1px solid var(--cobalt); border-radius:20px; padding:3px 12px;
  }
  h2{ font-size:28px; font-weight:400; margin:0; }
  h3.sem-title{
    font-family:-apple-system,Helvetica,Arial,sans-serif; color:#fff; background:var(--cobalt); display:inline-block;
    font-size:13px; letter-spacing:.1em; text-transform:uppercase; padding:6px 16px; border-radius:16px; margin:30px 0 14px;
  }
  .section-note{ font-family:-apple-system,Helvetica,Arial,sans-serif; color:var(--ink-soft); font-size:13.5px; max-width:700px; margin:-6px 0 22px; }
  .section-note b{ color:var(--ink); }

  /* ===== Requirements table ===== */
  table.req{ width:100%; border-collapse:collapse; max-width:640px; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:14.5px; }
  table.req td{ padding:11px 4px; border-bottom:1px solid var(--rule); }
  table.req td:last-child{ text-align:right; font-weight:700; color:var(--cobalt); white-space:nowrap; }
  table.req tr.total td{ border-top:2px solid var(--ink); border-bottom:none; font-weight:700; color:var(--ink); }
  table.req tr.total td:last-child{ color:var(--ochre); }

  /* ===== Day grid ===== */
  .day-grid{ display:flex; flex-direction:column; border:1px solid var(--rule); border-radius:4px; overflow:hidden; }
  .day-row{ display:grid; grid-template-columns:78px 1fr 1fr; border-top:1px solid var(--rule); background:var(--paper); }
  .day-row.full{ grid-template-columns:78px 1fr; }
  .day-row:first-child{ border-top:none; }
  .day-row.info{ background:var(--paper-warm); }
  .day-label{
    font-family:-apple-system,Helvetica,Arial,sans-serif; font-weight:700; color:var(--cobalt); font-size:12.5px;
    padding:14px 10px; display:flex; align-items:flex-start; text-transform:uppercase; letter-spacing:.05em;
  }
  .day-cell{ padding:14px 18px; }
  .day-cell + .day-cell{ border-left:1px solid var(--rule); }
  .block-label{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--ink-soft); margin-bottom:6px; }
  .fixed-note{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:13px; color:var(--ink-soft); font-style:italic; }

  select.slot{
    width:100%; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:13px; padding:8px 10px;
    border:1.5px solid var(--rule); border-radius:4px; background:var(--card); color:var(--ink); cursor:pointer;
  }
  select.slot.required.unanswered{ border-color:var(--red); background:#fbf0ee; }
  select.slot.answered{ border-color:var(--cobalt); }
  select.slot.skipped{ border-color:var(--rule); color:var(--ink-soft); font-style:italic; }

  .slot-desc{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12px; color:var(--ink-soft); margin-top:7px; min-height:14px; }
  .slot-desc b{ color:var(--ink); }
  .bio-toggle{
    display:inline-block; margin-top:8px; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:11.5px;
    color:var(--cobalt); font-weight:700; cursor:pointer; text-decoration:underline; text-decoration-style:dotted;
    background:none; border:none; padding:0;
  }
  .bio-toggle:hover{ text-decoration-style:solid; }
  .bio-panel{
    display:none; margin-top:8px; padding:10px 12px; background:var(--paper-warm); border-left:2px solid var(--ochre);
    font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12px; color:var(--ink); line-height:1.5;
  }
  .bio-panel.open{ display:block; }
  .bio-panel a{ color:var(--cobalt); font-weight:700; text-decoration:underline; }
  .bio-panel .bio-missing{ color:var(--ink-soft); font-style:italic; }
  .req-flag{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:10px; color:var(--red); font-weight:700; letter-spacing:.05em; margin-left:6px; }
  .opt-flag{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:10px; color:var(--ink-soft); font-style:italic; margin-left:6px; }

  .mentor-box{
    margin-top:16px; padding:16px 18px; background:var(--card); border:1px solid var(--rule); border-radius:4px;
    display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;
  }
  .mentor-box .mb-select{ flex:1; min-width:240px; }
  .mentor-box .mb-label{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--cobalt); font-weight:700; margin-bottom:8px; }
  .flex-box{ margin-top:12px; padding:14px 18px; background:var(--paper-warm); border:1px dashed var(--rule); border-radius:4px; }

  /* ===== Intensives / collab cards (reference only, non-interactive) ===== */
  .intensive{ display:flex; justify-content:space-between; gap:24px; align-items:baseline; padding:14px 0; border-top:1px dashed var(--rule); }
  .intensive:first-child{ border-top:none; }
  .intensive .left b{ font-size:15.5px; }
  .intensive .left span{ display:block; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12.5px; color:var(--ink-soft); font-style:italic; }
  .intensive .right{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12px; color:var(--cobalt); font-weight:700; text-align:right; white-space:nowrap; }

  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
  .card{ background:var(--card); border:1px solid var(--rule); border-radius:2px; padding:16px 18px; }
  .card .tag{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--cobalt); font-weight:700; margin-bottom:6px; display:block; }
  .card h4{ font-size:16px; margin:0 0 4px; font-weight:700; }
  .card .by{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12px; color:var(--ink-soft); font-style:italic; margin-bottom:8px; }
  .card p{ font-size:12.5px; color:var(--ink); margin:0; }

  .footnote{ font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:12px; color:var(--ink-soft); padding:28px 48px 44px; max-width:780px; }
  .footnote b{ color:var(--ink); }

  /* ===== Floating plan panel ===== */
  #planFab{
    position:fixed; bottom:22px; right:22px; z-index:40; background:var(--cobalt); color:#fff; border-radius:30px;
    padding:13px 20px; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:13px; font-weight:700;
    box-shadow:0 6px 18px rgba(0,0,0,0.25); cursor:pointer; display:flex; align-items:center; gap:8px;
  }
  #planFab:hover{ background:var(--cobalt-soft); }
  #planFab .dot{ width:8px; height:8px; border-radius:50%; background:#9fd4a5; }
  #planPanel{
    position:fixed; top:0; right:0; bottom:0; width:360px; max-width:90vw; background:var(--paper-warm);
    border-left:2px solid var(--ink); z-index:50; transform:translateX(105%); transition:transform .3s ease;
    display:flex; flex-direction:column; box-shadow:-8px 0 30px rgba(0,0,0,0.15);
  }
  #planPanel.open{ transform:translateX(0); }
  .plan-head{ padding:20px 20px 14px; border-bottom:1px solid var(--rule); display:flex; align-items:center; justify-content:space-between; }
  .plan-head h3{ margin:0; font-size:20px; font-weight:400; }
  #planClose{ background:none; border:none; font-size:20px; cursor:pointer; color:var(--ink-soft); }
  .plan-body{ padding:16px 20px; overflow-y:auto; flex:1; font-family:-apple-system,Helvetica,Arial,sans-serif; }
  .plan-progress-wrap{ margin-bottom:14px; }
  .plan-progress-label{ display:flex; justify-content:space-between; font-size:12px; color:var(--ink-soft); margin-bottom:5px; }
  .plan-progress-label b{ color:var(--ink); font-size:15px; font-family:Georgia,serif; }
  .plan-bar-track{ height:7px; background:var(--rule); border-radius:6px; overflow:hidden; }
  .plan-bar-fill{ height:100%; background:var(--cobalt); width:0%; transition:width .3s; }
  .plan-section-title{ font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--cobalt); font-weight:700; margin:16px 0 6px; }
  .plan-row{ display:flex; justify-content:space-between; gap:10px; padding:6px 0; border-top:1px solid var(--rule); font-size:12px; }
  .plan-row:first-child{ border-top:none; }
  .plan-label{ color:var(--ink-soft); white-space:nowrap; }
  .plan-value{ text-align:right; color:var(--ink); font-weight:600; }
  #planWarnings{ margin-top:14px; }
  .warn-line{ font-size:12px; color:var(--red); margin-bottom:6px; }
  .ok-line{ font-size:12px; color:var(--green); font-weight:700; }
  .plan-foot{ padding:14px 20px; border-top:1px solid var(--rule); }
  #planReset{
    width:100%; padding:10px; border-radius:20px; border:1px solid var(--red); background:transparent; color:var(--red);
    font-weight:700; font-size:12.5px; cursor:pointer; font-family:-apple-system,Helvetica,Arial,sans-serif;
  }
  #planReset:hover{ background:rgba(163,64,47,0.08); }
</style>
</head>
<body>

  <div class="masthead">
    <div class="stamp"><div><span class="n" style="display:block;">02</span><span class="l">Year&nbsp;Two</span></div></div>
    <div class="eyebrow">Department of Fine Arts · Bezalel Academy · תשפ״ז 2026–2027</div>
    <h1>Schedule <em>Builder</em></h1>
    <div class="sub">Go day by day through Semester A and Semester B. Every slot that offers a real choice has a dropdown — answer each one (a course, or "Skip this session") to complete your plan. Fixed items like Sunday's shared coursework and the Friday studio don't need a choice, so there's nothing to answer there.</div>
    <div class="status-strip">
      <div class="status-cell">
        <div class="label">Fields answered</div>
        <div class="value" id="statusAnswered">0 / 16</div>
        <div class="bar-track"><div class="bar-fill" id="barAnswered"></div></div>
      </div>
      <div class="status-cell">
        <div class="label">Electives chosen</div>
        <div class="value" id="statusElectives">0 / 5</div>
        <div class="bar-track"><div class="bar-fill" id="barElectives"></div></div>
      </div>
      <div class="status-cell">
        <div class="label">Credits</div>
        <div class="value" id="statusCredits">0 / 24</div>
        <div class="bar-track"><div class="bar-fill" id="barCredits"></div></div>
      </div>
    </div>
  </div>

  <!-- 01 REQUIREMENTS -->
  <section id="sec-requirements">
    <div class="section-head"><span class="section-num">01</span><h2>Program requirements</h2></div>
    <div class="section-note">You'll assign a mentor for each semester directly inside the builder below. You and they agree on how you'll develop your work toward that year's exhibition; at year's end you present a piece to a review panel with faculty critique.</div>
    <table class="req">
      <tr><td>Studio — Semester A</td><td>4 credits</td></tr>
      <tr><td>Studio — Semester B</td><td>4 credits</td></tr>
      <tr><td>5 elective courses</td><td>10 credits</td></tr>
      <tr><td>Mentor tutorial — Semester A</td><td>2 credits</td></tr>
      <tr><td>Mentor tutorial — Semester B</td><td>2 credits</td></tr>
      <tr><td>Year‑end exhibition</td><td>2 credits</td></tr>
      <tr><td>Encyclopedia (mandatory participation)</td><td>—</td></tr>
      <tr class="total"><td>Total</td><td>24 credits</td></tr>
    </table>
    <p class="section-note" style="margin-top:16px;">Encyclopedia is a shared knowledge framework for the whole department — a running series of study days that every student is required to attend. It carries no credit and no weekly slot, so it isn't part of the builder below, but attendance is still mandatory.</p>
  </section>

  <!-- 02 BUILDER -->
  <section id="sec-builder">
    <div class="section-head"><span class="section-num">02</span><h2>Build your schedule</h2></div>
    <div class="section-note">Fields marked <span class="req-flag">REQUIRED</span> must be answered to complete your plan — choose an actual course, or "Skip this session" where that's offered. Studio and mentor slots have no skip option since they're mandatory. The optional field at the end of Semester B has no fixed weekly slot, so it's not required.</div>

    <!-- ===================== SEMESTER A ===================== -->
    <h3 class="sem-title">Semester A</h3>
    <div class="day-grid">
      <div class="day-row full info">
        <div class="day-label">Sun</div>
        <div class="day-cell"><span class="fixed-note">Dept. of Visual &amp; Material Culture courses &middot; 10:00–17:00 &mdash; shared, all day, no choice needed.</span></div>
      </div>
      <div class="day-row full">
        <div class="day-label">Mon</div>
        <div class="day-cell">
          <div class="block-label">Studio &middot; 10:00–17:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-A-mon" data-slot="A-mon" data-kind="studio" data-required="true">
            <option value="">— Select your Semester A studio —</option>
            <option value="s1" data-time="Mon 10:00–17:00" data-instructor="Eitan Ben‑Moshe" data-desc="Sculpture as dynamic architectural practice — movement between material, image and space; digital sculpting (Blender) combined with tangible material.">Sculpture in Multidimensional Space — Ben‑Moshe</option>
            <option value="s2" data-time="Mon 10:00–17:00" data-instructor="Michal Helfman" data-desc="Design and build a full exhibition‑scale installation from planning through execution, exploring presence and mediation.">Space Plans — Helfman</option>
            <option value="s3" data-time="Mon 10:00–17:00" data-instructor="Talya Israeli" data-desc="For painters developing a personal visual language — how live and mediated images relate to painting's history.">Painting "In Real Time" — Israeli</option>
            <option value="s4" data-time="Mon 10:00–17:00" data-instructor="Hila Toni Navok" data-desc="Sculpture responding to the everyday and functional — collecting, found materials, improvised construction.">Hunter‑Gatherer — Navok</option>
            <option value="s5" data-time="Mon 10:00–17:00" data-instructor="Prof. Yehudit Sasportas" data-desc="Locates and dissects each artist's own creative mechanism, starting from a personal signature.">The Lab — Sasportas</option>
            <option value="s6" data-time="Mon 10:00–17:00" data-instructor="Alona Friedberg" data-desc="Expands video/sound practice through the combinatorial relationships of image, screen, and duration.">Image, Screen, Sound, Space, Time — Friedberg</option>
            <option value="s7" data-time="Mon 10:00–17:00" data-instructor="Gilad Ratman" data-desc="Develops working practices for personal projects with no constraints on medium or format.">Roots of Judgment &amp; Trust — Ratman</option>
            <option value="s8" data-time="Mon 10:00–17:00" data-instructor="Gil Marco Sheni" data-desc="A dedicated workshop for producing an artist's book, using photography as a gathering unit.">The Green Table — Artist's Book — Sheni</option>
          </select>
          <div class="slot-desc" id="desc-A-mon"></div>
        </div>
      </div>
      <div class="day-row">
        <div class="day-label">Tue</div>
        <div class="day-cell">
          <div class="block-label">Morning &middot; 10:00–13:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-A-tue_am" data-slot="A-tue_am" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e1" data-time="Tue 10:00–13:00" data-instructor="Yosef Krispel" data-desc="Locating and appropriating images from the world for use as source material.">Hunting Images</option>
            <option value="e2" data-time="Tue 10:00–13:00" data-instructor="Lior Waterman" data-desc="Human anatomy for artists — its history and depiction across art history.">Anatomy of the Magical Body</option>
            <option value="e3" data-time="Tue 10:00–13:00" data-instructor="Uri Nir" data-desc="A course on rest, attention, and the artist's gaze.">Sabbath Eyes</option>
          </select>
          <div class="slot-desc" id="desc-A-tue_am"></div>
        </div>
        <div class="day-cell">
          <div class="block-label">Afternoon &middot; 14:00–17:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-A-tue_pm" data-slot="A-tue_pm" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e4" data-time="Tue 14:00–17:00" data-instructor="Roni Karni" data-desc="Close, focused work directly at the easel — painting built around technical chapters.">Chapters in Painting</option>
            <option value="e5" data-time="Tue 14:00–17:00" data-instructor="Ohad Fishof" data-desc="Performance as artistic medium and practice.">Performance</option>
            <option value="e6" data-time="Tue 14:00–17:00" data-instructor="Irit Hamo" data-desc="Relief printmaking techniques in wood and linoleum.">Printmaking: Wood or Lino</option>
          </select>
          <div class="slot-desc" id="desc-A-tue_pm"></div>
        </div>
      </div>
      <div class="day-row">
        <div class="day-label">Wed</div>
        <div class="day-cell">
          <div class="block-label">Morning &middot; 10:00–13:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-A-wed_am" data-slot="A-wed_am" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e7" data-time="Wed 10:00–13:00" data-instructor="Dor Zlekha Levy" data-desc="Working with video/film footage and the editing process as a creative site.">On the Editing‑Room Floor</option>
            <option value="e8" data-time="Wed 10:00–13:00" data-instructor="Zohar Gutesman" data-desc="Carving in stone — the oldest sculptural material, contemporary approaches.">Stone Sculpture</option>
            <option value="e9" data-time="Wed 10:00–13:00" data-instructor="Ohad Fishof" data-desc="Foundational sound work for artists.">Intro to Audio</option>
          </select>
          <div class="slot-desc" id="desc-A-wed_am"></div>
        </div>
        <div class="day-cell">
          <div class="block-label">Afternoon &middot; 14:00–17:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-A-wed_pm" data-slot="A-wed_pm" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e10" data-time="Wed 14:00–17:00" data-instructor="Zohar Gutesman" data-desc="Modeling technique in clay — figure and form.">Sculpture — Clay Modeling</option>
            <option value="e11" data-time="Wed 14:00–17:00" data-instructor="Nir Harel" data-desc="Building a personal web page/portfolio around a chosen research topic, exhibited online.">Web Journals</option>
          </select>
          <div class="slot-desc" id="desc-A-wed_pm"></div>
        </div>
      </div>
      <div class="day-row">
        <div class="day-label">Thu</div>
        <div class="day-cell">
          <div class="block-label">Morning &middot; 10:00–13:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-A-thu_am" data-slot="A-thu_am" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e12" data-time="Thu 10:00–13:00" data-instructor="Peter Melz" data-desc="Relief sculpture and its formal possibilities.">Relief</option>
            <option value="e13" data-time="Thu 10:00–13:00" data-instructor="Raida Saadeh" data-desc="Making work from domestic and found objects and materials.">Art from Household &amp; Found Materials</option>
            <option value="e14" data-time="Thu 10:00–13:00" data-instructor="Yoav Weinfeld" data-desc="Sketching connected to readymade and industrial materials.">Combustible Materials: Sketching</option>
          </select>
          <div class="slot-desc" id="desc-A-thu_am"></div>
        </div>
        <div class="day-cell">
          <div class="block-label">Afternoon &middot; 14:00–17:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-A-thu_pm" data-slot="A-thu_pm" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e15" data-time="Thu 14:00–17:00" data-instructor="Ron Asulin" data-desc="Building and construction skills for sculptural objects, concept to fabrication.">Sculpture &amp; Construction</option>
            <option value="e16" data-time="Thu 14:00–17:00" data-instructor="Rami Maimon" data-desc="Extends printmaking practice from the flat surface into spatial/installation work.">Printmaking Beyond: Surface to Space</option>
            <option value="e17" data-time="Thu 14:00–17:00" data-instructor="Tamir Erlich" data-desc="Ceramics techniques oriented toward contemporary sculptural practice.">Ceramics for Sculptors</option>
          </select>
          <div class="slot-desc" id="desc-A-thu_pm"></div>
        </div>
      </div>
      <div class="day-row full info">
        <div class="day-label">Fri</div>
        <div class="day-cell"><span class="fixed-note">Studio: Sculpture &amp; Drama &middot; 10:00–13:00 &mdash; Yochai Avrahami. Everyone attends; not a pick.</span><details style="margin-top:6px; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:11.5px;"><summary style="color:var(--cobalt); font-weight:700; cursor:pointer;">▸ About Yochai Avrahami</summary><div style="margin-top:6px; padding:10px 12px; background:var(--paper-warm); border-left:2px solid var(--ochre); color:var(--ink); font-size:12px; line-height:1.5;">Sculptor, video and installation artist (b. 1970, Ram-On). B.F.A. Bezalel Academy of Arts and Design; recipient of a Young Artist Prize. Long-time Bezalel faculty member, teaching sculpture across all four years. &middot; <a href="https://www.bezalel.ac.il/en/node/4059" target="_blank" rel="noopener" style="color:var(--cobalt); font-weight:700; text-decoration:underline;">Bezalel faculty page ↗</a></div></details></div>
      </div>
    </div>

    <div class="mentor-box">
      <div class="mb-select">
        <div class="mb-label">Mentor Tutorial — Semester A <span class="req-flag">REQUIRED</span></div>
        <select class="slot" id="sel-A-mentor" data-slot="A-mentor" data-kind="mentor" data-required="true">
          <option value="">— Select your Semester A mentor —</option>
          <option value="m1" data-time="Wed 10:00–13:00" data-instructor="Avi Sabah" data-desc="Views solitude as a productive condition for the artist — meetings held individually. Wed AM.">Avi Sabah</option>
          <option value="m2" data-time="Tue 09:00–13:00" data-instructor="Rami Maimon" data-desc="Focuses on relationships between form, material, and content. Tue AM.">Rami Maimon</option>
          <option value="m3" data-time="Mon 17:00–18:00" data-instructor="Prof. Yehudit Sasportas" data-desc="Meetings that reach deep into the student's central preoccupations. Mon PM.">Prof. Yehudit Sasportas</option>
          <option value="m4" data-time="Thu 14:00–17:00" data-instructor="Peter Melz" data-desc="Guidance geared toward the practicalities of production. Thu PM.">Peter Melz</option>
          <option value="m5" data-time="Mon 09:00–10:00" data-instructor="Alona Friedberg" data-desc="Pairs personal meetings with group discussion around your process. Mon AM.">Alona Friedberg</option>
          <option value="m6" data-time="arranged individually" data-instructor="Talia Kinan" data-desc="Personal‑guidance built around questions arising during the creative process.">Talia Kinan</option>
          <option value="m7" data-time="Tue 14:00–17:00" data-instructor="Uri Nir" data-desc="Four structured half‑hour sessions across the semester. Tue PM.">Uri Nir</option>
          <option value="m8" data-time="Mon 17:00–18:00" data-instructor="Gilad Ratman" data-desc="Guidance shaped around tools and technique for your own process. Mon PM.">Gilad Ratman</option>
          <option value="m9" data-time="Tue 14:00–17:00" data-instructor="Tamar Harpaz" data-desc="Developing good artistic habits — deadlines, drafts, openness to feedback. Tue PM.">Tamar Harpaz</option>
          <option value="m10" data-time="Mon 09:00–10:00" data-instructor="Michal Helfman" data-desc="Four cross‑semester meetings tracking work toward the year‑end exhibition. Mon AM.">Michal Helfman</option>
        </select>
        <div class="slot-desc" id="desc-A-mentor"></div>
      </div>
    </div>

    <!-- ===================== SEMESTER B ===================== -->
    <h3 class="sem-title">Semester B</h3>
    <div class="day-grid">
      <div class="day-row full info">
        <div class="day-label">Sun</div>
        <div class="day-cell"><span class="fixed-note">Dept. of Visual &amp; Material Culture courses &middot; 10:00–17:00 &mdash; shared, all day, no choice needed.</span></div>
      </div>
      <div class="day-row full">
        <div class="day-label">Mon</div>
        <div class="day-cell">
          <div class="block-label">Studio &middot; 10:00–17:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-B-mon" data-slot="B-mon" data-kind="studio" data-required="true">
            <option value="">— Select your Semester B studio —</option>
            <option value="s9" data-time="Mon 10:00–17:00" data-instructor="Maayan Elikim" data-desc="Considers the 'objet' in contemporary sculpture — the ordinary, the crafted, the found.">An Object Is Born — Elikim</option>
            <option value="s10" data-time="Mon 10:00–17:00" data-instructor="Prof. Irit Hamo" data-desc="Personal studio deepening one long‑term body of work through every stage, with individual mentoring.">Rear Window — Hamo</option>
            <option value="s11" data-time="Mon 10:00–17:00" data-instructor="Uri Nir" data-desc="The search for an individual artistic voice against the pull of trends — four one‑on‑ones plus crits.">The Unique Voice — Nir</option>
            <option value="s12" data-time="Mon 10:00–17:00" data-instructor="Avi Sabah" data-desc="A deep dive into the two‑dimensional surface in painting.">Flat World — Sabah</option>
            <option value="s13" data-time="Mon 10:00–17:00" data-instructor="Prof. Miri Segal" data-desc="The individual in the age of technology, where daily life becomes a kind of artwork — new media, AI.">World &amp; Art — Segal</option>
            <option value="s14" data-time="Mon 10:00–17:00" data-instructor="Prof. Yehudit Sasportas" data-desc="Examines home and belonging — national, personal, virtual.">The Room — Sasportas</option>
            <option value="s15" data-time="Mon 10:00–17:00" data-instructor="Talya Keenan" data-desc="Treats drawing as a daily practice — a research tool expanding the creative process.">From Page to Space — Keenan</option>
          </select>
          <div class="slot-desc" id="desc-B-mon"></div>
        </div>
      </div>
      <div class="day-row">
        <div class="day-label">Tue</div>
        <div class="day-cell">
          <div class="block-label">Morning &middot; 10:00–13:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-B-tue_am" data-slot="B-tue_am" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e18" data-time="Tue 10:00–13:00" data-instructor="Eyal Shashon" data-desc="Approaches painting through excavation and layered history as metaphor and method.">Painting as an Archaeological Site</option>
            <option value="e19" data-time="Tue 10:00–13:00" data-instructor="Raida Saadeh" data-desc="Explores transitions and thresholds as artistic subject matter.">Passage to Art</option>
          </select>
          <div class="slot-desc" id="desc-B-tue_am"></div>
        </div>
        <div class="day-cell">
          <div class="block-label">Afternoon &middot; 14:00–17:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-B-tue_pm" data-slot="B-tue_pm" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e20" data-time="Tue 14:00–17:00" data-instructor="Masha Zusman" data-desc="Drawing exploring the relationship between body, material, and gesture toward the object.">On the Threshold of the Possible</option>
            <option value="e21" data-time="Tue 14:00–17:00" data-instructor="Nir Harel" data-desc="Gaze and the body as subjects in painting.">Eye and Body</option>
            <option value="e22" data-time="Tue 14:00–17:00" data-instructor="Avi Kritzman" data-desc="Deepens printmaking technique and personal print projects.">Advanced Printmaking</option>
          </select>
          <div class="slot-desc" id="desc-B-tue_pm"></div>
        </div>
      </div>
      <div class="day-row">
        <div class="day-label">Wed</div>
        <div class="day-cell">
          <div class="block-label">Morning &middot; 10:00–13:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-B-wed_am" data-slot="B-wed_am" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e23" data-time="Wed 10:00–13:00" data-instructor="Zohar Gutesman" data-desc="Fundamentals of mold‑making and casting: undercuts, negative/positive space.">Molds &amp; Casts</option>
            <option value="e24" data-time="Wed 10:00–13:00" data-instructor="Maya Gold" data-desc="Observational and analytical figurative drawing.">Figurative Drawing</option>
            <option value="e25" data-time="Wed 10:00–13:00" data-instructor="Mor Afgin" data-desc="Methods and tools for producing work, tailored to your own practice.">Developing Tools in Artistic Practice</option>
          </select>
          <div class="slot-desc" id="desc-B-wed_am"></div>
        </div>
        <div class="day-cell">
          <div class="block-label">Afternoon &middot; from 14:00 (end time varies by course) <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-B-wed_pm" data-slot="B-wed_pm" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e26" data-time="Wed 14:00–15:00" data-instructor="Maya Gold" data-desc="Figurative painting technique and practice.">Figurative Painting</option>
            <option value="e27" data-time="Wed 14:00–17:00" data-instructor="Leah Avital" data-desc="The connection between body and sculpture — physical training methods for artists.">Body Development</option>
            <option value="e28" data-time="Wed 14:00–18:00" data-instructor="Gil Marco Sheni" data-desc="Installation‑based practice — where an object sits between object and void.">States</option>
          </select>
          <div class="slot-desc" id="desc-B-wed_pm"></div>
        </div>
      </div>
      <div class="day-row">
        <div class="day-label">Thu</div>
        <div class="day-cell">
          <div class="block-label">Morning &middot; 10:00–13:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-B-thu_am" data-slot="B-thu_am" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e29" data-time="Thu 10:00–13:00" data-instructor="Ati Yaakobi Lil‑Or" data-desc="Practical drawing grounded in observational study.">Drawing for Artists</option>
            <option value="e30" data-time="Thu 10:00–13:00" data-instructor="Michal Helfman" data-desc="On drawing on influence and inspiration openly and productively.">Permission to Inspire</option>
            <option value="e31" data-time="Thu 10:00–13:00" data-instructor="Orly Castel‑Bloom" data-desc="Creative writing fundamentals for artists — up to a 1,000‑word short story.">Foundations of Writing</option>
          </select>
          <div class="slot-desc" id="desc-B-thu_am"></div>
        </div>
        <div class="day-cell">
          <div class="block-label">Afternoon &middot; 14:00–17:00 <span class="req-flag">REQUIRED</span></div>
          <select class="slot" id="sel-B-thu_pm" data-slot="B-thu_pm" data-kind="elective" data-required="true">
            <option value="">— Select —</option>
            <option value="skip">Skip this session</option>
            <option value="e32" data-time="Thu 14:00–17:00" data-instructor="Peter Melz" data-desc="Sculptural practice engaging directly with outdoor and site‑specific contexts.">Outside: A Sculptural Journey</option>
            <option value="e33" data-time="Thu 14:00–17:00" data-instructor="Talya Israeli" data-desc="Landscape drawing/painting focused on history and personal reflection on place.">Seeing Far, Seeing Through</option>
          </select>
          <div class="slot-desc" id="desc-B-thu_pm"></div>
        </div>
      </div>
      <div class="day-row full info">
        <div class="day-label">Fri</div>
        <div class="day-cell"><span class="fixed-note">Studio: Sculpture &amp; Drama &middot; 10:00–13:00 &mdash; Yochai Avrahami (everyone attends). Also the recurring slot for the concentrated summer course "This Is It!" with Tamar Harpaz &mdash; see §03.</span><details style="margin-top:6px; font-family:-apple-system,Helvetica,Arial,sans-serif; font-size:11.5px;"><summary style="color:var(--cobalt); font-weight:700; cursor:pointer;">▸ About Yochai Avrahami</summary><div style="margin-top:6px; padding:10px 12px; background:var(--paper-warm); border-left:2px solid var(--ochre); color:var(--ink); font-size:12px; line-height:1.5;">Sculptor, video and installation artist (b. 1970, Ram-On). B.F.A. Bezalel Academy of Arts and Design; recipient of a Young Artist Prize. Long-time Bezalel faculty member, teaching sculpture across all four years. &middot; <a href="https://www.bezalel.ac.il/en/node/4059" target="_blank" rel="noopener" style="color:var(--cobalt); font-weight:700; text-decoration:underline;">Bezalel faculty page ↗</a></div></details></div>
      </div>
    </div>

    <div class="mentor-box">
      <div class="mb-select">
        <div class="mb-label">Mentor Tutorial — Semester B <span class="req-flag">REQUIRED</span></div>
        <select class="slot" id="sel-B-mentor" data-slot="B-mentor" data-kind="mentor" data-required="true">
          <option value="">— Select your Semester B mentor —</option>
          <option value="m11" data-time="Tue 14:00–17:00" data-instructor="Eitan Ben‑Moshe" data-desc="Personal meetings to build your own creative development. Tue PM.">Eitan Ben‑Moshe</option>
          <option value="m12" data-time="Thu 09:00–10:00" data-instructor="Michal Helfman" data-desc="Four cross‑semester meetings tracking work toward the exhibition. Thu AM.">Michal Helfman</option>
          <option value="m13" data-time="Thu 14:00–17:00" data-instructor="Ati Yaakobi Lil‑Or" data-desc="Accompanies your process through open dialogue. Thu PM.">Ati Yaakobi Lil‑Or</option>
          <option value="m14" data-time="arranged individually" data-instructor="Talya Israeli" data-desc="Personal guidance centered on whatever you're working through.">Talya Israeli</option>
          <option value="m15" data-time="Mon 17:00–18:00" data-instructor="Prof. Yehudit Sasportas" data-desc="Meetings that reach deep into your central preoccupations. Mon PM.">Prof. Yehudit Sasportas</option>
          <option value="m16" data-time="Tue 10:00–13:00" data-instructor="Alona Friedberg" data-desc="Pairs personal meetings with group discussion. Tue AM.">Alona Friedberg</option>
          <option value="m17" data-time="Wed, time not printed in source" data-instructor="Elham Rokni" data-desc="Tracks how your process deepens over the semester. Wed PM.">Elham Rokni</option>
          <option value="m18" data-time="Wed 09:00–13:00" data-instructor="Eli Petel" data-desc="Individual guidance offered flexibly according to need. Wed AM.">Eli Petel</option>
          <option value="m19" data-time="Wed 09:00–13:00" data-instructor="Gil Marco Sheni" data-desc="Accompanies a personal project or portfolio toward the exhibition. Wed AM.">Gil Marco Sheni</option>
          <option value="m20" data-time="Wed, time not printed in source" data-instructor="Gilad Ratman" data-desc="Guidance shaped around tools and technique for your process. Wed PM.">Gilad Ratman</option>
          <option value="m21" data-time="Tue 14:00–17:00" data-instructor="Eyal Shashon" data-desc="A personal meeting focused on your creative space. Tue PM.">Eyal Shashon</option>
        </select>
        <div class="slot-desc" id="desc-B-mentor"></div>
      </div>
    </div>

    <div class="flex-box">
      <div class="mb-label">Optional: untimed elective <span class="opt-flag">NOT REQUIRED — no fixed weekly slot</span></div>
      <select class="slot" id="sel-B-flexible" data-slot="B-flexible" data-kind="elective" data-required="false">
        <option value="">— None —</option>
        <option value="e34" data-time="time arranged individually" data-instructor="Michal Helfman" data-desc="Examines borrowing and lending — human and material relationships to ownership, absence, and presence.">Request for Loan</option>
      </select>
      <div class="slot-desc" id="desc-B-flexible"></div>
    </div>
  </section>

  <!-- 03 INTENSIVES -->
  <section id="sec-intensives">
    <div class="section-head"><span class="section-num">03</span><h2>Guest masters &amp; intensives</h2></div>
    <div class="section-note">Reference only — these are one‑off or concentrated sessions, not weekly slots, so there's nothing to answer here. Dates and hours as printed in the yearbook.</div>
    <div class="intensive"><div class="left"><b>Craftsmanship</b><span>Philip Rantzer — Guest Master</span></div><div class="right">14–18 Feb 2027 · 10:00–16:00 daily</div></div>
    <div class="intensive"><div class="left"><b>Between Body and Landscape</b><span>Maya Cohen‑Levy — Guest Master</span></div><div class="right">14–18 Feb 2027 · 10:00–16:00 daily</div></div>
    <div class="intensive"><div class="left"><b>Study trip to Vienna</b><span>Yosef Krispel</span></div><div class="right">6–11 Dec 2027</div></div>
    <div class="intensive"><div class="left"><b>Study trip to Belgrade</b><span>Raida Saadeh</span></div><div class="right">21–25 Feb 2027</div></div>
    <div class="intensive"><div class="left"><b>"This Is It!"</b><span>Tamar Harpaz — concentrated summer course</span></div><div class="right">10:00–17:00, Mon–Fri</div></div>
  </section>

  <!-- 04 COLLABORATIONS -->
  <section id="sec-collabs" style="border-bottom:none;">
    <div class="section-head"><span class="section-num">04</span><h2>Cross‑department electives — with times</h2></div>
    <div class="section-note">Run by partner units on their own registration, not part of the required builder above — so nothing here is auto‑checked against your plan. Sorted by day and start time so you can see at a glance what overlaps with your own schedule. <b>Heads up:</b> a cluster of these meet Wednesday 14:00–17:00, exactly when several required Semester A/B electives in your builder also run — you can only be in one room at a time, so treat this column as a real constraint, not just a reference list.</div>
    <table class="req" style="max-width:100%; font-size:13px;">
      <tr style="font-weight:700; color:var(--ink-soft); text-transform:uppercase; font-size:10.5px; letter-spacing:.06em;">
        <td>Day / Time</td><td>Course</td><td>Instructor</td><td>Partner unit</td><td>Semester</td><td style="text-align:right;">Credits</td>
      </tr>
      <tr><td>Sun 9:00–12:00</td><td>Faith, Fact, Fiction</td><td>Anna Weiled</td><td>Musrara</td><td>Yearly</td><td style="text-align:right;">2</td></tr>
      <tr><td>Sun 16:00–19:00</td><td>The New Theater</td><td>Ariel Sarne Bar‑On</td><td>Musrara</td><td>Sem B</td><td style="text-align:right;">2</td></tr>
      <tr><td>Tue 10:00–13:00</td><td>Drawing and Material</td><td>Moush Kashi</td><td>Musrara</td><td>Sem A</td><td style="text-align:right;">2</td></tr>
      <tr><td>Tue 10:00–13:00</td><td>Moving Image — Advanced</td><td>Navot Yitzhak</td><td>Photography Dept.</td><td>Yearly</td><td style="text-align:right;">4</td></tr>
      <tr><td>Tue 12:30–15:30</td><td>Lighting</td><td>Omer Shizuf</td><td>Musrara</td><td>Yearly</td><td style="text-align:right;">2</td></tr>
      <tr><td>Tue 12:30–15:30</td><td>Code and the Foundation</td><td>Nir Sha'alul</td><td>Musrara</td><td>Yearly</td><td style="text-align:right;">2</td></tr>
      <tr><td>Tue 14:00–17:00</td><td>Kolnoa Lekolnoa (Cinema, Again)</td><td>Anna Yam</td><td>Photography Dept.</td><td>semester not printed in source</td><td style="text-align:right;">2</td></tr>
      <tr><td>Tue 16:00–17:30</td><td>See, Listen, Hear, Mix the Space</td><td>Uri Drummer</td><td>Musrara</td><td>Yearly</td><td style="text-align:right;">2</td></tr>
      <tr><td>Tue 16:00–17:30</td><td>Advanced Video Skills</td><td>Erik Fuchsman</td><td>Musrara</td><td>Yearly</td><td style="text-align:right;">2</td></tr>
      <tr><td>Tue 17:30–20:30</td><td>Photography &amp; Additional Media</td><td>Tomer Kaf</td><td>Photography Dept.</td><td>Sem B</td><td style="text-align:right;">2</td></tr>
      <tr><td>Wed 10:00–13:00</td><td>Print on Material and Glass</td><td>Galia Armland</td><td>Musrara</td><td>Sem B</td><td style="text-align:right;">2</td></tr>
      <tr style="background:#f3e8d8;"><td>Wed 14:00–17:00</td><td>Video Art</td><td>Sharon Balaban</td><td>Photography Dept.</td><td>Sem A</td><td style="text-align:right;">2</td></tr>
      <tr style="background:#f3e8d8;"><td>Wed 14:00–17:00</td><td>Life as Self‑Portrait</td><td>Noa Tzedaka</td><td>Photography Dept.</td><td>Sem A</td><td style="text-align:right;">2</td></tr>
      <tr style="background:#f3e8d8;"><td>Wed 14:00–17:00</td><td>Experimental Cinema Toward Political Cinema</td><td>Yisraela Sha'ar Meod</td><td>Photography Dept.</td><td>Sem B</td><td style="text-align:right;">2</td></tr>
      <tr style="background:#f3e8d8;"><td>Wed 14:00–17:00</td><td>New Video Practices</td><td>Guy Ben‑Ner</td><td>Screen Arts Dept.</td><td>Sem B</td><td style="text-align:right;">2</td></tr>
      <tr style="background:#f3e8d8;"><td>Wed 14:00–17:00</td><td>Visual Code Writing in Unreal Engine</td><td>Amir Yaziv</td><td>Screen Arts Dept.</td><td>Sem B</td><td style="text-align:right;">2</td></tr>
      <tr style="background:#f3e8d8;"><td>Wed 14:00–17:00</td><td>Sculpture at Large Scale</td><td>Sasha Serber</td><td>Ceramic &amp; Glass Design Dept.</td><td>Sem A</td><td style="text-align:right;">2</td></tr>
      <tr style="background:#f3e8d8;"><td>Wed 14:00–17:00</td><td>Media Tech &amp; 3D Print Scanning</td><td>Sasha Serber</td><td>Musrara</td><td>Sem B</td><td style="text-align:right;">2</td></tr>
      <tr><td>Thu 14:00–17:00</td><td>Wandering in Digital Spaces</td><td>Ruth Peer &amp; Kerem Naor</td><td>Ceramic &amp; Glass Design Dept.</td><td>Sem A</td><td style="text-align:right;">2</td></tr>
    </table>
    <p class="section-note" style="margin-top:14px;">Shaded rows all fall in the same Wednesday 14:00–17:00 window — that's also the exact slot for your required Sem A Wed‑PM electives (Clay Modeling, Web Journals) and Sem B Wed‑PM electives (Figurative Painting, Body Development, States) in the builder above. In practice you'd choose one thing for that hour, whether it comes from §02 or this table.</p>
  </section>

  <div class="footnote">
    <b>Sources.</b> Compiled from the Fine Arts Department yearbook (שנתון תשפ״ז), the collaboration appendix (נספח שיתופי פעולה), and the department timetable (מערכת תשפ״ז), Bezalel Academy of Arts and Design, 2026–2027. Descriptions are condensed English summaries — consult the original PDFs for exact wording and registration details. Instructor names are transliterated and may vary slightly from official spellings.
    <br><br>
    <b>About the builder.</b> Because each day/time slot has its own dropdown, you can never accidentally pick two things that happen at the same hour — the grid structure itself prevents that. It does not check your choices against the Guest Master intensives, study trips, or cross‑department electives in §03/§04, since those run on separate calendars. Your answers save automatically and reload next time you open this file.
  </div>

  <!-- Plan FAB + slide-out panel -->
  <div id="planFab"><span class="dot"></span>My Plan · <span id="fabCredits">0</span>/24</div>
  <div id="planPanel">
    <div class="plan-head"><h3>Your Plan</h3><button id="planClose" aria-label="Close">✕</button></div>
    <div class="plan-body">
      <div id="saveStatus" class="sans" style="font-size:11.5px; color:var(--ink-soft); margin-bottom:14px;">—</div>
      <div class="plan-progress-wrap">
        <div class="plan-progress-label"><span>Fields answered</span><b><span id="pAnswered">0</span> / 16</b></div>
        <div class="plan-bar-track"><div class="plan-bar-fill" id="pBarAnswered"></div></div>
      </div>
      <div class="plan-progress-wrap">
        <div class="plan-progress-label"><span>Credits</span><b><span id="pCredits">0</span> / 24</b></div>
        <div class="plan-bar-track"><div class="plan-bar-fill" id="pBarCredits"></div></div>
      </div>
      <div class="plan-section-title">Semester A</div>
      <div id="planListA"></div>
      <div class="plan-section-title">Semester B</div>
      <div id="planListB"></div>
      <div id="planWarnings"></div>
    </div>
    <div class="plan-foot">
      <button id="planCopy" class="sans" style="width:100%; margin-bottom:8px; padding:10px; border-radius:20px; border:1px solid var(--cobalt); background:transparent; color:var(--cobalt); font-weight:700; font-size:12.5px; cursor:pointer;">Copy plan as text</button>
      <button id="planReset">Clear plan</button>
  </div>

<script>
(function(){
  var STORAGE_KEY = 'bezalel_year2_builder';
  var slotIds = [
    'A-mon','A-tue_am','A-tue_pm','A-wed_am','A-wed_pm','A-thu_am','A-thu_pm','A-mentor',
    'B-mon','B-tue_am','B-tue_pm','B-wed_am','B-wed_pm','B-thu_am','B-thu_pm','B-mentor',
    'B-flexible'
  ];
  var labels = {
    'A-mon':'Studio A · Mon 10:00–17:00', 'A-tue_am':'Tue AM · 10:00–13:00', 'A-tue_pm':'Tue PM · 14:00–17:00',
    'A-wed_am':'Wed AM · 10:00–13:00', 'A-wed_pm':'Wed PM · 14:00–17:00',
    'A-thu_am':'Thu AM · 10:00–13:00', 'A-thu_pm':'Thu PM · 14:00–17:00', 'A-mentor':'Mentor A',
    'B-mon':'Studio B · Mon 10:00–17:00', 'B-tue_am':'Tue AM · 10:00–13:00', 'B-tue_pm':'Tue PM · 14:00–17:00',
    'B-wed_am':'Wed AM · 10:00–13:00', 'B-wed_pm':'Wed PM · from 14:00',
    'B-thu_am':'Thu AM · 10:00–13:00', 'B-thu_pm':'Thu PM · 14:00–17:00', 'B-mentor':'Mentor B', 'B-flexible':'Untimed elective'
  };

  function selFor(slot){ return document.getElementById('sel-' + slot); }
  function descFor(slot){ return document.getElementById('desc-' + slot); }

  // Verified instructor background, gathered from official Bezalel faculty pages, artist
  // websites, galleries, and Wikipedia. Where no independent public bio could be verified,
  // the entry says so plainly rather than inventing one.
  var BIOS = {
    'Yosef Krispel': { bio:"Painter; Head of the Department of Fine Arts and of the M.F.A. program at Bezalel since 2006, with both his B.F.A. and M.F.A. from Bezalel. His paintings probe the painted surface itself — treating it as a mask, screen, or shell. Shown at the Tel Aviv Museum of Art, Palazzo Riccardo Medici (Florence), and Haifa Museum of Art; recipient of the Rappaport Young Artist Prize (2008) and a Ministry of Culture Award (2012).", link:"http://www.krispel.info", label:"krispel.info" },
    'Michal Helfman': { bio:"Multidisciplinary artist (b. 1973, Tel Aviv) working in sculpture, installation, video and drawing, often examining culture under political pressure. Represented Israel at the 2005 Venice Biennale; solo shows at the Tel Aviv Museum of Art, KW Institute Berlin, and the Felix Nussbaum Haus. Senior faculty at Bezalel since 2003.", link:"https://michalhelfman.com/", label:"michalhelfman.com" },
    'Yehudit Sasportas': { bio:"Senior professor at Bezalel since 1994, working between Tel Aviv and Berlin. Known for immersive, site-specific installations combining sculpture, drawing, video and sound. Represented Israel at the 2007 Venice Biennale (“The Guardians of the Threshold”); work held by the Israel Museum and MoMA.", link:"https://yehuditsasportas.com/", label:"yehuditsasportas.com" },
    'Gilad Ratman': { bio:"Video and installation artist (b. 1975, Haifa) exploring group behavior and the borders of the self. Represented Israel at the 2013 Venice Biennale with “The Workshop.” B.F.A. Bezalel, M.F.A. Columbia University.", link:"https://bravermangallery.com/artists/gilad-ratman-2/", label:"gallery page + CV" },
    'Eitan Ben‑Moshe': { bio:"Sculptor (b. 1971, Haifa) working in hybrid fusions of glass, plastic and crystal, often blurring digital fabrication with handmade material. B.F.A. Kalisher, postgraduate studies at Bezalel; also teaches at Shenkar College.", link:"https://www.alonsegev.com/artists/eitan-ben-moshe", label:"gallery bio" },
    'Hila Toni Navok': { bio:"Sculptor (b. 1974, Tel Aviv) who reworks everyday consumer and industrial materials into playful, colorful abstractions that probe modernist design. M.F.A. Bezalel (2009); permanent public sculptures at Jerusalem's central train station and on Tel Aviv's Al Parashat Derakhim Road.", link:"https://hillatoonynavok.com/", label:"hillatoonynavok.com" },
    'Maya Gold': { bio:"Painter living between Tel Aviv and Brussels; has taught in the Fine Arts department since 2007. Winner of the Young Artist Award from Israel's Ministry of Culture (2014); work held in museum and private collections internationally.", link:"http://www.mayagold.info/", label:"mayagold.info" },
    'Talya Israeli': { bio:"Painter (b. 1976, Jerusalem). B.F.A. Bezalel (2002, with honors), M.F.A. Goldsmiths, London (2005). Teaches painting at Bezalel since 2006; solo shows include the Ralli Museum Caesarea and Alon Segev Gallery, Tel Aviv.", link:"http://www.taliaisraeli.com/", label:"taliaisraeli.com" },
    'Avi Kritzman': { bio:"Printmaker and artist (b. 1983) working between Tel Aviv and London. B.F.A. Bezalel (2011, with honors), M.A. Royal College of Art (2014). Curator at Barbur Gallery, Jerusalem; recipient of the Rappaport Prize (2021, Tel Aviv Museum purchase award).", link:"http://abrahamkritzman.com/", label:"abrahamkritzman.com" },
    'Avi Sabah': { bio:"Painter and printmaker (b. 1977, Ma'alot Tarshiha). Graduated Bezalel with honors (2004) and has taught there since 2006. Co-founder of Barbur Art Gallery, Jerusalem; recipient of Bezalel's Outstanding Lecturer Award (2018) and a Ministry of Culture Award (2018).", link:"http://www.avisabah.com", label:"avisabah.com" },
    'Miri Segal': { bio:"New-media artist and senior lecturer; holds a Ph.D. in mathematics from the Hebrew University of Jerusalem. Solo exhibitions at MoMA PS1 (New York), Lisson Gallery (London), and Centre Pompidou (Paris); former head of the postgraduate Fine Art program at Hamidrasha.", link:"https://mirisegal.com/", label:"mirisegal.com" },
    'Gil Marco Sheni': { bio:"Painter and installation artist (b. 1968, Tel Aviv), listed at Bezalel as Gil Marco Shani. B.A. Bezalel (1994); winner of the Gottesdiener Foundation Award (2008) and the Sandberg Prize for Israeli Art (2018). Work held by the Tel Aviv Museum of Art and the Israel Museum.", link:"http://www.gilmarcoshani.com", label:"gilmarcoshani.com" },
    'Eyal Shashon': { bio:"Painter and lecturer, listed at Bezalel as Eyal Sasson. Graduated with honors from Bezalel's Fine Arts department; holds an M.A. from the Painting programme at the Royal College of Art, London.", link:"https://www.eyalsassonart.com/", label:"eyalsassonart.com" },
    'Irit Hamo': { bio:"Senior lecturer (b. 1961, Tel Aviv), listed at Bezalel as Irit Hemmo. Known for a multi-year project building room-scale paintings out of controlled dust storms from manipulated vacuum cleaners. Exhibited at the Istanbul Biennale and widely across Europe; work held by the Israel Museum and Tel Aviv Museum of Art.", link:"http://www.inga-gallery.com/artists/irit-hemmo", label:"gallery page" },
    'Prof. Irit Hamo': { biofrom:'Irit Hamo' },
    'Rami Maimon': { bio:"Photographer (b. 1976, Tel Aviv), listed at Bezalel as Rami Mimon. B.F.A./M.F.A. Bezalel and the Cooper Union, New York. Lecturer at Bezalel since 2002; solo exhibitions at the Tel Aviv Museum of Art and the Norton Museum of Art, Florida.", link:"http://www.ramimaymon.com/", label:"ramimaymon.com" },
    'Roni Karni': { bio:"Visual artist, listed at Bezalel as Ronny Carny. B.F.A. Bezalel (2006, with a prize for excellence), M.F.A. Bezalel (2011, highest honors). Known for wall paintings, two of which are permanently installed in New York City and Düsseldorf.", link:"https://www.ronnycarny.com/", label:"ronnycarny.com" },
    'Dor Zlekha Levy': { bio:"Multimedia artist working across audiovisual installation, video art, and live performance, with sound as a core element of his practice. Graduate of the Artport Residency Program; recipient of the Ministry of Culture Prize for a Young Artist (2017) and the Zoom Prize (2016).", link:"http://dorlevy.com/", label:"dorlevy.com" },
    'Ati Yaakobi Lil‑Or': { bio:"Painter (b. 1961, Jaffa), listed at Bezalel as Eti Jacobi. Studied art at Bezalel and Classical Studies and Philosophy at Tel Aviv University. Has exhibited since 1981, including a one-woman show at the Tel Aviv Museum of Art (1997); also teaches at Beit Berl's Hamidrasha.", link:"http://www.etijacobi.com/", label:"etijacobi.com" },
    'Orly Castel‑Bloom': { bio:"One of Israel's most prominent contemporary novelists, not primarily a visual artist — she teaches the creative-writing elective. Author of eleven books; her 1992 novel “Dolly City” is in UNESCO's Collection of Representative Works. Winner of the Sapir Prize (2015) and the Prime Minister's Prize (twice).", link:"https://en.wikipedia.org/wiki/Orly_Castel-Bloom", label:"Wikipedia" },
    'Talia Kinan': { bio:"Multidisciplinary artist and senior lecturer, likely the same person listed at Bezalel as Talia Keinan (the Hebrew name transliterates both ways). Outstanding graduate of Bezalel's Fine Arts department (2003); work combines sculpture, drawing, video and sound into installations she describes as autonomous, garden-like spaces.", link:"https://www.bezalel.ac.il/en/node/5768", label:"Bezalel faculty page" },
    'Talya Keenan': { biofrom:'Talia Kinan' },
    'Tamar Harpaz': { bio:"Artist represented by Sommer Contemporary Art, Tel Aviv, teaching the meeting-point tutorial and the concentrated “This Is It!” course.", link:"https://sommergallery.com/artists/tamar-harpaz​/", label:"gallery page" },
    // The following are confirmed current Bezalel Fine Arts faculty (verified against the
    // department's official staff directory) but no independent public bio was found for them.
    'Alona Friedberg': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Video & Sound and the meeting-point tutorial. No independent public bio found — see her official faculty page.", link:"https://www.bezalel.ac.il/en/node/5620", label:"Bezalel faculty page" },
    'Elham Rokni': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Video & Sound and the meeting-point tutorial. No independent public bio found — see her official faculty page.", link:"https://www.bezalel.ac.il/en/node/5913", label:"Bezalel faculty page" },
    'Eli Petel': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching the meeting-point tutorial and a 3D studio. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/5549", label:"Bezalel faculty page" },
    'Leah Avital': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Drawing, Sculpture, and Body Development. No independent public bio found — see her official faculty page.", link:"https://www.bezalel.ac.il/en/node/4047", label:"Bezalel faculty page" },
    'Lior Waterman': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Anatomy of the Magical Body and a Trans-Medium studio. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/4767", label:"Bezalel faculty page" },
    'Maayan Elikim': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Sculpture and the “An Object Is Born” studio. No independent public bio found — see her official faculty page.", link:"https://www.bezalel.ac.il/en/node/4175", label:"Bezalel faculty page" },
    'Masha Zusman': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching drawing electives including “On the Threshold of the Possible.” No independent public bio found — see her official faculty page.", link:"https://www.bezalel.ac.il/en/node/4841", label:"Bezalel faculty page" },
    'Nir Harel': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Digital Tools & New Media and Web Journals. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/4746", label:"Bezalel faculty page" },
    'Ohad Fishof': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Intro to Audio, Video & Sound, and Performance. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/5578", label:"Bezalel faculty page" },
    'Peter Melz': { bio:"Confirmed Bezalel Fine Arts faculty member, listed at Bezalel as Peter Maltz, teaching Relief, Outside: A Sculptural Journey, and the meeting-point tutorial. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/5261", label:"Bezalel faculty page" },
    'Raida Saadeh': { bio:"Confirmed Bezalel Fine Arts faculty member, listed at Bezalel as Raeda Saadeh, teaching Art from Household & Found Materials and Passage to Art. No independent public bio found — see her official faculty page.", link:"https://www.bezalel.ac.il/en/node/5461", label:"Bezalel faculty page" },
    'Ron Asulin': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Sculpture & Construction. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/662730", label:"Bezalel faculty page" },
    'Uri Nir': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Sabbath Eyes, the meeting-point tutorial, and “The Unique Voice” studio. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/5375", label:"Bezalel faculty page" },
    'Yoav Weinfeld': { bio:"Confirmed Bezalel Fine Arts faculty member, teaching Combustible Materials: Sketching. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/646132", label:"Bezalel faculty page" },
    'Zohar Gutesman': { bio:"Confirmed Bezalel Fine Arts faculty member, listed at Bezalel as Zohar Gotesman, teaching Stone Sculpture, Clay Modeling, and Molds & Casts. No independent public bio found — see his official faculty page.", link:"https://www.bezalel.ac.il/en/node/4506", label:"Bezalel faculty page" },
    // Genuinely not found on Bezalel's Fine Arts faculty roster or in web search — likely
    // guest instructors from a partner department (e.g. Ceramics & Glass Design).
    'Mor Afgin': { bio:null },
    'Tamir Erlich': { bio:null }
  };

  function resolveBio(name){
    var clean = name.replace(/^Prof\\.\\s*/, '');
    var entry = BIOS[name] || BIOS[clean];
    if(entry && entry.biofrom) entry = BIOS[entry.biofrom];
    return entry || null;
  }

  var bioToggleSeq = 0;

  function bioToggleHTML(instructorName){
    if(!instructorName) return '';
    var entry = resolveBio(instructorName);
    bioToggleSeq++;
    var id = 'bio-' + bioToggleSeq;
    if(!entry || !entry.bio){
      return '<button type="button" class="bio-toggle" onclick="var p=document.getElementById(\\'' + id + '\\');p.classList.toggle(\\'open\\');this.textContent=p.classList.contains(\\'open\\')?\\'▾ About ' + instructorName.replace(/'/g,"\\\\'") + '\\':\\'▸ About ' + instructorName.replace(/'/g,"\\\\'") + '\\';">▸ About ' + instructorName + '</button>' +
        '<div class="bio-panel" id="' + id + '"><span class="bio-missing">No verified public bio found for ' + instructorName + ' yet — they don’t appear on Bezalel’s Fine Arts faculty roster or in a web search. Worth asking the department directly.</span></div>';
    }
    var linkHtml = entry.link ? ' &middot; <a href="' + entry.link + '" target="_blank" rel="noopener">' + (entry.label || 'their work') + ' ↗</a>' : '';
    return '<button type="button" class="bio-toggle" onclick="var p=document.getElementById(\\'' + id + '\\');p.classList.toggle(\\'open\\');this.textContent=p.classList.contains(\\'open\\')?\\'▾ About ' + instructorName.replace(/'/g,"\\\\'") + '\\':\\'▸ About ' + instructorName.replace(/'/g,"\\\\'") + '\\';">▸ About ' + instructorName + '</button>' +
      '<div class="bio-panel" id="' + id + '">' + entry.bio + linkHtml + '</div>';
  }

  function updateDesc(slot){
    var sel = selFor(slot), d = descFor(slot);
    if(!sel || !d) return;
    var opt = sel.options[sel.selectedIndex];
    sel.classList.remove('unanswered','answered','skipped');
    if(sel.value === ''){
      d.innerHTML = '';
      if(sel.dataset.required === 'true') sel.classList.add('required','unanswered');
    } else if(sel.value === 'skip'){
      d.innerHTML = 'No elective taken this session.';
      sel.classList.add('skipped');
    } else {
      var instr = opt.dataset.instructor || '';
      var desc = opt.dataset.desc || '';
      var time = opt.dataset.time || '';
      var timeBit = time ? '<span style="color:var(--ochre); font-weight:700;">' + time + '</span>' + (instr ? ' &middot; ' : '') : '';
      d.innerHTML = timeBit + (instr ? '<b>' + instr + '</b> — ' : '') + desc + (instr ? bioToggleHTML(instr) : '');
      sel.classList.add('answered');
    }
  }

  function currentElectiveCount(excludeSlot){
    var count = 0;
    slotIds.forEach(function(slot){
      if(slot === excludeSlot) return;
      var sel = selFor(slot);
      if(sel && sel.dataset.kind === 'elective' && sel.value !== '' && sel.value !== 'skip') count++;
    });
    return count;
  }

  function titleOf(slot){
    var sel = selFor(slot);
    if(!sel) return '';
    if(sel.value === '') return 'not selected';
    if(sel.value === 'skip') return 'skipped';
    var opt = sel.options[sel.selectedIndex];
    var time = opt.dataset.time || '';
    return opt.text + (time ? ' (' + time + ')' : '');
  }

  function render(){
    var requiredSlots = slotIds.filter(function(s){ var sel = selFor(s); return sel && sel.dataset.required === 'true'; });
    var answered = requiredSlots.filter(function(s){ return selFor(s).value !== ''; }).length;
    var totalRequired = requiredSlots.length;

    var credits = 0, electivesChosen = 0;
    slotIds.forEach(function(slot){
      var sel = selFor(slot);
      if(!sel) return;
      var v = sel.value;
      if(v === '' || v === 'skip') return;
      if(sel.dataset.kind === 'studio') credits += 4;
      if(sel.dataset.kind === 'mentor') credits += 2;
      if(sel.dataset.kind === 'elective'){ credits += 2; electivesChosen++; }
    });
    credits += 2; // exhibition, fixed & automatic

    document.getElementById('statusAnswered').textContent = answered + ' / ' + totalRequired;
    document.getElementById('barAnswered').style.width = Math.min(100, answered/totalRequired*100) + '%';
    document.getElementById('statusElectives').textContent = electivesChosen + ' / 5';
    document.getElementById('barElectives').style.width = Math.min(100, electivesChosen/5*100) + '%';
    document.getElementById('statusCredits').textContent = credits + ' / 24';
    document.getElementById('barCredits').style.width = Math.min(100, credits/24*100) + '%';
    var doneA = answered >= totalRequired;
    document.getElementById('statusAnswered').classList.toggle('done', doneA);
    document.getElementById('statusElectives').classList.toggle('done', electivesChosen === 5);
    document.getElementById('statusCredits').classList.toggle('done', credits >= 24);

    document.getElementById('fabCredits').textContent = credits;
    document.getElementById('pAnswered').textContent = answered;
    document.getElementById('pBarAnswered').style.width = Math.min(100, answered/totalRequired*100) + '%';
    document.getElementById('pCredits').textContent = credits;
    document.getElementById('pBarCredits').style.width = Math.min(100, credits/24*100) + '%';

    function fill(container, prefix){
      container.innerHTML = '';
      slotIds.filter(function(s){ return s.indexOf(prefix + '-') === 0 && s !== 'B-flexible'; }).forEach(function(slot){
        var row = document.createElement('div');
        row.className = 'plan-row';
        row.innerHTML = '<span class="plan-label">' + labels[slot] + '</span><span class="plan-value">' + titleOf(slot) + '</span>';
        container.appendChild(row);
      });
    }
    fill(document.getElementById('planListA'), 'A');
    fill(document.getElementById('planListB'), 'B');
    if(selFor('B-flexible') && selFor('B-flexible').value){
      var row = document.createElement('div');
      row.className = 'plan-row';
      row.innerHTML = '<span class="plan-label">Untimed elective</span><span class="plan-value">' + titleOf('B-flexible') + '</span>';
      document.getElementById('planListB').appendChild(row);
    }
    var exRow = document.createElement('div');
    exRow.className = 'plan-row';
    exRow.innerHTML = '<span class="plan-label">Exhibition</span><span class="plan-value">included — 2 cr</span>';
    document.getElementById('planListB').appendChild(exRow);

    var warn = document.getElementById('planWarnings');
    var lines = [];
    if(answered < totalRequired) lines.push('<div class="warn-line">⚠ ' + (totalRequired - answered) + ' required field(s) still unanswered.</div>');
    if(electivesChosen < 5) lines.push('<div class="warn-line">⚠ ' + (5 - electivesChosen) + ' more elective(s) needed.</div>');
    if(electivesChosen > 5) lines.push('<div class="warn-line">⚠ Too many electives selected — remove one.</div>');
    warn.innerHTML = lines.length ? lines.join('') : '<div class="ok-line">✓ Complete — 24/24 credits, all requirements met.</div>';
  }

  function setStatus(text, tone){
    var el = document.getElementById('saveStatus');
    if(!el) return;
    el.textContent = text;
    el.style.color = tone === 'bad' ? 'var(--red)' : (tone === 'good' ? 'var(--green)' : 'var(--ink-soft)');
  }

  function currentStateObj(){
    var state = {};
    slotIds.forEach(function(slot){ var sel = selFor(slot); if(sel) state[slot] = sel.value; });
    return state;
  }

  var saveRetryTimer = null;
  var saveAttempt = 0;

  function saveState(){
    clearTimeout(saveRetryTimer);
    saveAttempt = 0;
    attemptSave();
  }

  function attemptSave(){
    setStatus('Saving…');
    var state = currentStateObj();
    var payload;
    try{ payload = JSON.stringify(state); }
    catch(e){ setStatus('Could not prepare plan for saving.', 'bad'); return; }

    try{
      window.localStorage.setItem(STORAGE_KEY, payload);
      saveAttempt = 0;
      setStatus('Saved just now ✓', 'good');
    }catch(e){
      saveAttempt++;
      if(saveAttempt <= 2){
        setStatus('Autosave hit a snag — retrying…', 'bad');
        saveRetryTimer = setTimeout(attemptSave, 2500);
      } else {
        setStatus('Autosave is unavailable right now. Your picks are still on screen — use "Copy plan as text" below so nothing is lost if you reload.', 'bad');
      }
    }
  }

  function loadState(){
    setStatus('Loading your saved plan…');
    try{
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if(raw){
        try{
          var state = JSON.parse(raw);
          slotIds.forEach(function(slot){
            var sel = selFor(slot);
            if(sel && state[slot] !== undefined) sel.value = state[slot];
            updateDesc(slot);
          });
          setStatus('Loaded your saved plan.', 'good');
        }catch(e){ slotIds.forEach(updateDesc); setStatus('Starting fresh.'); }
      } else {
        slotIds.forEach(updateDesc);
        setStatus('Starting fresh — nothing saved yet.');
      }
      render();
    }catch(e){
      slotIds.forEach(updateDesc);
      setStatus('Could not reach saved data — starting fresh. Autosave will still try going forward.', 'bad');
      render();
    }
  }

  function planAsText(){
    var lines = ['Bezalel Fine Arts — Year Two Plan', ''];
    lines.push('SEMESTER A');
    ['A-mon','A-tue_am','A-tue_pm','A-wed_am','A-wed_pm','A-thu_am','A-thu_pm','A-mentor'].forEach(function(s){
      lines.push('  ' + labels[s] + ': ' + titleOf(s));
    });
    lines.push('', 'SEMESTER B');
    ['B-mon','B-tue_am','B-tue_pm','B-wed_am','B-wed_pm','B-thu_am','B-thu_pm','B-mentor','B-flexible'].forEach(function(s){
      lines.push('  ' + labels[s] + ': ' + titleOf(s));
    });
    return lines.join('\\n');
  }

  slotIds.forEach(function(slot){
    var sel = selFor(slot);
    if(!sel) return;
    sel.addEventListener('change', function(){
      if(sel.dataset.kind === 'elective' && sel.value !== '' && sel.value !== 'skip'){
        var others = currentElectiveCount(slot);
        if(others >= 5){
          alert('You already have 5 electives selected. Set another slot to "Skip this session" first, or choose "Skip" here.');
          sel.value = '';
          updateDesc(slot);
          render();
          saveState();
          return;
        }
      }
      updateDesc(slot);
      render();
      saveState();
    });
  });

  document.getElementById('planFab').addEventListener('click', function(){
    document.getElementById('planPanel').classList.toggle('open');
  });
  document.getElementById('planClose').addEventListener('click', function(){
    document.getElementById('planPanel').classList.remove('open');
  });
  document.getElementById('planReset').addEventListener('click', function(){
    if(confirm('Clear your whole plan?')){
      slotIds.forEach(function(slot){ var sel = selFor(slot); if(sel) sel.value = ''; updateDesc(slot); });
      render();
      saveState();
    }
  });

  document.getElementById('planCopy').addEventListener('click', function(){
    var text = planAsText();
    var btn = document.getElementById('planCopy');
    var revert = function(label, ms){ setTimeout(function(){ btn.textContent = 'Copy plan as text'; }, ms || 1800); btn.textContent = label; };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){
        revert('Copied ✓');
      }).catch(function(){
        window.prompt('Copy failed automatically — select and copy manually:', text);
      });
    } else {
      window.prompt('Select and copy your plan:', text);
    }
  });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadState);
  } else {
    loadState();
  }
})();
</script>

</body>
</html>
`;

export function GET() {
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
