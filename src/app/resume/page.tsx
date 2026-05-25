import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Noah BenEzra | Salesforce Developer",
  description: "Salesforce Developer II / Tech Lead — Resume of Noah BenEzra",
};

// Salesforce Lightning Design System color tokens
const C = {
  brandDark:    "#032D60",
  brand:        "#0176D3",
  brandLight:   "#1B96FF",
  brandLighter: "#D8EDFF",
  white:        "#FFFFFF",
  bg:           "#F3F2F2",
  border:       "#DDDBDA",
  text:         "#3E3E3C",
  textWeak:     "#706E6B",
  success:      "#2E844A",
  successBg:    "#EFF7EE",
  successBorder:"#9FC9A6",
  purple:       "#5A1BA9",
  purpleBg:     "#F4F0FF",
  purpleBorder: "#C9B1F5",
  orange:       "#7E4F00",
  orangeBg:     "#FEF7E4",
  orangeBorder: "#F5D89C",
  neutral:      "#706E6B",
  neutralBg:    "#F3F2F2",
  neutralBorder:"#DDDBDA",
};

function CloudIcon({ size = 36 }: { size?: number }) {
  // Stylized cloud shape inspired by SLDS
  const h = Math.round(size * 0.65);
  return (
    <svg width={size} height={h} viewBox="0 0 100 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M42 10.5C45.7 6.5 51 4 56.8 4c7.7 0 14.4 4.3 17.9 10.7 3.2-1.5 6.7-2.3 10.4-2.3 13.7 0 24.9 11.4 24.9 25.4S98.8 63.2 85.1 63.2c-1.6 0-3.1-.2-4.6-.4-3.3 5.7-9.3 9.5-16.3 9.5-2.9 0-5.6-.7-8-2.1-3.3 7.2-10.4 12.2-18.8 12.2-9 0-16.7-5.6-19.8-13.6-1.4.3-2.9.5-4.5.5C5.8 69.3 0 62 0 53.4c0-6 3.3-11.2 8.1-13.9-.7-2.1-.9-4.3-.9-6.5C7.2 17.5 17.3 7.2 29.8 7.2c4.7 0 9 1.4 12.8 3.8L42 10.5z"
        fill="white"
      />
    </svg>
  );
}

function IconWrapper({ children, color = C.brand }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: "24px", height: "24px", borderRadius: "4px",
      backgroundColor: color + "1A", flexShrink: 0,
    }}>{children}</span>
  );
}

function ContactSvg() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={C.brand}><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>;
}
function SkillsSvg() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={C.brand}><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>;
}
function ToolsSvg() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={C.brand}><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>;
}
function EducationSvg() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={C.brand}><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>;
}
function ExperienceSvg() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={C.brand}><path d="M20 6h-2.18c.07-.44.18-.87.18-1.33C18 3.04 15.96 1 13.5 1c-1.3 0-2.43.52-3.27 1.35L12 4.12l1.77-1.77C14.27 2.13 14.87 2 15.5 2c1.38 0 2.5 1.12 2.5 2.5 0 .53-.17 1.01-.43 1.42L4 6c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 13H4V8h16v11z"/></svg>;
}
function AboutSvg() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={C.brand}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>;
}

function Card({
  title, icon, children,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: "4px",
      boxShadow: "0 2px 2px rgba(0,0,0,.1)",
      overflow: "hidden",
    }}>
      {title && (
        <div style={{
          padding: "10px 16px",
          borderBottom: `3px solid ${C.brand}`,
          display: "flex", alignItems: "center", gap: "8px",
          backgroundColor: "#FAFAF9",
        }}>
          {icon && <IconWrapper>{icon}</IconWrapper>}
          <h2 style={{
            fontSize: "12px", fontWeight: 700, color: C.text,
            textTransform: "uppercase", letterSpacing: "0.08em", margin: 0,
          }}>{title}</h2>
        </div>
      )}
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

function Badge({
  label, color = "blue",
}: {
  label: string;
  color?: "blue" | "green" | "purple" | "orange" | "neutral";
}) {
  const palette = {
    blue:    { bg: C.brandLighter, text: C.brand,   border: "#9FC9F3" },
    green:   { bg: C.successBg,    text: C.success,  border: C.successBorder },
    purple:  { bg: C.purpleBg,     text: C.purple,   border: C.purpleBorder },
    orange:  { bg: C.orangeBg,     text: C.orange,   border: C.orangeBorder },
    neutral: { bg: C.neutralBg,    text: C.neutral,  border: C.neutralBorder },
  };
  const p = palette[color];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: "12px",
      fontSize: "11px", fontWeight: 700,
      backgroundColor: p.bg, color: p.text,
      border: `1px solid ${p.border}`,
      letterSpacing: "0.03em", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{
        fontSize: "11px", fontWeight: 700, color: C.textWeak,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px",
      }}>{label}</div>
      <div style={{ fontSize: "13px", color: C.text }}>{value}</div>
    </div>
  );
}

