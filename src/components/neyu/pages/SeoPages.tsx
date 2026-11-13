"use client";

// Search landing pages and Health Answers articles. Client component (it uses the
// Neyu kit), but fully rendered on the server, so
// search engines and AI assistants can read every
// word; interactive bits (Ask Neyu, CTA band) come from the Neyu kit.
import React from "react";
import { N, wrapN, cardN, btn, gradText, leadN, eyebrowN, Section, Kicker, NeyuReads, CtaBand } from "@/components/neyu/kit";
import type { Landing } from "@/data/seoLanding";
import { LANDINGS } from "@/data/seoLanding";
import { HEALTH_ANSWERS, HA_TOPICS, REVIEWER, UPDATED, type HealthAnswer } from "@/data/healthAnswers";

const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const isExternal = (href: string) => /^https?:/.test(href);
const linkProps = (href: string) => (isExternal(href) ? { href, target: "_blank", rel: "noopener" } : { href });

function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 13.5, color: N.muted }}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: "flex", gap: 6 }}>
            {it.href ? <a href={it.href} style={{ color: N.tealText }}>{it.label}</a> : <span aria-current="page">{it.label}</span>}
            {i < items.length - 1 && <span aria-hidden>›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((f) => (
        <details key={f.q} style={{ ...cardN, borderRadius: 18, padding: "16px 20px" }}>
          <summary style={{ cursor: "pointer", fontSize: 17, fontWeight: 500, color: N.ink, lineHeight: 1.4 }}>{f.q}</summary>
          <p style={{ margin: "10px 0 0", fontSize: 15.5, lineHeight: 1.6, color: N.ink2 }}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

function LinkCards({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 12 }}>
      {links.map((l) => (
        <a key={l.href + l.label} {...linkProps(l.href)} style={{ ...cardN, borderRadius: 18, padding: "16px 18px", textDecoration: "none", color: N.ink, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", fontSize: 15.5 }}>
          <span>{l.label}</span><span aria-hidden style={{ color: N.blue }}>→</span>
        </a>
      ))}
    </div>
  );
}

/* ───────────────────────── Service landing page ───────────────────────── */

export function LandingPage({ d }: { d: Landing }) {
  return (
    <>
      <section style={{ position: "relative", padding: "clamp(40px,7vw,96px) 0 clamp(32px,5vw,64px)", background: "radial-gradient(900px 480px at 90% 0%, rgba(42,132,228,.10), transparent 60%), radial-gradient(800px 500px at 0% 30%, rgba(60,199,158,.10), transparent 60%)" }}>
        <div style={{ ...wrapN, display: "grid", gap: 18, maxWidth: 960 }}>
          <Crumbs items={[{ label: "Home", href: "/" }, { label: d.h1 }]} />
          <Kicker label={d.kicker} badge="" />
          <h1 style={{ margin: 0, fontSize: "clamp(36px,5.4vw,68px)", lineHeight: 1.02, letterSpacing: "-.04em", fontWeight: 500, color: N.ink }}>{d.h1}</h1>
          <p style={{ ...leadN, margin: 0, maxWidth: 820 }}>{d.answer}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 12, maxWidth: 720 }}>
            {d.highlights.map((h) => (
              <div key={h.l} style={{ display: "grid", gap: 2 }}>
                <b style={{ fontWeight: 400, fontSize: "clamp(28px,3.4vw,40px)", letterSpacing: "-.03em", lineHeight: 1.1, ...gradText }}>{h.v}</b>
                <span style={{ fontSize: 14, color: N.muted }}>{h.l}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a {...linkProps(d.primary.href)} style={btn("grad")}>{d.primary.label} →</a>
            {d.secondary && <a {...linkProps(d.secondary.href)} style={btn("ghost")}>{d.secondary.label}</a>}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: N.muted }}>{d.where}</p>
        </div>
      </section>

      <Section tone="white" label="Items" eyebrow={d.kicker} title={d.itemsTitle} lead={d.itemsNote}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 14 }}>
          {d.items.map((it) => (
            <article key={it.name} style={{ ...cardN, borderRadius: 20, padding: 20, display: "grid", gap: 8, alignContent: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                {it.meta && <span style={{ fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", color: N.tealText, fontWeight: 600 }}>{it.meta}</span>}
                {it.price && <span style={{ fontSize: 18, fontWeight: 500, color: N.ink, marginLeft: "auto" }}>{it.price}</span>}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, lineHeight: 1.3, color: N.ink }}>{it.name}</h3>
              {it.text && <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}>{it.text}</p>}
            </article>
          ))}
        </div>
      </Section>

      <Section label="Steps" eyebrow="How it works" title="Four simple steps.">
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 12 }}>
          {d.steps.map((s, i) => (
            <li key={s.t} style={{ ...cardN, borderRadius: 20, padding: 20, display: "grid", gap: 6 }}>
              <span style={{ ...eyebrowN }}>Step {i + 1}</span>
              <b style={{ fontWeight: 500, fontSize: 18 }}>{s.t}</b>
              <span style={{ fontSize: 14.5, lineHeight: 1.55, color: N.ink2 }}>{s.d}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="white" label="FAQ" eyebrow="Questions" title="Frequently asked questions.">
        <Faq items={d.faq} />
      </Section>

      <Section label="Related" eyebrow="Related" title="Keep exploring.">
        <LinkCards links={d.related} />
      </Section>

      <CtaBand title={d.primary.label} text={d.answer.split(". ")[0] + "."} primary={d.primary} secondary={{ label: "Ask Neyu", alba: `Tell me about ${d.h1.toLowerCase()} at NEYU Health.` }} />
    </>
  );
}

/* ───────────────────────── Health Answers ───────────────────────── */

function Byline() {
  return (
    <p style={{ margin: 0, fontSize: 14, color: N.muted, lineHeight: 1.5 }}>
      {REVIEWER.name
        ? <>Medically reviewed by <b style={{ fontWeight: 600, color: N.ink2 }}>{REVIEWER.name}</b>{REVIEWER.title ? `, ${REVIEWER.title}` : ""} · {fmtDate(REVIEWER.date || UPDATED)}</>
        : <>Written by NEYU Health · Updated {fmtDate(UPDATED)}</>}
    </p>
  );
}

export function HealthAnswerPage({ a }: { a: HealthAnswer }) {
  const related = HEALTH_ANSWERS.filter((x) => x.topic === a.topic && x.slug !== a.slug).slice(0, 4);
  const h2: React.CSSProperties = { margin: 0, fontSize: "clamp(22px,2.4vw,28px)", fontWeight: 500, letterSpacing: "-.02em", color: N.ink };
  const p: React.CSSProperties = { margin: 0, fontSize: 17, lineHeight: 1.7, color: N.ink2 };
  return (
    <>
      <article style={{ padding: "clamp(36px,6vw,80px) 0 clamp(24px,4vw,48px)" }}>
        <div style={{ ...wrapN, maxWidth: 820, display: "grid", gap: 22 }}>
          <Crumbs items={[{ label: "Home", href: "/" }, { label: "Health Answers", href: "/health-answers" }, { label: a.q }]} />
          <Kicker label={a.topic} badge="" />
          <h1 style={{ margin: 0, fontSize: "clamp(32px,4.6vw,56px)", lineHeight: 1.05, letterSpacing: "-.035em", fontWeight: 500, color: N.ink }}>{a.q}</h1>
          <Byline />

          <section aria-label="Short answer" style={{ ...cardN, borderRadius: 22, padding: "clamp(18px,3vw,26px)", background: N.soft, display: "grid", gap: 8 }}>
            <span style={{ ...eyebrowN }}>Short answer</span>
            <p style={{ ...p, color: N.ink, fontSize: 18 }}>{a.answer}</p>
          </section>

          {a.sections.map((s) => (
            <section key={s.h} style={{ display: "grid", gap: 10 }}>
              <h2 style={h2}>{s.h}</h2>
              {s.p?.map((t, i) => <p key={i} style={p}>{t}</p>)}
              {s.list && <ul style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 6, ...p }}>{s.list.map((t) => <li key={t}>{t}</li>)}</ul>}
            </section>
          ))}

          {a.urgent && (
            <section role="note" aria-label="When to call 911" style={{ borderRadius: 18, padding: "16px 20px", background: "#FBEDEA", border: "1px solid #F1C8BF", display: "grid", gap: 6 }}>
              <b style={{ color: "#8B2F1C", fontWeight: 600 }}>When to call 911</b>
              <p style={{ ...p, color: "#5E2214", fontSize: 16 }}>{a.urgent}</p>
            </section>
          )}

          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={h2}>When to see a doctor</h2>
            <ul style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 6, ...p }}>{a.seeDoctor.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>

          <section style={{ display: "grid", gap: 12 }}>
            <h2 style={h2}>How NEYU Health can help</h2>
            <LinkCards links={a.links} />
          </section>

          <NeyuReads title="Ask Neyu" text="Neyu, NEYU Health's AI companion, can explain this in more detail. It gives general information and never diagnoses." ask={a.q} />

          <section style={{ display: "grid", gap: 12 }}>
            <h2 style={h2}>Frequently asked questions</h2>
            <Faq items={a.faq} />
          </section>

          <p style={{ margin: 0, fontSize: 13.5, color: N.muted, lineHeight: 1.6 }}>
            This article is general health information, not medical advice or a diagnosis. Talk to your doctor about your own situation. In an emergency, call 911. For nurse advice in Alberta, call Health Link 811.
          </p>

          {related.length > 0 && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={h2}>Related questions</h2>
              <LinkCards links={related.map((r) => ({ label: r.q, href: `/health-answers/${r.slug}` }))} />
            </section>
          )}
        </div>
      </article>
      <CtaBand title="Get your questions answered" text="Book a virtual visit with a NEYU physician, or keep all your results in one place in My Health Space." primary={{ label: "Book a virtual visit", href: "/virtual-care" }} secondary={{ label: "Ask Neyu", alba: a.q }} />
    </>
  );
}

