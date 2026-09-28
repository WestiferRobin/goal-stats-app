(() => {
  const $ = (selector) => document.querySelector(selector);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const form = $('form');
  const notice = $('#demo-status');
  const field = (name) => form.elements.namedItem(name);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const percent = (value, fraction = false) => `${(Number(value) * (fraction ? 100 : 1)).toFixed(1)}%`;
  const fixed = value => Number(value).toFixed(2);
  let teams = [];
  let busy = false;
  let ready = false;
  let extraMinute = 0;
  let matchStatus = '';
  let current = null;
  let timeline = [];
  let provenance = 'Manual model prediction';

  function message(text, error = false) {
    notice.textContent = text;
    notice.setAttribute('role', error ? 'alert' : 'status');
  }
  function lock(value) {
    busy = value;
    all('form input, form select, form button').forEach(el => {
      el.disabled = value || !ready || el.name.endsWith('_bad_star');
    });
    $('#retry-connection').disabled = value;
    form.setAttribute('aria-busy', String(value));
  }
  async function api(path, body) {
    const response = await fetch(`/api/football/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : {'Content-Type':'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Football request failed.');
    return data;
  }
  async function run(task) {
    if (busy) return;
    lock(true);
    message('Loading football data…');
    try { await task(); } catch (error) { message(error.message, true); }
    finally { lock(false); }
  }
  function body(id, html) {
    const section = $(`#${id}`);
    let content = section.querySelector(':scope > .api-content');
    if (!content) {
      all(`#${id} > :not(.section-heading)`).forEach(el => el.remove());
      content = document.createElement('div');
      content.className = 'api-content';
      section.append(content);
    }
    content.innerHTML = html;
  }
  const empty = text => `<p class="empty-state">${esc(text)}</p>`;
  const pair = () => ({team1:field('team1').value, team2:field('team2').value});
  const query = () => new URLSearchParams(pair()).toString();
  function state() {
    const result = {...pair(), minute:Number(field('match_minute').value), extra_minute:extraMinute, status:matchStatus};
    for (const side of [1,2]) {
      const stats = {};
      for (const key of ['goals','big_chances','defender_blocks','goalkeeper_saves','corners','yellow_cards','red_cards']) stats[key] = Number(field(`team${side}_${key}`).value);
      stats.shots = Number(field(`team${side}_total_shots`).value);
      stats.shots_on_target = Number(field(`team${side}_shots`).value);
      stats.possession = side === 1 ? Number(field('team1_possession').value) : 100 - Number(field('team1_possession').value);
      result[`team${side}_stats`] = stats;
    }
    return result;
  }
  function applyState(s) {
    field('team1').value = s.team1;
    field('team2').value = s.team2;
    field('match_minute').value = s.minute;
    extraMinute = s.extra_minute || 0;
    matchStatus = s.status || '';
    for (const side of [1,2]) {
      const stats = s[`team${side}_stats`];
      for (const key of ['goals','big_chances','defender_blocks','goalkeeper_saves','corners','yellow_cards','red_cards']) field(`team${side}_${key}`).value = stats[key] || 0;
      field(`team${side}_total_shots`).value = stats.shots || 0;
      field(`team${side}_shots`).value = stats.shots_on_target || 0;
    }
    field('team1_possession').value = s.team1_stats.possession;
    rankings();
  }
  function rankings() {
    const names = pair();
    all('.comparison-team-card').forEach((card,i) => {
      const team = teams.find(t => t.name === names[`team${i+1}`]);
      card.querySelector('h3').textContent = team.name;
      card.querySelector('.ranking-position strong').textContent = team.fifa_rank ? `#${team.fifa_rank}` : 'Unavailable';
      card.querySelector('.ranking-points strong').textContent = team.fifa_points ?? 'Unavailable';
      card.querySelector('.ranking-date').textContent = team.ranking_date ? `Dataset ranking: ${team.ranking_date}` : 'Ranking date unavailable';
    });
    all('#manual-live-data h3').forEach((el,i) => { if(i<2) el.textContent=names[`team${i+1}`]; });
    $('label[for="team1_possession"]').textContent = `${names.team1} Possession %`;
  }
  function render(p, s, source) {
    current = {prediction:p,state:s};
    provenance = source;
    const names = [p.team1,p.team2];
    all('.score-team-name').forEach((el,i) => el.textContent = names[i]);
    all('.score-number').forEach((el,i) => el.textContent = s[`team${i+1}_stats`].goals);
    $('.live-badge').textContent = source;
    $('.match-minute').textContent = `${p.minute}${s.extra_minute ? `+${s.extra_minute}` : ''}′ ${p.status || ''}`;
    const probs = [p.probabilities.team1,p.probabilities.draw,p.probabilities.team2];
    const labels = [p.team1,'Draw',p.team2];
    all('.probability-summary > div').forEach((el,i) => { el.querySelector('span').textContent=labels[i]; el.querySelector('strong').textContent=percent(probs[i],true); });
    all('.stack-segment').forEach((el,i) => {el.style.width=percent(probs[i],true);el.title=`${labels[i]} ${percent(probs[i],true)}`;});
    all('#live-momentum .two-team-values > span').forEach((el,i) => el.innerHTML=`${esc(names[i])} <strong>${percent(p.momentum_percent[`team${i+1}`])}</strong>`);
    all('.momentum-bar > div').forEach((el,i) => el.style.width=percent(p.momentum_percent[`team${i+1}`]));
    all('.expected-goals-team').forEach((el,i) => {el.querySelector('span').textContent=names[i];el.querySelector('strong').textContent=fixed(p.expected_goals_remaining[`team${i+1}`]);});
    $('.scoreline-list').innerHTML=p.top_scorelines.map(row=>`<div class="scoreline-row"><span>${esc(p.team1)} ${row.team1_goals} – ${row.team2_goals} ${esc(p.team2)}</span><strong>${percent(row.probability,true)}</strong></div>`).join('');
    $('.reason-list').innerHTML=p.reasoning.map(reason=>`<li>${esc(reason)}</li>`).join('');
    all('.confidence-header span').forEach((el,i)=>el.textContent=i ? percent(p.confidence.percent) : p.confidence.label);
    $('.progress-fill').style.width=percent(p.confidence.percent);
    $('.progress-fill').className=`progress-fill confidence-${p.confidence.percent<40?'low':p.confidence.percent<70?'medium':'high'}`;
    const winner=probs.indexOf(Math.max(...probs));
    $('.winner-result').textContent=`${labels[winner]}${winner===1?'':' Win'} — ${percent(probs[winner],true)}`;
    $('#most-likely-outcome > p:nth-of-type(3)').textContent=`Most likely score: ${p.team1} ${p.most_likely_score[0]} – ${p.most_likely_score[1]} ${p.team2}`;
    all('.advance-grid > span').forEach((el,i)=>el.innerHTML=`${esc(names[i])} advance: <strong>${percent(p.advancement[`team${i+1}`],true)}</strong>`);
    all('.stats-header strong').forEach((el,i)=>el.textContent=names[i]);
    const keys=['possession','shots','shots_on_target','big_chances','defender_blocks','goalkeeper_saves','corners','cards'];
    all('.comparison-stat-row').forEach((row,i)=>row.querySelectorAll('strong').forEach((el,side)=>{
      const stats=s[`team${side+1}_stats`];
      el.textContent=keys[i]==='cards'?`${stats.yellow_cards} yellow / ${stats.red_cards} red`: `${stats[keys[i]]}${i===0?'%':''}`;
    }));
    body('attack-pressure',empty('Attack pressure is not supplied by the current API.'));
    $('.difficulty-stars').textContent='—';
    $('.difficulty-label').textContent='Not supplied by the current API';
    body('event-timeline',p.events?.length ? p.events.map(e=>`<p>${esc(e.minute)}′ ${esc(e.team)} — ${esc(e.type)} ${esc(e.detail)}</p>`).join('') : empty('No events available for this prediction.'));
    message(`${source}. Heuristic model; not a guaranteed outcome.`);
  }
  async function predict() {
    const s=state();
    if(s.team1===s.team2) throw new Error('Choose two different teams.');
    const p=await api('predictions',s);
    render(p,s,'Manual model prediction');
  }
  async function insights() {
    const data=await api(`insights?${query()}`);
    $('#head-to-head .info-chip').textContent='Imported match history';
    $('#team-comparison .info-chip').textContent='Dataset rankings and history';
    const rows=items=>items.length ? items.map(r=>`<p>${esc(r.team1)} ${esc(r.final_team1_goals)} – ${esc(r.final_team2_goals)} ${esc(r.team2)}</p>`).join('') : empty('No imported matches available.');
    body('head-to-head',`<p>${esc(data.note)}</p>${rows(data.head_to_head)}`);
    all('.comparison-team-card .empty-state').forEach((el,i)=>{el.innerHTML=`Imported history (not dated recent form): ${rows(data[`team${i+1}_history`])}`;});
  }
  function chart(key, title, max) {
    const rows=[...timeline].reverse();
    if(!rows.length) return '';
    const values=rows.flatMap(row=>[key==='possession'?row.state.team1_stats.possession:row.prediction.expected_goals_remaining.team1,key==='possession'?row.state.team2_stats.possession:row.prediction.expected_goals_remaining.team2]);
    const ceiling=max || Math.max(1,...values)*1.1;
    const x=r=>40+Math.min(150,r.state.minute+(r.state.extra_minute||0))/150*500;
    const y=v=>180-v/ceiling*150;
    const lines=[0,1].map(side=>{
      const points=rows.map((r,i)=>`${x(r)},${y(values[i*2+side])}`).join(' ');
      return `<polyline points="${points}" fill="none" stroke="${side?'#faaf40':'#43c6b6'}" stroke-width="3"/>`+rows.map((r,i)=>`<circle cx="${x(r)}" cy="${y(values[i*2+side])}" r="4" fill="${side?'#faaf40':'#43c6b6'}"/>`).join('');
    }).join('');
    return `<h3>${title}</h3><svg viewBox="0 0 580 220" role="img" aria-label="${title} by match minute"><path d="M40 30V180H540" fill="none" stroke="currentColor"/><text x="3" y="35" fill="currentColor">${ceiling.toFixed(1)}</text><text x="15" y="183" fill="currentColor">0</text>${lines}<text x="40" y="210" fill="currentColor">0′</text><text x="500" y="210" fill="currentColor">150′</text></svg>`;
  }
  async function history() {
    timeline=await api(`snapshots?${query()}&limit=50`);
    body('probability-history',timeline.length ? '<p>Latest 50 shared saved snapshots, newest first. Loading restores the saved match inputs.</p>'+timeline.map((r,i)=>`<div class="scoreline-row"><span>${esc(r.state.minute)}′ — ${esc(new Date(r.created_at).toLocaleString())}<br>${esc(r.state.team1)} ${percent(r.prediction.probabilities.team1,true)} / Draw ${percent(r.prediction.probabilities.draw,true)} / ${esc(r.state.team2)} ${percent(r.prediction.probabilities.team2,true)}</span><button type="button" data-load="${i}">Load snapshot</button></div>`).join('') : empty('No saved snapshots for these teams. Use Save Snapshot to start the timeline.'));
    body('match-charts',timeline.length ? `<p>Saved snapshots: teal ${esc(pair().team1)}, amber ${esc(pair().team2)}. Separate matches may share the same team pair.</p>${chart('xg','Expected goals remaining')}${chart('possession','Possession (%)',100)}` : empty('Save snapshots to plot expected goals and possession.'));
  }
  async function related() {
    const results=await Promise.allSettled([insights(),history()]);
    const failures=results.flatMap((r,i)=>r.status==='rejected'?[`${i===0?'Insights':'History'}: ${r.reason.message}`]:[]);
    if(failures.length) message(`${provenance}. ${failures.join(' ')}`,true);
  }
  async function tournament() {
    const ordered=[...teams].sort((a,b)=>(a.fifa_rank??999)-(b.fifa_rank??999));
    if(![4,8,16,32].includes(ordered.length)) throw new Error('Tournament requires 4, 8, 16, or 32 imported teams.');
    const result=await api('tournaments/simulate',{teams:ordered.map(t=>t.name),simulations:Number(field('simulation_count').value)});
    $('#tournament-results').hidden=false;
    body('tournament-results',`<p>${esc(result.simulations)} simulations; all imported teams paired in ranking order. Predicted champion: ${esc(result.predicted_champion)}.</p><div class="demo-table-scroll"><table><thead><tr><th>Team</th><th>Semifinal</th><th>Final</th><th>Champion</th></tr></thead><tbody>${result.results.map(r=>`<tr><td>${esc(r.team)}</td><td>${percent(r.semifinal_probability)}</td><td>${percent(r.final_probability)}</td><td>${percent(r.champion_probability)}</td></tr>`).join('')}</tbody></table></div>`);
    message('Tournament simulation complete. These are model estimates.');
  }
  async function initialize() {
    teams=await api('teams');
    if(!Array.isArray(teams)||teams.length<2) throw new Error('Import at least two football teams into the backend first.');
    const defaults=['Spain','England'];
    for(const side of [1,2]) {
      const select=field(`team${side}`);
      select.replaceChildren(...teams.map(t=>new Option(t.name,t.name)));
      select.value=teams.some(t=>t.name===defaults[side-1])?defaults[side-1]:teams[side-1].name;
    }
    ready=true;
    rankings();
    await predict();
    await related();
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const action=event.submitter?.value || 'manual';
    run(async()=>{
      if(action==='manual') {extraMinute=0;matchStatus='';await predict();}
      if(action==='refresh_insights') {await insights();message('Imported match insights updated.');}
      if(action==='live_feed') {
        const data=await api('live/refresh',pair());
        applyState(data.state);
        render(data.prediction,data.state,`${data.source==='cached'?'Cached':'Live'} provider update — ${new Date(data.observed_at).toLocaleString()}`);
        await related();
      }
      if(action==='reset_timeline') {
        for(const input of all('form input[type="number"]')) input.value=input.name==='team1_possession'?50:0;
        extraMinute=0;matchStatus='';
        await predict();
        message('Current match inputs reset. Saved snapshots are retained.');
      }
      if(action==='simulate_tournament') await tournament();
      if(action==='save_snapshot') {
        const s=state();
        const saved=await api('snapshots',s);
        render(saved.prediction,s,'Saved manual model prediction');
        await history();
      }
      if(action==='reload_history') {await history();message('Shared saved history reloaded.');}
    });
  });
  form.addEventListener('input',()=>{
    if(ready&&!busy) message('Inputs changed. Press Update Prediction; displayed results are from the previous calculation.');
  });
  form.addEventListener('change',event=>{
    if(!['team1','team2'].includes(event.target.name)) return;
    run(async()=>{
      if(pair().team1===pair().team2) throw new Error('Choose two different teams.');
      for(const input of all('form input[type="number"]')) input.value=input.name==='team1_possession'?50:0;
      extraMinute=0;matchStatus='';current=null;
      rankings();
      body('head-to-head',empty('Loading selected match history…'));
      body('probability-history',empty('Loading selected match snapshots…'));
      body('match-charts',empty('Loading selected match snapshots…'));
      await predict();await related();
    });
  });
  form.addEventListener('click',event=>{
    const button=event.target.closest('[data-load]');
    if(!button) return;
    run(async()=>{
      const row=timeline[Number(button.dataset.load)];
      applyState(row.state);render(row.prediction,row.state,`Saved snapshot — ${new Date(row.created_at).toLocaleString()}`);
    });
  });
  $('#retry-connection').addEventListener('click',()=>run(initialize));
  // Static values remain explicitly labeled as a preview if no backend is configured.
  run(initialize).then(()=>{
    if(!current) message(`${notice.textContent} Displayed values are the static preview, not current backend results.`,true);
  });
})();
