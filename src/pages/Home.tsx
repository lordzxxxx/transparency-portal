import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import type { BridgeGroup, DatasetInfo, Disclaimer, GroupInfo } from '../api/types';
import { BRIDGE_GROUPS } from '../api/types';
import { shortNameOf, type DatasetKey } from '../config';
import { Await, Disclaimers, External, ReasonTags, StatusChip } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import OfficesSection from '../components/OfficesSection';
import BetterGovHighlights from '../components/BetterGovHighlights';
import { projectsCsv, downloadText } from '../lib/csv';
import { count, date, php, phpDelta, plural } from '../lib/format';
import { NATIONAL_URL, NEP_OVERVIEW_URL } from '../lib/links';
import { usePortal } from '../lib/portal-context';
import { summarise, type ScopedProject, type ScopeResult, type Summary } from '../lib/scope';
import { useTitle } from '../lib/use-title';

const PAGE = 100;

type Sort = 'house' | 'nep' | 'change' | 'title';
type LedgerGroup = 'status' | 'program' | 'none';
const SORTS: Record<Sort, { label: string; cmp: (a: ScopedProject, b: ScopedProject) => number }> = {
  house: { label: 'House bill amount', cmp: (a, b) => (b.house_php ?? -1) - (a.house_php ?? -1) },
  nep: { label: 'NEP amount', cmp: (a, b) => (b.nep_php ?? -1) - (a.nep_php ?? -1) },
  change: { label: 'Size of change', cmp: (a, b) => Math.abs(b.delta_php ?? 0) - Math.abs(a.delta_php ?? 0) },
  title: { label: 'Name', cmp: (a, b) => a.title.localeCompare(b.title) },
};

export default function Home() {
  const { scope, overview, config } = usePortal();
  useTitle(`FY 2027 projects naming ${shortNameOf(config)} · Budget portal`);
  const datasets = overview.status === 'ready' ? overview.value.data.datasets : [];
  return (
    <main className="page main">
      <Await state={scope} what="projects">
        {(s) => <Projects scope={s} datasets={datasets} />}
      </Await>
    </main>
  );
}

/** Group wording from the API (label, sub, help), falling back to the row's own label. */
type GroupWords = Pick<GroupInfo, 'label' | 'sub' | 'help'>;

function groupInfo(datasets: DatasetInfo[], rows: ScopedProject[]): Record<BridgeGroup, GroupWords> {
  const fromApi = datasets[0]?.bridge.groups;
  const out = {} as Record<BridgeGroup, GroupWords>;
  for (const g of BRIDGE_GROUPS) {
    out[g] = fromApi?.[g] ?? { label: rows.find((r) => r.bridge_group === g)?.group_label ?? g, sub: '', help: '' };
  }
  return out;
}