function TimelineItem({
  year, company, title, description, bullets,
}: {
  year: string; company: string; title: string; description: string; bullets: string[];
}) {
  return (
    <div style={{ display: "flex", gap: "16px", marginBottom: "4px" }}>
      {/* Marker + line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: "14px", height: "14px", borderRadius: "50%",
          backgroundColor: C.brand, border: `2px solid ${C.white}`,
          boxShadow: `0 0 0 2px ${C.brand}`, marginTop: "3px",
        }} />
        <div style={{ width: "2px", flex: 1, backgroundColor: C.border, minHeight: "32px", marginTop: "4px" }} />
      </div>
      {/* Content */}
      <div style={{ flex: 1, paddingBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: C.text }}>{title}</div>
            <div style={{ fontSize: "13px", color: C.brand, fontWeight: 600, marginTop: "2px" }}>{company}</div>
          </div>
          <span style={{
            fontSize: "11px", fontWeight: 700, color: C.white,
            backgroundColor: C.brand, padding: "2px 10px",
            borderRadius: "12px", whiteSpace: "nowrap", flexShrink: 0,
          }}>{year}</span>
        </div>
        <p style={{ fontSize: "13px", color: C.textWeak, margin: "10px 0 8px", lineHeight: "1.65" }}>{description}</p>
        <ul style={{ margin: 0, paddingLeft: "18px" }}>
          {bullets.map((b) => (
            <li key={b} style={{ fontSize: "12px", color: C.textWeak, marginBottom: "5px", lineHeight: "1.5" }}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ResumePage() {
  return (
    <>
      <style>{`
        body { margin: 0; }
        .resume-layout { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
        .metrics-strip { display: flex; gap: 40px; flex-wrap: wrap; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; padding-bottom: 28px; }
        @media (max-width: 900px) {
          .resume-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .metrics-strip { gap: 20px; }
        }
        @media print {
          nav, .no-print { display: none !important; }
          .resume-layout { grid-template-columns: 240px 1fr; }
          body { background: white; }
        }
      `}</style>

      <div style={{ fontFamily: "system-ui, 'Helvetica Neue', Arial, sans-serif", backgroundColor: C.bg, minHeight: "100vh" }}>

        {/* ── SALESFORCE APP BAR ── */}
        <nav style={{
          backgroundColor: C.brandDark, height: "52px",
          display: "flex", alignItems: "center", padding: "0 24px", gap: "12px",
          position: "sticky", top: 0, zIndex: 50,
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        }}>
          <CloudIcon size={38} />
          <div style={{ width: "1px", height: "24px", backgroundColor: "rgba(255,255,255,0.25)" }} />
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px", fontWeight: 600, letterSpacing: "0.02em" }}>
            BenEzra Cloud
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", margin: "0 4px" }}>›</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>Contacts</span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", margin: "0 4px" }}>›</span>
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px" }}>Noah BenEzra</span>
          <div style={{ flex: 1 }} />
          <a href="mailto:benezra.noah@gmail.com" className="no-print" style={{
            fontSize: "12px", color: "rgba(255,255,255,0.7)", textDecoration: "none",
            padding: "4px 10px", borderRadius: "4px",
            border: "1px solid rgba(255,255,255,0.2)",
          }}>benezra.noah@gmail.com</a>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%", backgroundColor: C.brand,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontWeight: 700, fontSize: "12px", letterSpacing: "0.05em",
            flexShrink: 0,
          }}>NB</div>
        </nav>

        {/* ── RECORD HEADER (Object Banner) ── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.brandDark} 0%, ${C.brand} 100%)`,
          padding: "28px 32px 0",
          color: C.white,
        }}>
          {/* Sub-breadcrumb */}
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "16px", letterSpacing: "0.04em" }}>
            CONTACT RECORD
          </div>

          {/* Avatar + name + actions row */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{
              width: "84px", height: "84px", borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.18)",
              border: "3px solid rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px", fontWeight: 800, color: C.white,
              flexShrink: 0, marginBottom: "-22px", letterSpacing: "0.05em",
            }}>NB</div>

            {/* Name + meta */}
            <div style={{ paddingBottom: "24px", flex: 1, minWidth: "200px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: C.white }}>
                  Noah BenEzra
                </h1>
                <span style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.45)",
                  color: C.white, padding: "3px 10px", borderRadius: "12px",
                }}>SALESFORCE DEVELOPER II</span>
              </div>
              <div style={{ marginTop: "8px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
                {[
                  ["Current Company", "Community Brands"],
                  ["Experience", "7+ Years"],
                  ["Location", "Israel"],
                ].map(([lbl, val]) => (
                  <span key={lbl} style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>{lbl}: </span>{val}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="header-actions no-print">
              <a href="mailto:benezra.noah@gmail.com" style={{
                padding: "8px 18px", borderRadius: "4px",
                backgroundColor: C.white, color: C.brand,
                fontSize: "13px", fontWeight: 600, textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: "6px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }}>✉&nbsp; Email</a>
              <a href="tel:+9720585925578" style={{
                padding: "8px 18px", borderRadius: "4px",
                backgroundColor: "rgba(255,255,255,0.15)",
                color: C.white, fontSize: "13px", fontWeight: 600,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.4)",
              }}>☎&nbsp; Call</a>
              <a href="https://www.benezras.com/noah" target="_blank" rel="noopener noreferrer" style={{
                padding: "8px 18px", borderRadius: "4px",
                backgroundColor: "rgba(255,255,255,0.15)",
                color: C.white, fontSize: "13px", fontWeight: 600,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.4)",
              }}>⬡&nbsp; Website</a>
            </div>
          </div>

          {/* Highlight metrics strip */}
          <div style={{
            backgroundColor: "rgba(0,0,0,0.15)",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            marginLeft: "-32px", marginRight: "-32px",
            padding: "14px 32px",
          }}>
            <div className="metrics-strip">
              {[
                { label: "Clients Served",  value: "30+" },
                { label: "Users Managed",   value: "100K+" },
                { label: "Years Experience",value: "7+" },
                { label: "Team Mentored",   value: "Yes" },
                { label: "Utilization",     value: "85%+" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: C.white, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "4px" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN RECORD LAYOUT ── */}
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 24px 56px" }}>
          <div className="resume-layout">

            {/* ── LEFT COLUMN — Details Pane ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Contact */}
              <Card title="Contact Information" icon={<ContactSvg />}>
                <DetailField label="Phone" value={
                  <a href="tel:+9720585925578" style={{ color: C.brand, textDecoration: "none", fontWeight: 500 }}>
                    (058) 592-5578
                  </a>
                } />
                <DetailField label="Email" value={
                  <a href="mailto:benezra.noah@gmail.com" style={{ color: C.brand, textDecoration: "none", fontWeight: 500 }}>
                    benezra.noah@gmail.com
                  </a>
                } />
                <DetailField label="Website" value={
                  <a href="https://www.benezras.com/noah" target="_blank" rel="noopener noreferrer"
                    style={{ color: C.brand, textDecoration: "none", fontWeight: 500 }}>
                    www.benezras.com/noah
                  </a>
                } />
              </Card>

              {/* Programming Languages */}
              <Card title="Programming Languages" icon={<SkillsSvg />}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <Badge label="Python"     color="blue" />
                  <Badge label="Java"       color="orange" />
                  <Badge label="JavaScript" color="purple" />
                  <Badge label="HTML"       color="orange" />
                  <Badge label="CSS"        color="blue" />
                  <Badge label="Apex"       color="purple" />
                  <Badge label="SOQL"       color="blue" />
                </div>
              </Card>

              {/* Salesforce Expertise */}
              <Card title="Salesforce Expertise" icon={<ToolsSvg />}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <Badge label="Apex"               color="blue" />
                  <Badge label="LWC"                color="purple" />
                  <Badge label="Aura"               color="blue" />
                  <Badge label="Flows"              color="green" />
                  <Badge label="SOQL"               color="blue" />
                  <Badge label="REST APIs"          color="purple" />
                  <Badge label="Nonprofit SP"       color="green" />
                  <Badge label="Experience Cloud"   color="blue" />
                  <Badge label="Sales Cloud"        color="neutral" />
                  <Badge label="Service Cloud"      color="neutral" />
                </div>
              </Card>

              {/* Software & Tools */}
              <Card title="Software & Tools" icon={<ToolsSvg />}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <Badge label="Salesforce"  color="blue" />
                  <Badge label="WordPress"   color="purple" />
                  <Badge label="Elementor"   color="orange" />
                  <Badge label="G Suite"     color="green" />
                  <Badge label="Office 365"  color="blue" />
                  <Badge label="JIRA"        color="neutral" />
                  <Badge label="ZOHO CRM"    color="neutral" />
                </div>
              </Card>

              {/* Education */}
              <Card title="Education" icon={<EducationSvg />}>
                {[
                  { school: "Landers College for Men",     location: "New York, NY" },
                  { school: "Yeshiva Darche Torah",        location: "Far Rockaway, NY" },
                  { school: "Yeshiva Shaarie Tevuna",      location: "Jerusalem, Israel" },
                ].map(({ school, location }, i, arr) => (
                  <div key={school} style={{
                    marginBottom: i < arr.length - 1 ? "14px" : "0",
                    paddingBottom: i < arr.length - 1 ? "14px" : "0",
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>{school}</div>
                    <div style={{ fontSize: "12px", color: C.textWeak, marginTop: "2px" }}>{location}</div>
                  </div>
                ))}
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "11px", color: C.textWeak, fontStyle: "italic" }}>
                    References available upon request.
                  </div>
                </div>
              </Card>
            </div>

            {/* ── RIGHT COLUMN — Activity + Experience ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* About */}
              <Card title="About" icon={<AboutSvg />}>
                <p style={{ fontSize: "14px", color: C.textWeak, lineHeight: "1.75", margin: 0 }}>
                  IT specialist with <strong style={{ color: C.text }}>7+ years of experience</strong> developing
                  and implementing solutions for associations and non-profits. From CRM system setup and
                  administration to web design and custom checkout processes, I have helped organizations
                  enhance their external digital presence while increasing internal efficiency through
                  technology.
                </p>
              </Card>

              {/* Work Experience — SLDS Activity Timeline */}
              <Card title="Work Experience" icon={<ExperienceSvg />}>
                <div style={{ paddingTop: "8px" }}>
                  <TimelineItem
                    year="2022 – Present"
                    company="Community Brands"
                    title="Salesforce Developer II / Tech Lead"
                    description="Created innovative solutions for large associations and non-profits. Led a team of developers with full accountability for complex implementations, leveraging both declarative and programmatic tooling to drive efficiency, increase revenue, and deliver full-featured user experiences."
                    bullets={[
                      "Worked with 30+ clients across diverse association and non-profit sectors",
                      "Managed Salesforce instances with 100,000+ active users",
                      "Mentored junior developers and set technical architecture standards",
                      "Consistently maintained 85%+ billable utilization rate",
                      "Expert in Flows, Apex, Aura, LWC, JavaScript, and SOQL",
                    ]}
                  />
                  <TimelineItem
                    year="2020 – 2022"
                    company="David Shapell College of Talmudic Studies"
                    title="Technical Director"
                    description="Completed full redevelopment of web and digital presence during COVID-19. Built and deployed a custom Salesforce instance with the Non-Profit Starter Pack, fully integrated with all existing infrastructure."
                    bullets={[
                      "Created a custom Salesforce platform tailored for non-profit operations",
                      "Led entire staff transition to remote work during the COVID-19 crisis",
                      "Doubled website traffic within 2 years via analytics-driven optimization",
                      "Managed all graphic design, branding kits, and external marketing",
                      "Owned weekly newsletter and external donor communications",
                    ]}
                  />
                  <TimelineItem
                    year="2018 – 2020"
                    company="Avery Steinberg Esq."
                    title="IT Specialist"
                    description="Designed and managed WordPress websites and created custom CRM solutions for multiple ventures. Developed a Python-based foreclosure web scraper using multiple API integrations to assess property values."
                    bullets={[
                      "Built multiple custom ZOHO CRM systems for business operations",
                      "Wrote and maintained custom REST API integrations",
                      "Developed Python scrapers to automate lead generation workflows",
                      "Maintained office network infrastructure and VOIP system",
                      "Designed and managed all WordPress website properties",
                    ]}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          backgroundColor: C.brandDark, padding: "18px 32px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CloudIcon size={24} />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
              Powered by BenEzra Cloud
            </span>
          </div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {[
              { href: "mailto:benezra.noah@gmail.com", label: "benezra.noah@gmail.com" },
              { href: "tel:+9720585925578",            label: "(058) 592-5578" },
              { href: "https://www.benezras.com/noah", label: "www.benezras.com/noah" },
            ].map(({ href, label }) => (
              <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
