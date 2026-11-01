import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Hearing } from '../api/types';
import { External } from '../components/Bits';
import { PageHead } from '../components/Chrome';
import { shortNameOf } from '../config';
import { count, date, php } from '../lib/format';
import { DPWH_COMPARISON_URL, DPWH_NEP_URL, GAA_OVERVIEW_URL, HEARINGS_URL, NATIONAL_URL, NEP_OVERVIEW_URL } from '../lib/links';
import { usePortal, type Async } from '../lib/portal-context';
import { useTitle } from '../lib/use-title';

type HearingResponse = { data: Hearing[] };
type NepResponse = { meta: { generated_at?: string }; data: { national: { amount: number; base_amount: number }; departments: { id: string; amount: number; base_amount: number }[] } };
type HouseResponse = { meta: { built_at: string; source_repo: string; source_commit: string }; data: { summary: string; datasets: { key: string; label: string }[] } };
type GaaResponse = { data: { year: number; amount: number }[] };
type ContextData = HearingResponse | NepResponse | HouseResponse | GaaResponse;
type Section = 'nep' | 'house' | 'hearings' | 'gaa';

const sections: { key: Section; title: string; eyebrow: string; description: string; source: string; api: string }[] = [
  { key: 'nep', title: '2027 executive proposal', eyebrow: 'National Expenditure Program', description: 'The nationwide NEP and its DPWH department entry. These totals cover much more than the local project lines selected here.', source: NEP_OVERVIEW_URL, api: '/api/v1/nep/2027' },
  { key: 'house', title: 'House bill comparison', eyebrow: 'House Bill 10858 versus the NEP', description: 'BetterGov compares project lines in four programs. Candidate changes need source review.', source: NATIONAL_URL, api: '/api/v1/hgab/2027' },
  { key: 'hearings', title: 'DPWH budget hearings', eyebrow: 'House Committee on Appropriations', description: 'DPWH-wide hearing streams, topic records and source videos. They do not establish a local decision.', source: HEARINGS_URL, api: '/api/v1/hearings?agency=DPWH' },
  { key: 'gaa', title: 'Enacted national budgets', eyebrow: 'General Appropriations Acts · 2020–2026', description: 'Nationwide enacted appropriations by year. These amounts are not spending or office totals.', source: GAA_OVERVIEW_URL, api: '/api/v1/gaa' },
];

export default function NationalContext() {
  const { section } = useParams();
  const { client, config, scope } = usePortal();
  const name = shortNameOf(config);
  const selected = sections.find((entry) => entry.key === section);
  useTitle(`${selected?.title ?? 'National budget context'} · ${name}`);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: Async<ContextData> } | null>(null);

  useEffect(() => {
    if (!selected) return;
    let live = true;
    client.json<ContextData>(selected.api).then(
      (value) => live && setResult({ key: selected.key, state: { status: 'ready', value } }),
      (error) => live && setResult({ key: selected.key, state: { status: 'error', error: error instanceof Error ? error : new Error(String(error)) } }),
    );
    return () => { live = false; };
  }, [client, selected, attempt]);

  if (section && !selected) return <main className="page main"><p className="state">This context page does not exist. <Link to="/context">See the available sources</Link>.</p></main>;
  const state: Async<ContextData> = result && result.key === selected?.key ? result.state : { status: 'loading' };
  return (
    <main className="page main">
      <PageHead eyebrow={<>BetterGov data<span className="sep">·</span>National context</>} title={selected?.title ?? 'Follow the wider budget record'}>
        <p>{selected?.description ?? `Start with ${name}’s project ledger, then use these BetterGov routes for the nationwide proposal, House comparison, DPWH hearings and enacted budgets.`}</p>
      </PageHead>
      <nav className="context-nav" aria-label="National budget sections">
        {sections.map((item) => <Link key={item.key} to={`/context/${item.key}`} aria-current={section === item.key ? 'page' : undefined}>{item.eyebrow}</Link>)}
      </nav>

      {!selected ? (
        <>
          <section className="section" aria-labelledby="local-context-h">
            <h2 className="section-h" id="local-context-h">Start with {name}</h2>
            <p>The local ledger is drawn from BetterGov’s comparison data, built {scope.status === 'ready' ? date(scope.value.meta.built_at) : 'on the date shown in its source record'}. The date is the dataset build time, not a live spending update. <Link to="/#projects">Review the selected project lines →</Link></p>
          </section>
          <div className="context-grid">
            {sections.map((item) => <article className="context-card" key={item.key}>
              <span className="label">{item.eyebrow}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <Link to={`/context/${item.key}`}>Explore this source →</Link>
            </article>)}
          </div>
        </>
      ) : (
        <>
          <p className="context-source">Source: <External href={selected.source}>BetterGov page</External> · <External href={client.href(selected.api)}>API record</External>. Figures below load from that API when this page opens.</p>
          {state.status === 'loading' && <p className="state" role="status">Loading the BetterGov record…</p>}
          {state.status === 'error' && <div className="state state-error" role="alert"><p>Could not load this record: {state.error.message}</p><button className="button" type="button" onClick={() => { setResult(null); setAttempt((n) => n + 1); }}>Try again</button></div>}
          {state.status === 'ready' && <ContextDetails section={selected.key} data={state.value} />}
          <p className="context-back"><Link to="/context">← All national sources</Link> <span className="sep">·</span> <Link to="/">{name} project ledger</Link></p>
        </>
      )}
    </main>
  );
}