function Projects({ scope, datasets }: { scope: ScopeResult; datasets: DatasetInfo[] }) {
  const { config, districts } = usePortal();
  const { hash } = useLocation();

  // #offices and #projects links land on their section once it has rendered.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash, districts.status]);

  // The disclaimers of every response on this page: the project lists' and the districts'.
  const disclaimers = useMemo(() => {
    const byId = new Map<string, Disclaimer>(scope.disclaimers.map((d) => [d.id, d]));
    if (districts.status === 'ready') for (const env of districts.value) for (const d of env.disclaimers) if (!byId.has(d.id)) byId.set(d.id, d);
    return [...byId.values()];
  }, [scope.disclaimers, districts]);
  const name = shortNameOf(config);
  const placeMatched = (config.scope.places?.length ?? 0) > 0 && !(config.scope.offices?.length ?? 0);
  const all = scope.projects;
  const summary = useMemo(() => summarise(all), [all]);
  const groups = useMemo(() => groupInfo(datasets, all), [datasets, all]);
  const programName = (k: DatasetKey) => datasets.find((d) => d.key === k)?.short ?? k.toUpperCase();

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const program = (params.get('program') ?? '') as DatasetKey | '';
  const budgetProgram = params.get('budgetProgram') ?? '';
  const status = (params.get('status') ?? '') as BridgeGroup | '';
  const why = params.get('why') ?? '';
  const office = params.get('office') ?? '';
  const sort = (params.get('sort') as Sort) in SORTS ? (params.get('sort') as Sort) : 'house';
  const groupParam = params.get('group');
  const group: LedgerGroup = groupParam === 'program' || groupParam === 'none' ? groupParam : 'status';
  const [shown, setShown] = useState(PAGE);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  // DPWH offices among the rows, largest first, for the Office filter.
  const offices = useMemo(() => {
    const n = new Map<string, number>();
    for (const p of all) if (p.office) n.set(p.office, (n.get(p.office) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en', { numeric: true }));
  }, [all]);

  const reasons = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of all) for (const r of p.reasons) seen.set(`${r.kind}:${r.label}`, r.kind === 'office' ? `Office: ${shortOffice(r.label)}` : `Title names ${r.label}`);
    return [...seen.entries()];
  }, [all]);

  const budgetPrograms = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of all) if (p.program) counts.set(p.program, (counts.get(p.program) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [all]);

  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = all.filter((p) => {
      if (program && p.dataset !== program) return false;
      if (budgetProgram && p.program !== budgetProgram) return false;
      if (status && p.bridge_group !== status) return false;
      if (why && !p.reasons.some((r) => `${r.kind}:${r.label}` === why)) return false;
      if (office && p.office !== office) return false;
      if (words.length) {
        const hay = [p.title, p.program, p.pap, p.office, p.region].join(' ').toLowerCase();
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    return rows.sort((a, b) => SORTS[sort].cmp(a, b) || a.title.localeCompare(b.title));
  }, [all, q, program, budgetProgram, status, why, office, sort]);
  const filteredSummary = useMemo(() => summarise(filtered), [filtered]);
  const narrowed = filtered.length !== all.length;
  const visible = filtered.slice(0, shown);
  const ledgerGroups = (() => {
    if (group === 'none') return [{ key: 'all', label: '', rows: visible, summary: summarise(visible) }];
    const byKey = new Map<string, ScopedProject[]>();
    for (const p of visible) {
      const key = group === 'status' ? p.bridge_group : p.program ?? 'Program not specified in the API';
      const rows = byKey.get(key) ?? [];
      rows.push(p);
      byKey.set(key, rows);
    }
    const keys = [...byKey.keys()].sort((a, b) => group === 'status'
      ? BRIDGE_GROUPS.indexOf(a as BridgeGroup) - BRIDGE_GROUPS.indexOf(b as BridgeGroup)
      : (byKey.get(b)?.length ?? 0) - (byKey.get(a)?.length ?? 0) || a.localeCompare(b));
    return keys.map((key) => {
      const rows = byKey.get(key)!;
      return { key, label: group === 'status' ? groups[key as BridgeGroup].label : key, rows, summary: summarise(rows) };
    });
  })();

  return (
    <>
      <PageHead
        eyebrow={<>FY 2027<span className="sep">·</span>NEP and House Bill 10858<span className="sep">·</span>{name}</>}
        title={placeMatched ? `${plural(summary.rows, 'project line')} naming ${name} in the FY 2027 proposals` : `${plural(summary.rows, 'project')} for ${name} in the 2027 budget`}
      >
        <Lede summary={summary} />
      </PageHead>

      <Stats summary={summary} programName={programName} />
      {placeMatched && <p className="fine">This city view selects lines whose titles name Malaybalay in Region X. It may miss projects whose titles omit the city and may include projects outside city boundaries. These are proposed amounts on matched lines, not a complete city allocation or actual spending. <Link to="/about">See how lines are selected →</Link></p>}
      <p className="fine">These counts and totals are calculated from the project rows returned by the BetterGov API. {scope.queries[0] && <External href={scope.queries[0].api}>Check the API query</External>} {scope.queries.length > 1 && <Link to="/about">See every query</Link>} Check individual records and document pages in the ledger below. <Link to="/sources">Source guide →</Link></p>

      <nav className="jump-nav" aria-label="Explore this portal">
        <Link to="/#projects"><strong>Browse {count(summary.rows)} matched project lines</strong><span>Search, filter and open source pages</span></Link>
        {summary.groups.house_only.rows > 0 ? (
          <Link to="/?status=house_only#projects"><strong>Review {count(summary.groups.house_only.rows)} House bill only lines</strong><span>Comparison candidates to check</span></Link>
        ) : (
          <Link to="/#groups"><strong>Compare project statuses</strong><span>See how the two versions relate</span></Link>
        )}
        <Link to="/gaa"><strong>View 2020–2026 budgets</strong><span>{placeMatched ? 'Place-name matches and whole district office totals' : 'Whole office totals by year'}</span></Link>
      </nav>

      <BetterGovHighlights />

      <OfficesSection />

      <ProgramBreakdown projects={all} />

      <section className="section" id="groups" aria-labelledby="groups-h">
        <h2 id="groups-h" className="section-h">What the House bill did to them</h2>
        <div className="groups" role="group" aria-label="Filter by status">
          {BRIDGE_GROUPS.map((g) => {
            const cell = summary.groups[g];
            const info = groups[g];
            const active = status === g;
            return (
              <button
                key={g}
                type="button"
                className={`group-tile${active ? ' active' : ''}`}
                disabled={!cell.rows}
                aria-pressed={active}
                title={info.help}
                onClick={() => setParam('status', active ? '' : g)}
              >
                <span className="group-label"><span className={`status-dot g-${g}`} aria-hidden="true" />{info.label}</span>
                {info.sub && <span className="label">{info.sub}</span>}
                <span className="group-count num">{count(cell.rows)}</span>
                <span className="group-php num">{groupAmount(g, cell)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <ReviewDesk projects={all} summary={summary} source={scope.meta} />

      <section className="section" id="projects" aria-labelledby="list-h">
        <div className="list-head">
          <h2 id="list-h" className="section-h">
            {narrowed ? `${count(filtered.length)} of ${plural(all.length, 'matched project line')}` : `Matched project lines (${count(all.length)})`}
          </h2>
          <button type="button" className="button button-quiet" onClick={() => downloadText(`${config.id}-fy2027-projects.csv`, projectsCsv(filtered))}>
            Download CSV{narrowed ? ` (${count(filtered.length)})` : ''}
          </button>
        </div>

        <div className="toolbar">
          <label className="field field-grow">
            <span className="label">Search</span>
            <input type="search" value={q} placeholder="Barangay, road, school, office…" onChange={(e) => setParam('q', e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Dataset</span>
            <select value={program} onChange={(e) => setParam('program', e.target.value)}>
              <option value="">All datasets</option>
              {(Object.keys(summary.byDataset) as DatasetKey[]).map((k) => (
                <option key={k} value={k}>{programName(k)} ({count(summary.byDataset[k]!.rows)})</option>
              ))}
            </select>
          </label>
          {budgetPrograms.length > 1 && (
            <label className="field">
              <span className="label">Budget program</span>
              <select value={budgetProgram} onChange={(e) => setParam('budgetProgram', e.target.value)}>
                <option value="">All budget programs</option>
                {budgetPrograms.map(([name, n]) => <option key={name} value={name}>{name} ({count(n)})</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span className="label">Status</span>
            <select value={status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">Any status</option>
              {BRIDGE_GROUPS.filter((g) => summary.groups[g].rows).map((g) => (
                <option key={g} value={g}>{groups[g].label} ({count(summary.groups[g].rows)})</option>
              ))}
            </select>
          </label>
          {offices.length > 1 && (
            <label className="field">
              <span className="label">DPWH office</span>
              <select value={office} onChange={(e) => setParam('office', e.target.value)}>
                <option value="">Any office</option>
                {offices.map(([o, n]) => <option key={o} value={o}>{shortOffice(o)} ({count(n)})</option>)}
              </select>
            </label>
          )}
          {reasons.length > 1 && (
            <label className="field">
              <span className="label">Listed because</span>
              <select value={why} onChange={(e) => setParam('why', e.target.value)}>
                <option value="">Any reason</option>
                {reasons.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span className="label">Sort by</span>
            <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'house' ? '' : e.target.value)}>
              {(Object.keys(SORTS) as Sort[]).map((k) => <option key={k} value={k}>{SORTS[k].label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Group records</span>
            <select value={group} onChange={(e) => setParam('group', e.target.value === 'status' ? '' : e.target.value)}>
              <option value="status">By comparison status</option>
              <option value="program">By budget program</option>
              <option value="none">No groups</option>
            </select>
          </label>
        </div>

        <p className="ledger-key"><span className="status-dot g-house_only" aria-hidden="true" /> Status comes from the BetterGov comparison. <span className="source-key">PDF</span> Page numbers are positions in the linked PDF, which may differ from numbers printed on its pages. A dash means a version has no matched line.</p>

        {narrowed && (
          <p className="filter-sums">
            These {count(filtered.length)}: NEP {php(filteredSummary.nep.php)} on {count(filteredSummary.nep.rows)}
            <span className="sep">·</span>House bill {php(filteredSummary.house.php)} on {count(filteredSummary.house.rows)}
            <span className="sep">·</span>
            <button type="button" className="link-button" onClick={() => { setParams(new URLSearchParams(), { replace: true }); setShown(PAGE); }}>
              Clear filters
            </button>
          </p>
        )}

        {ledgerGroups.map((bucket) => bucket.rows.length > 0 && (
          <div className="ledger-group" key={bucket.key}>
            {group !== 'none' && (
              <div className="ledger-group-head">
                <h3>{group === 'status' && <span className={`status-dot g-${bucket.key}`} aria-hidden="true" />}{bucket.label} <span className="muted">· {plural(bucket.rows.length, 'record')}</span></h3>
                <p>NEP {bucket.summary.nep.rows ? php(bucket.summary.nep.php) : '—'} <span className="sep">·</span> House bill {bucket.summary.house.rows ? php(bucket.summary.house.php) : '—'}</p>
              </div>
            )}
            <ProjectTable rows={bucket.rows} programName={programName} />
          </div>
        ))}

        {filtered.length === 0 && <p className="state">No project matches. Try fewer words or clear the filters.</p>}
        {filtered.length > shown && (
          <div className="more">
            <span className="muted">Showing {count(shown)} of {count(filtered.length)}</span>
            <button type="button" className="button" onClick={() => setShown((n) => n + PAGE)}>Show {count(Math.min(PAGE, filtered.length - shown))} more</button>
            <button type="button" className="button button-quiet" onClick={() => setShown(filtered.length)}>Show all</button>
          </div>
        )}

        <p className="fine">
          Amounts are in pesos, as each document publishes them. A dash means that document has no such line. The NEP
          and the House bill are two versions of one budget: their totals are compared, never added.
        </p>
      </section>

      <aside className="source-bridge" aria-label="Explore the national budget context">
        <div>
          <strong>How these local matches fit the national budget</strong>
          <span>The figures above cover selected project lines naming this place. BetterGov also publishes the nationwide proposal and House comparison.</span>
        </div>
        <div className="source-bridge-links">
          <External href={NEP_OVERVIEW_URL}>2027 NEP</External>
          <External href={NATIONAL_URL}>House bill vs NEP</External>
          <Link to="/sources">Sources & context →</Link>
        </div>
      </aside>

      <Disclaimers items={disclaimers} compact />
    </>
  );
}

/** "Bohol 1st District Engineering Office" → "Bohol 1st DEO", for tight spaces. */
function shortOffice(office: string): string {
  return office.replace(/ District Engineering Office$/, ' DEO');
}

function groupAmount(g: BridgeGroup, c: { nep_php: number; house_php: number; rows: number }): string {
  if (!c.rows) return '—';
  switch (g) {
    case 'nep_only': return php(c.nep_php);
    case 'increased':
    case 'decreased':
    case 'scope_review': return phpDelta(c.house_php - c.nep_php);
    default: return php(c.house_php);
  }
}

function Lede({ summary }: { summary: Summary }) {
  const added = summary.groups.house_only.rows;
  const dropped = summary.groups.nep_only.rows;
  return (
    <p>
      The NEP lists {count(summary.nep.rows)} of them, for {php(summary.nep.php)}; the House bill lists{' '}
      {count(summary.house.rows)}, for {php(summary.house.php)}.{' '}
      {added || dropped ? (
        <>
          {added > 0 && <>{plural(added, 'project is', 'projects are')} in the House bill only</>}
          {added > 0 && dropped > 0 && <> and </>}
          {dropped > 0 && <>{plural(dropped, 'project is', 'projects are')} in the NEP only</>}
          : candidates to check, not confirmed changes.
        </>
      ) : (
        <>Every project is in both.</>
      )}
    </p>
  );
}

function Stats({ summary, programName }: { summary: Summary; programName: (k: DatasetKey) => string }) {
  const programs = (Object.entries(summary.byDataset) as [DatasetKey, { rows: number }][])
    .sort((a, b) => b[1].rows - a[1].rows)
    .map(([k, c]) => `${programName(k)} ${count(c.rows)}`)
    .join(' · ');
  return (
    <dl className="stats">
      <div>
        <dt className="label">Projects</dt>
        <dd className="stat num">{count(summary.rows)}</dd>
        <dd className="stat-sub">{programs || 'none'}</dd>
      </div>
      <div>
        <dt className="label">NEP</dt>
        <dd className="stat num">{php(summary.nep.php)}</dd>
        <dd className="stat-sub">{plural(summary.nep.rows, 'project')} · the budget the President submits</dd>
      </div>
      <div>
        <dt className="label">House bill</dt>
        <dd className="stat num stat-accent">{php(summary.house.php)}</dd>
        <dd className="stat-sub">{plural(summary.house.rows, 'project')} · compared with the NEP, not added</dd>
      </div>
      <div>
        <dt className="label">In the House bill only</dt>
        <dd className="stat num">{count(summary.groups.house_only.rows)}</dd>
        <dd className="stat-sub">{php(summary.groups.house_only.house_php)} · insertion candidates</dd>
      </div>
    </dl>
  );
}

function ReviewDesk({ projects, summary, source }: { projects: ScopedProject[]; summary: Summary; source: ScopeResult['meta'] }) {
  const candidates = projects
    .filter((p) => p.bridge_group === 'house_only')
    .sort((a, b) => (b.house_php ?? 0) - (a.house_php ?? 0))
    .slice(0, 4);

  return (
    <section className="section review-desk" aria-labelledby="review-h">
      <div className="review-intro">
        <div>
          <p className="eyebrow">Start with the source</p>
          <h2 id="review-h" className="section-h">Read the changes, then check the document</h2>
          <p>
            The House bill lists {plural(summary.groups.house_only.rows, 'line')} absent from this portal’s matched NEP list.
            These are comparison candidates, not confirmed insertions or findings of wrongdoing.
            Open a project to see both versions, its status notes, and the exact budget pages.
          </p>
        </div>
        <div className="review-source">
          <span className="label">Comparison data</span>
          <strong>Built {date(source.built_at)}</strong>
          <External href={`${source.source_repo}/tree/${source.source_commit}`}>Source data version</External>
          <Link to="/about">How this portal selects lines →</Link>
        </div>
      </div>
      {candidates.length > 0 && (
        <>
          <h3 className="sub-h">Largest House bill only lines in this portal</h3>
          <ol className="review-list">
            {candidates.map((p) => (
              <li key={p.key}>
                <div>
                  <Link className="project-title" to={`/projects/${p.dataset}/${encodeURIComponent(p.id)}`}>{p.title}</Link>
                  <span className="muted small">{p.program ?? p.dataset.toUpperCase()}</span>
                </div>
                <div className="review-amount">
                  <strong className="num">{php(p.house_php)}</strong>
                  {p.pdf_url.hgab3 && <External href={p.pdf_url.hgab3}>House bill p. {p.hgab3_page ?? 'PDF'}</External>}
                </div>
              </li>
            ))}
          </ol>
          <Link className="review-all" to="/?status=house_only#projects">See all {count(summary.groups.house_only.rows)} House bill only lines →</Link>
        </>
      )}
    </section>
  );
}

function ProgramBreakdown({ projects }: { projects: ScopedProject[] }) {
  const programs = new Map<string, { rows: number; nep: number; nepRows: number; house: number; houseRows: number }>();
  for (const p of projects) {
    const key = p.program ?? 'Program not specified in the API';
    const cell = programs.get(key) ?? { rows: 0, nep: 0, nepRows: 0, house: 0, houseRows: 0 };
    cell.rows++;
    if (p.nep_php != null) { cell.nep += p.nep_php; cell.nepRows++; }
    if (p.house_php != null) { cell.house += p.house_php; cell.houseRows++; }
    programs.set(key, cell);
  }
  if (programs.size < 2) return null;
  const rows = [...programs.entries()].sort((a, b) => b[1].house - a[1].house || a[0].localeCompare(b[0]));
  return (
    <section className="section" aria-labelledby="programs-h">
      <h2 id="programs-h" className="section-h">Projects by budget program</h2>
      <p className="section-lede">Program names come from the BetterGov project records. Amounts compare the two 2027 versions for this portal’s selected lines.</p>
      <div className="program-breakdown">
        {rows.map(([name, cell]) => (
          <div className="program-row" key={name}>
            <div><strong>{name}</strong><span className="muted small">{plural(cell.rows, 'project')}</span></div>
            <div><span className="label">NEP · {plural(cell.nepRows, 'line')}</span><strong className="num">{cell.nepRows ? php(cell.nep) : '—'}</strong></div>
            <div><span className="label">House · {plural(cell.houseRows, 'line')}</span><strong className="num">{cell.houseRows ? php(cell.house) : '—'}</strong></div>
          </div>
        ))}
      </div>
      <p className="fine">These are proposed allocations, not spending. The two versions are compared, never added.</p>
    </section>
  );
}

function ProjectTable({ rows, programName }: { rows: ScopedProject[]; programName: (k: DatasetKey) => string }) {
  const { client } = usePortal();
  if (!rows.length) return null;
  return (
    <div className="table" role="table" aria-label="Projects">
      <div className="tr th" role="row">
        <span role="columnheader">Project</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="r">NEP</span>
        <span role="columnheader" className="r">House bill</span>
        <span role="columnheader" className="r">Change</span>
      </div>
      {rows.map((p) => (
        <div className={`tr ledger-row ledger-status-${p.bridge_group}`} role="row" key={p.key}>
          <span role="cell" className="td-project">
            <Link to={`/projects/${p.dataset}/${encodeURIComponent(p.id)}`} className="project-title">{p.title}</Link>
            <span className="project-meta">
              <span className="label">{programName(p.dataset)}</span>
              {p.office && <span>{shortOffice(p.office)}</span>}
              {p.region && <span>{p.region}</span>}
              <ReasonTags reasons={p.reasons} />
            </span>
            <span className="source-pages">
              <span className="label">Source pages</span>
              {p.pdf_url.nep && <External href={p.pdf_url.nep}>NEP p. {p.nep_page ?? 'PDF'}</External>}
              {p.pdf_url.hgab3 && <External href={p.pdf_url.hgab3}>House p. {p.hgab3_page ?? 'PDF'}</External>}
              <External href={client.href(p.api_url)}>API record</External>
              {!p.pdf_url.nep && !p.pdf_url.hgab3 && <span className="muted">No PDF page linked</span>}
            </span>
          </span>
          <span role="cell" className="td-status"><StatusChip group={p.bridge_group} label={p.status_label} held={p.held} /></span>
          <span role="cell" className="r num" data-label="NEP">{php(p.nep_php)}</span>
          <span role="cell" className="r num strong" data-label="House bill">{php(p.house_php)}</span>
          <span role="cell" className={`r num delta ${(p.delta_php ?? 0) > 0 ? 'up' : (p.delta_php ?? 0) < 0 ? 'down' : ''}`} data-label="Change">
            {phpDelta(p.delta_php)}
          </span>
        </div>
      ))}
    </div>
  );
}
