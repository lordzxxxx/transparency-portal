import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { External } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import { shortNameOf } from '../config';
import { count, date } from '../lib/format';
import { DPWH_COMPARISON_URL, DPWH_NEP_URL, GAA_2026_URL, GAA_OVERVIEW_URL, HEARINGS_URL, METHODOLOGY_URL, NATIONAL_URL, NEP_OVERVIEW_URL } from '../lib/links';
import { usePortal } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

export default function Sources() {
  const { config, scope, districts, client, retry } = usePortal();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#verify') document.getElementById('verify')?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const name = shortNameOf(config);
  useTitle(`Sources and context · ${name}`);
  const officeQueries = scope.status === 'ready' ? scope.value.queries.filter((q) => q.kind === 'office') : [];
  const districtPages = districts.status === 'ready' ? districts.value.map((env) => env.data) : [];
  const meta = scope.status === 'ready' ? scope.value.meta : null;

  return (
    <main className="page main">
      <PageHead eyebrow={<>Source guide<span className="sep">·</span>{name}</>} title="Follow each figure back to its source">
        <p>
          This portal lists projects attributed to {name} in the BetterGov.ph Budget API. The links below separate this
          office’s records from nationwide budget views. A proposal, a House bill and an enacted budget are different stages;
          their amounts should be read in context, not combined.
        </p>
      </PageHead>

      <section id="verify" className="section source-method" aria-labelledby="verify-h">
        <h2 id="verify-h" className="section-h">Verify a project in three steps</h2>
        <ol>
          <li><strong>Choose a line.</strong> Open a project in <Link to="/#projects">this portal’s ledger</Link>. Check why it is included and whether the status or match is marked uncertain.</li>
          <li><strong>Read the source record.</strong> Open the BetterGov project page linked from its detail view. Compare the project title, program, office and amount with the portal.</li>
          <li><strong>Check the document.</strong> Follow the NEP and House bill PDF links beside the amounts. Find the line on each linked page and compare the title, office and exact peso amount. The page number refers to its position in the PDF, which may differ from the printed page number. Read the <External href={METHODOLOGY_URL}>comparison methodology</External> before drawing a conclusion.</li>
        </ol>
        <p>“House bill only” means BetterGov has no matched NEP line for that House bill entry. It is a lead for review, not proof of an insertion or wrongdoing. These figures describe proposed appropriations, not actual spending.</p>
        <Link className="button button-primary" to="/#projects">Choose a project to verify →</Link>
        <p className="fine source-method-foot">The <External href={`${client.base}/docs`}>BetterGov Budget API documentation</External> explains the data. This is an independent, unofficial portal. <Link to="/about">Read the query and document notes →</Link></p>
      </section>

      <section className="section" aria-labelledby="local-sources-h">
        <h2 id="local-sources-h" className="section-h">This office’s records</h2>
        {scope.status === 'loading' && <p className="state" role="status">Loading this office’s project count and API query…</p>}
        {scope.status === 'error' && (
          <div className="state state-error" role="alert">
            <p><strong>Could not load this office’s source links.</strong> {scope.error.message}</p>
            <button type="button" className="button" onClick={retry}>Try again</button>
          </div>
        )}
        <div className="source-grid">
          <article className="source-card">
            <p className="label">2027 · project ledger</p>
            <h3>Every line in this portal</h3>
            <p>Search {scope.status === 'ready' ? `the ${count(scope.value.projects.length)} project lines` : 'the project lines'}, compare the NEP and House bill amounts, and open either document at its page.</p>
            <Link to="/#projects">Browse the projects →</Link>
            {officeQueries.map((q) => <External key={q.label} href={q.api}>Open the {q.label} API results (JSON)</External>)}
          </article>
          <article className="source-card">
            <p className="label">District association · BetterGov</p>
            <h3>Office and legislative district</h3>
            <p>BetterGov associates this office with {districtPages.map((d) => d.label).join('; ') || 'a legislative district'}. {config.kind === 'deo' && <>An office’s number need not match a legislative district number. </>}This association does not assign every project to a specific place or representative.</p>
            <Link to="/#offices">See this portal’s office card →</Link>
            {districtPages.map((d) => <External key={d.id} href={d.url}>{d.label} on BetterGov</External>)}
          </article>
          <article className="source-card">
            <p className="label">2020–2026 · enacted budgets</p>
            <h3>Earlier office totals</h3>
            <p>See this office’s whole yearly GAA amounts as reported by the BetterGov district API. It does not provide an original GAA PDF page for each office-year total. The GAA project records cannot be reliably assigned to this office line by line.</p>
            <Link to="/gaa">View the office’s yearly budgets →</Link>
            {districtPages.map((d) => <External key={d.id} href={client.href(`/districts/${encodeURIComponent(d.id)}`)}>Inspect the district API record</External>)}
          </article>
        </div>
        {meta && (
          <p className="fine source-version">
            API comparison built {date(meta.built_at)} · <External href={`${meta.source_repo}/tree/${meta.source_commit}`}>source data version {meta.source_commit.slice(0, 7)}</External>
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="national-sources-h">
        <h2 id="national-sources-h" className="section-h">Nationwide context on BetterGov</h2>
        <p className="section-lede">These pages cover the country or all of DPWH. Their totals are broader than this office’s figures.</p>
        <div className="source-grid source-grid-four">
          <article className="source-card">
            <p className="label">Executive proposal · FY 2027</p>
            <h3>National Expenditure Program</h3>
            <p>The proposed national budget by department, with the FY 2026 GAA baseline. Its totals cover the whole country, not this office alone.</p>
            <Link to="/context/nep">Read the sourced summary</Link>
            <External href={NEP_OVERVIEW_URL}>Open BetterGov’s 2027 NEP overview</External>
            <External href={DPWH_NEP_URL}>See DPWH in the national NEP</External>
          </article>
          <article className="source-card">
            <p className="label">House bill comparison · FY 2027</p>
            <h3>House Bill 10858 against the NEP</h3>
            <p>BetterGov’s national comparison of the four project programs covered by the bill. These nationwide figures are broader than this office’s ledger.</p>
            <Link to="/context/house">Read the sourced summary</Link>
            <External href={NATIONAL_URL}>Open the House bill overview</External>
            <External href={DPWH_COMPARISON_URL}>Open the DPWH program comparison</External>
          </article>
          <article className="source-card">
            <p className="label">Enacted budgets · FY 2020–2026</p>
            <h3>General Appropriations Acts</h3>
            <p>Browse national enacted appropriations by year and department. Appropriations are authority to spend, not proof of actual spending.</p>
            <Link to="/context/gaa">See year-by-year national amounts</Link>
            <External href={GAA_OVERVIEW_URL}>Open BetterGov’s GAA browser</External>
            <External href={GAA_2026_URL}>Browse the enacted FY 2026 budget</External>
          </article>
          <article className="source-card">
            <p className="label">Budget hearings · FY 2027</p>
            <h3>House Committee DPWH sessions</h3>
            <p>The BetterGov hearing API lists DPWH-wide sessions with topic records and source videos. A session listing does not show a Bukidnon-specific decision.</p>
            <Link to="/context/hearings">See DPWH hearing records</Link>
            <External href={HEARINGS_URL}>Open all BetterGov hearings</External>
          </article>
        </div>
      </section>

    </main>
  );
}