export function HealthAnswersIndex() {
  return (
    <>
      <section style={{ padding: "clamp(40px,7vw,96px) 0 clamp(24px,4vw,48px)" }}>
        <div style={{ ...wrapN, display: "grid", gap: 18, maxWidth: 960 }}>
          <Crumbs items={[{ label: "Home", href: "/" }, { label: "Health Answers" }]} />
          <Kicker label="Health Answers" badge="" />
          <h1 style={{ margin: 0, fontSize: "clamp(36px,5.4vw,68px)", lineHeight: 1.02, letterSpacing: "-.04em", fontWeight: 500, color: N.ink }}>Clear answers to <span style={gradText}>common health questions.</span></h1>
          <p style={{ ...leadN, margin: 0 }}>Plain-language answers about heart symptoms, blood pressure, tests, genetics and longevity from NEYU Health in Calgary, with when to see a doctor and when to call 911.</p>
        </div>
      </section>
      {HA_TOPICS.map((t) => {
        const xs = HEALTH_ANSWERS.filter((a) => a.topic === t);
        if (!xs.length) return null;
        return (
          <Section key={t} tone="white" label={t} eyebrow="Topic" title={t}>
            <LinkCards links={xs.map((a) => ({ label: a.q, href: `/health-answers/${a.slug}` }))} />
          </Section>
        );
      })}
      <Section label="Services" eyebrow="In Calgary" title="Popular services.">
        <LinkCards links={LANDINGS.map((l) => ({ label: l.h1, href: l.path }))} />
      </Section>
    </>
  );
}