function ContextDetails({ section, data }: { section: Section; data: ContextData }) {
  const { config } = usePortal();
  const name = shortNameOf(config);
  if (section === 'nep') {
    const record = data as NepResponse;
    const dpwh = record.data.departments.find((item) => item.id === '18');
    return <section className="section context-detail">
      <h2 className="section-h">National proposal</h2>
      <dl className="context-facts">
        <div><dt>2027 NEP, nationwide</dt><dd>{php(record.data.national.amount)}</dd></div>
        {dpwh && <div><dt>DPWH in the 2027 NEP</dt><dd>{php(dpwh.amount)}</dd></div>}
      </dl>
      <p className="fine">{record.meta.generated_at && <>API dataset generated {date(record.meta.generated_at)}. </>}The DPWH department total is broader than the local project lines. <External href={DPWH_NEP_URL}>Explore the national DPWH page</External> · <Link to="/gaa">See local name matches and district office totals</Link>.</p>
    </section>;
  }
  if (section === 'house') {
    const record = data as HouseResponse;
    return <section className="section context-detail">
      <h2 className="section-h">Scope of the comparison</h2>
      <p>{record.data.summary}</p>
      <ul className="context-list">{record.data.datasets.map((item) => <li key={item.key}>{item.label}</li>)}</ul>
      <p className="fine">Comparison data built {date(record.meta.built_at)}. <External href={DPWH_COMPARISON_URL}>Explore all DPWH records</External> · <Link to="/">See {name} title matches</Link>. A candidate status alone is not evidence of wrongdoing.</p>
    </section>;
  }
  if (section === 'hearings') {
    const hearings = [...(data as HearingResponse).data].sort((a, b) => b.hearing_date.localeCompare(a.hearing_date));
    return <section className="section context-detail">
      <h2 className="section-h">DPWH hearing records in BetterGov</h2>
      <p className="fine">These are DPWH-wide committee sessions. No {name}-specific claim is made from their titles or dates. Read the topic record and source video before attributing a statement.</p>
      {hearings.length ? <ol className="context-hearings">{hearings.map((item) => <li key={item.video_id}>
        <time dateTime={item.hearing_date}>{date(`${item.hearing_date}T12:00:00Z`)}</time>
        <strong>{item.title}</strong>
        <span>{item.has_record ? `${count(item.topic_count)} topic records` : 'No topic record listed'} · <External href={item.page_url}>BetterGov record</External> · <External href={item.youtube_url}>Source video</External></span>
      </li>)}</ol> : <p className="state">No DPWH hearings are listed in this API response.</p>}
    </section>;
  }
  const years = (data as GaaResponse).data;
  return <section className="section context-detail">
    <h2 className="section-h">National enacted appropriations</h2>
    <div className="context-years">{years.map((item) => <div key={item.year}><span>{item.year}</span><strong>{php(item.amount)}</strong><External href={`https://budget.bettergov.ph/gaa/${item.year}`}>Year page</External></div>)}</div>
    <p className="fine">These national GAA amounts are authority to spend, not actual expenditure. <Link to="/gaa">View local name matches and district office totals →</Link></p>
  </section>;
}
