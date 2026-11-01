import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Hearing } from '../api/types';
import { shortNameOf } from '../config';
import { External } from './Bits';
import { date } from '../lib/format';
import { usePortal, type Async } from '../lib/portal-context';

export default function BetterGovHighlights() {
  const { client, scope, config } = usePortal();
  const [hearingState, setHearingState] = useState<Async<Hearing | null>>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    client.json<{ data: Hearing[] }>('/api/v1/hearings', { agency: 'DPWH' }).then(
      ({ data }) => {
        if (live) setHearingState({ status: 'ready', value: [...data].sort((a, b) => b.hearing_date.localeCompare(a.hearing_date))[0] ?? null });
      },
      (error) => { if (live) setHearingState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }); },
    );
    return () => { live = false; };
  }, [client]);

  return <section className="section bg-highlights" aria-labelledby="bg-highlights-h">
    <div className="bg-highlights-head">
      <div><p className="eyebrow">From BetterGov · national context</p><h2 id="bg-highlights-h" className="section-h">Follow the wider budget record</h2></div>
      <Link to="/context">Explore all sources →</Link>
    </div>
    <div className="bg-highlights-grid">
      <div><span className="label">This portal’s comparison</span><strong>{scope.status === 'ready' ? `Data built ${date(scope.value.meta.built_at)}` : 'BetterGov API data'}</strong><Link to="/#projects">Review the {shortNameOf(config)} ledger →</Link></div>
      <div><span className="label">DPWH hearing record</span><strong>{hearingState.status === 'ready' && hearingState.value ? `Latest listed session · ${date(`${hearingState.value.hearing_date}T12:00:00Z`)}` : hearingState.status === 'error' ? 'Hearing feed unavailable' : hearingState.status === 'loading' ? 'Loading hearing list…' : 'No DPWH hearing listed'}</strong>{hearingState.status === 'ready' && hearingState.value ? <External href={hearingState.value.page_url}>Read the DPWH-wide record</External> : <Link to="/context/hearings">Browse hearings →</Link>}</div>
    </div>
    <p className="fine">These dates describe published data and listed hearing sessions, not real-time government spending or a local finding. <Link to="/context/nep">NEP</Link> · <Link to="/context/house">House bill</Link> · <Link to="/context/gaa">Enacted GAA</Link></p>
  </section>;
}
