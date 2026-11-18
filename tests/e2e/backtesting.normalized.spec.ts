import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fixture, request as syntheticRequest } from '../../src/features/analytics/domain/backtesting.fixtures';
import { fullDatasetId, editionCounts, pilotDatasetId, type BacktestRequest } from '../../src/features/analytics/domain/backtesting';
const endpoint = '/api/football/evaluations/backtests';
test.setTimeout(90_000);
test.beforeAll(() => {
 const owned=JSON.parse(readFileSync('/tmp/goalstats-normalized.json','utf8'));
 expect(owned.session).toBe(process.env.NORMALIZED_SESSION);expect(owned.database).toBe(`goalstats_test_${owned.session}`);
});
test('certified pilot scores only explicit test assumptions and preserves the full catalog',async({page,request})=>{
 await page.goto('/analytics');
 await page.getByRole('combobox',{name:'Evaluation dataset',exact:true}).selectOption(pilotDatasetId);
 await expect(page.getByText(/Two matches are insufficient/)).toBeVisible();
 await page.getByRole('combobox',{name:'Evaluation mode',exact:true}).selectOption('retrospective_assumptions');
 await page.getByLabel('Assumption package name').fill('browser-automated-test-only');
 let pending=page.waitForResponse(r=>r.url().endsWith(endpoint));
 await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const missing=await (await pending).json();expect(missing.eligible_matches).toBe(0);expect(missing.exclusion_reasons.explicit_star_power_clutch_assumptions_missing).toBe(2);
 pending=page.waitForResponse(r=>r.url().endsWith(endpoint));
 await page.getByRole('button',{name:'Load cohort for assumptions'}).click();
 const strict=await (await pending).json();expect(strict.dataset_match_count).toBe(348);expect(strict.cohort_match_count).toBe(2);expect(strict.eligible_matches).toBe(0);
 expect(strict.exclusion_reasons.historical_star_power_clutch_evidence_missing).toBe(2);
 for(const c of strict.cases){
  for(const side of ['home','away']){
   const id=c[`${side}_team_id`];
   const fieldset=page.locator('fieldset').filter({hasText:`Match #${c.match_id}`});
   const names=await (await request.get('/api/football/catalog/teams')).json();const name=names.find((t:{team_id:number})=>t.team_id===id).name;
   for(const field of ['Star Power','Clutch']){const input=fieldset.getByLabel(`Match ${c.match_id} ${name} ${field}`,{exact:true});await expect(input).toHaveValue('');await input.fill(field==='Star Power'?'0':'25');}
  }
 }
 pending=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const response=await pending;expect(response.status()).toBe(200);const result=await response.json();
 expect(result.eligible_matches).toBe(2);expect(result.dataset_match_count).toBe(348);expect(result.cohort_match_count).toBe(2);expect(result.dataset_hash).toBe(strict.dataset_hash);expect(result.package_hash).toBe(strict.package_hash);
 expect(result.cases.map((c:{outcome:string})=>c.outcome)).toEqual(['home_win','home_win']);
 for(const c of result.cases){expect(c.cutoff).toBe('2023-07-19');expect(c.label_provenance.regulation_minutes).toBe(90);expect(c.input_manifest.publication_timing).toBe('match_dates_only_retrospective');}
 await expect(page.getByRole('table',{name:/Confusion matrix/})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Retrospective assumption-based evaluation'})).toBeVisible();
 const replay=await request.post(endpoint,{data:response.request().postDataJSON()});expect(await replay.json()).toEqual(result);
 const original=await request.post(endpoint,{data:{dataset_id:'womens-world-cup-recorded-v1',offset:284,limit:2}});expect((await original.json()).eligible_matches).toBe(0);
});
test('real proxy and evaluation service report exclusions, deterministic manifests and no persisted predictions',async({page,request})=>{
 const before=await (await request.get('/api/football/scenarios?limit=100&offset=0')).json();
 await page.goto('/analytics');await expect(page.getByRole('heading',{name:'Model Evaluation — Backtesting'})).toBeVisible();await expect(page.getByRole('heading',{name:'No Match Loaded'})).toBeVisible();
 await page.getByLabel('Evaluation limit',{exact:true}).fill('16');
 const response=page.waitForResponse(r=>r.url().endsWith(endpoint)&&r.request().method()==='POST');await page.getByRole('button',{name:'Run evaluation',exact:true}).click();const received=await response;expect(received.status()).toBe(200);const data=await received.json();
 expect(data.evidence_kind).toBe('historical');expect(data.dataset_match_count).toBe(348);expect(data.eligible_matches).toBe(0);expect(data.excluded_matches).toBe(16);expect(data.accuracy).toBeNull();expect(data.log_loss).toBeNull();expect(data.brier_score).toBeNull();expect(data.confusion_matrix).toBeNull();
 await expect(page.getByText(/Historical accuracy unavailable/)).toBeVisible();await expect(page.getByText('Approved regulation outcome evidence is missing: 16',{exact:true})).toBeVisible();
 await expect(page.getByText('Observed historical Star Power and Clutch evidence is missing: 16',{exact:true})).toBeVisible();
 const panel=page.getByRole('region',{name:'Model Evaluation — Backtesting'});await expect(panel.getByText('100.0%',{exact:true})).toHaveCount(0);await expect(panel.getByText('0.0%',{exact:true})).toHaveCount(0);
 const replay=await request.post(endpoint,{data:received.request().postDataJSON()});expect(replay.status()).toBe(200);expect((await replay.json()).manifest_hash).toBe(data.manifest_hash);
 const after=await (await request.get('/api/football/scenarios?limit=100&offset=0')).json();expect(after).toEqual(before);
 await page.getByLabel('Match offset',{exact:true}).fill('16');await expect(page.getByLabel('Evaluation results')).toHaveCount(0);
});
test('real assumption mode requires explicit inputs and keeps historical metrics unavailable',async({page})=>{
 await page.goto('/analytics');await page.getByRole('combobox',{name:'Evaluation mode',exact:true}).selectOption('retrospective_assumptions');await page.getByRole('button',{name:'Run evaluation',exact:true}).click();await expect(page.getByRole('region',{name:'Model Evaluation — Backtesting'}).getByRole('alert')).toContainText('package name');
 await page.getByLabel('Assumption package name').fill('browser-explicit-v1');const pending=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Load cohort for assumptions'}).click();const cohort=await (await pending).json();const c=cohort.cases[0];expect(c.probabilities).toBeNull();
 const inputs=page.getByRole('region',{name:'Model Evaluation — Backtesting'}).getByRole('spinbutton').filter({visible:true});
 // Match offset, limit, then both explicit ratings for each participant.
 await expect(inputs).toHaveCount(6);for(let i=2;i<6;i++){await expect(inputs.nth(i)).toHaveValue('');await inputs.nth(i).fill(i%2===0?'0':'25');}
 const result=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();const response=await result;expect(response.status()).toBe(200);const body=response.request().postDataJSON();expect(body.mode).toBe('retrospective_assumptions');expect(body.assumptions).toHaveLength(2);expect(body.assumptions[0].star_power).toBe(0);expect(body.assumptions[0].match_key).toBe(c.match_key);
 await expect(page.getByRole('heading',{name:'Retrospective assumption-based evaluation'})).toBeVisible();await expect(page.getByText(/Historical accuracy unavailable/)).toBeVisible();await expect(page.getByText('Retrospective assumption-based evaluation uses your hypothetical Star Power and Clutch values. It is not genuine historical forecasting evidence.',{exact:true})).toBeVisible();
 await page.getByLabel('Assumption package name').fill('changed');await expect(page.getByLabel('Evaluation results')).toHaveCount(0);
});
test('synthetic browser fixture displays verified metric fields, matrix and per-match classifications',async({page})=>{
 await page.route('**'+endpoint,route=>route.fulfill({json:fixture(true)}));await page.goto('/analytics');await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 await expect(page.getByText('Synthetic test evidence — not historical accuracy.',{exact:true})).toBeVisible();await expect(page.getByText('100.0%',{exact:true})).toBeVisible();await expect(page.getByText('0.693147',{exact:true})).toBeVisible();await expect(page.getByText('0.380000',{exact:true})).toBeVisible();await expect(page.getByRole('table',{name:/Confusion matrix/})).toBeVisible();await expect(page.getByText('Draw · Correct',{exact:true})).toBeVisible();await expect(page.getByText('20.0% / 50.0% / 30.0%',{exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Evaluation mode',exact:true}).selectOption('retrospective_assumptions');await expect(page.getByText('100.0%',{exact:true})).toHaveCount(0);
});
test('browser recovers from API and malformed-response errors and rejects stale output',async({page})=>{
 let count=0;await page.route('**'+endpoint,route=>{count++;return route.fulfill(count===1?{status:504,json:{detail:'timeout'}}:count===2?{json:{}}:{json:fixture(false,route.request().postDataJSON() as BacktestRequest)});});
 await page.goto('/analytics');await page.getByRole('button',{name:'Run evaluation',exact:true}).click();await expect(page.getByRole('region',{name:'Model Evaluation — Backtesting'}).getByRole('alert')).toContainText('timed out');await page.getByRole('button',{name:'Retry evaluation'}).click();await expect(page.getByRole('region',{name:'Model Evaluation — Backtesting'}).getByRole('alert')).toContainText('Invalid evaluation response');await page.getByRole('button',{name:'Retry evaluation'}).click();await expect(page.getByText(/Historical accuracy unavailable/)).toBeVisible();
 await page.unroute('**'+endpoint);let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});await page.route('**'+endpoint,async route=>{await gate;await route.fulfill({json:fixture(true,syntheticRequest)}).catch(()=>{});});
 await page.getByRole('button',{name:'Run evaluation',exact:true}).click();await expect(page.getByRole('button',{name:'Evaluating…'})).toBeDisabled();await page.getByLabel('Evaluation limit',{exact:true}).fill('2');release();await expect(page.getByLabel('Evaluation results')).toHaveCount(0);await expect(page.getByText('100.0%',{exact:true})).toHaveCount(0);
});

test('all 348 cases and all nine editions retain evidence, exclusions and separate horizons',async({page,request})=>{
 await page.goto('/analytics');
 await page.getByRole('combobox',{name:'Evaluation dataset',exact:true}).selectOption(fullDatasetId);
 await expect(page.getByLabel('Evaluation limit',{exact:true})).toHaveValue('348');
 let pending=page.waitForResponse(r=>r.url().endsWith(endpoint));
 await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const full=await (await pending).json();expect(full.total_candidate_matches).toBe(348);expect(full.dataset_match_count).toBe(348);expect(full.eligible_matches).toBe(0);expect(full.accuracy).toBeNull();expect(full.edition_summaries).toHaveLength(9);
 expect(full.edition_summaries.reduce((n:number,s:{verified_labels:number})=>n+s.verified_labels,0)).toBe(348);
 expect(full.edition_summaries.reduce((n:number,s:{rating_complete:number})=>n+s.rating_complete,0)).toBe(320);
 await expect(page.getByRole('table',{name:/Edition evidence coverage/})).toBeVisible();await expect(page.getByText('1991 · 80 min — blocked',{exact:true})).toBeVisible();
 for(const year of Object.keys(editionCounts).map(Number)){
  const response=await request.post(endpoint,{data:{dataset_id:fullDatasetId,edition:year,limit:348}});expect(response.status()).toBe(200);const body=await response.json();expect(body.cohort_match_count).toBe(editionCounts[year]);expect(body.cases.every((c:{edition:number})=>c.edition===year)).toBe(true);expect(body.dataset_hash).toBe(full.dataset_hash);expect(body.accuracy).toBeNull();
 }
 await page.getByRole('combobox',{name:'World Cup edition',exact:true}).selectOption('1991');
 pending=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();const blocked=await (await pending).json();expect(blocked.prediction_horizon).toBe('pregame_80_minutes_model_unvalidated');expect(blocked.exclusion_reasons.model_80_minute_horizon_unvalidated).toBe(26);
 await page.getByRole('combobox',{name:'World Cup edition',exact:true}).selectOption('2023');await page.getByLabel('Evaluation limit',{exact:true}).fill('2');
 await page.getByRole('combobox',{name:'Evaluation mode',exact:true}).selectOption('retrospective_assumptions');
 const cases=full.cases.filter((c:{edition:number})=>c.edition===2023).slice(0,2);
 const assumptions=cases.flatMap((c:{match_key:string;home_team_id:number;away_team_id:number})=>[c.home_team_id,c.away_team_id].map(team_id=>({match_key:c.match_key,team_id,star_power:0,clutch:25})));
 await page.getByLabel('Versioned assumption package JSON').fill(JSON.stringify({assumption_package_id:'automated-browser-test-only-v1',assumptions}));await page.getByRole('button',{name:'Apply explicit assumption package'}).click();
 pending=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();const scored=await (await pending).json();expect(scored.eligible_matches).toBe(2);expect(scored.protocol_summaries[0].eligible).toBe(0);expect(scored.metrics_horizon_minutes).toBe(90);
 await expect(page.getByRole('table',{name:/Confusion matrix/})).toBeVisible();
 const allAssumptions=full.cases.flatMap((c:{match_key:string;home_team_id:number;away_team_id:number})=>[c.home_team_id,c.away_team_id].map(team_id=>({match_key:c.match_key,team_id,star_power:0,clutch:25})));
 const allResponse=await request.post(endpoint,{data:{dataset_id:fullDatasetId,limit:348,mode:'retrospective_assumptions',assumption_package_id:'automated-full-browser-test-only-v1',assumptions:allAssumptions}});
 expect(allResponse.status()).toBe(200);const allScored=await allResponse.json();expect(allScored.eligible_matches).toBe(301);expect(allScored.excluded_matches).toBe(47);expect(allScored.protocol_summaries[0].accuracy).toBeNull();
});

test('reviewed recovery improves rating coverage without manufacturing historical accuracy',async({page,request})=>{
 await page.goto('/analytics');
 await page.getByRole('combobox',{name:'Evaluation dataset',exact:true}).selectOption(fullDatasetId);
 await page.getByRole('combobox',{name:/Historical results/}).selectOption('recovered');
 const pending=page.waitForResponse(r=>r.url().endsWith(endpoint));
 await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const response=await pending;expect(response.status()).toBe(200);const body=await response.json();
 expect(body.recovery_package_id).toBe('international-results-recovery-v1');
 expect(body.total_candidate_matches).toBe(348);expect(body.edition_summaries).toHaveLength(9);
 expect(body.edition_summaries.reduce((n:number,s:{rating_complete:number})=>n+s.rating_complete,0)).toBe(340);
 expect(body.eligible_matches).toBe(0);expect(body.accuracy).toBeNull();
 expect(body.exclusion_reasons.historical_star_power_clutch_evidence_missing).toBe(348);
 expect(body.exclusion_reasons.model_80_minute_horizon_unvalidated).toBe(26);
 await expect(page.getByText('Historical results: reviewed recovery additions v1.')).toBeVisible();
 await expect(page.getByText(/Historical accuracy unavailable/)).toBeVisible();
 const replay=await request.post(endpoint,{data:response.request().postDataJSON()});expect(await replay.json()).toEqual(body);
 const empty=await request.post(endpoint,{data:{...response.request().postDataJSON(),mode:'retrospective_assumptions',assumption_package_id:'browser-test-no-values-v1'}});
 const excluded=await empty.json();expect(excluded.excluded_matches).toBe(348);expect(excluded.exclusion_reasons.explicit_star_power_clutch_assumptions_missing).toBe(348);expect(excluded.accuracy).toBeNull();
 await page.getByRole('combobox',{name:/Historical results/}).selectOption('original');
 await expect(page.getByLabel('Evaluation results')).toHaveCount(0);
});

test('1991 exposure protocol reports all cases and preserves horizon separation',async({page})=>{
 await page.goto('/analytics');
 await page.getByRole('combobox',{name:'Evaluation dataset',exact:true}).selectOption('womens-world-cup-full-v1');
 await page.getByRole('combobox',{name:/Historical results/}).selectOption('recovered');
 await page.getByRole('combobox',{name:/1991 research protocol/}).selectOption('exposure');
 const pending=page.waitForResponse(r=>r.url().endsWith(endpoint));
 await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const response=await pending;expect(response.status()).toBe(200);const data=await response.json();
 expect(data.cases).toHaveLength(348);expect(data.accuracy).toBeNull();expect(data.metrics_horizon_minutes).toBe(90);
 const group=data.protocol_summaries[0];expect(group.total).toBe(26);expect(group.excluded).toBe(26);expect(group.rating_complete).toBe(20);expect(group.prediction_model_version).toBe('odf-exposure-80-evidence-blocked-v1');
 await expect(page.getByRole('heading',{name:'80-minute research — evidence blocked'})).toBeVisible();
 for(const c of data.cases.filter((c:{edition:number})=>c.edition===1991)){expect(c.probabilities).toBeNull();expect(c.evidence_record.research.eligible).toBe(false);}
 await page.getByRole('combobox',{name:'World Cup edition',exact:true}).selectOption('1991');
 await page.getByRole('combobox',{name:/1991 research protocol/}).selectOption('exposure');
 const again=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 expect((await (await again).json()).cases).toHaveLength(26);
});

test('three-input research replay uses real pinned probabilities with strict gates and paired diagnostics',async({page})=>{
 await page.goto('/analytics');
 await page.getByRole('combobox',{name:'Evaluation dataset',exact:true}).selectOption(fullDatasetId);
 await page.getByRole('combobox',{name:'Evaluation model',exact:true}).selectOption('odf-cross-goal-rate-research-v1');
 await expect(page.getByRole('combobox',{name:/Historical results/})).toBeDisabled();
 let pending=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const strict=await (await pending).json();expect(strict.eligible_matches).toBe(0);expect(strict.research_validation.comparisons).toEqual({});
 await page.getByRole('combobox',{name:'Evaluation mode',exact:true}).selectOption('retrospective_replay');
 await page.getByRole('combobox',{name:/1991 research protocol/}).selectOption('exposure');
 pending=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const response=await pending;expect(response.status()).toBe(200);const data=await response.json();
 expect(data.cases).toHaveLength(348);expect(data.eligible_matches).toBe(320);expect(data.excluded_matches).toBe(28);expect(data.accuracy).toBe(.553125);
 await expect(page.getByRole('heading',{name:'Research-only retrospective temporal replay',exact:true})).toBeVisible();
 await expect(page.getByRole('table',{name:/baseline common — common cohort/})).toBeVisible();
 await expect(page.getByRole('table',{name:/Confusion matrix/})).toBeVisible();
 await page.getByText('Evaluation identity and reproducibility',{exact:true}).click();
 await expect(page.getByText('Assumption package: None — retrospective replay uses pinned inputs',{exact:true})).toBeVisible();
 await expect(page.getByText('Recovery package: international-results-recovery-v1',{exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Evaluation model',exact:true}).selectOption('odf-temperature-research-v1');
 await expect(page.getByLabel('Evaluation results')).toHaveCount(0);
 await page.getByRole('combobox',{name:'Evaluation mode',exact:true}).selectOption('retrospective_replay');
 pending=page.waitForResponse(r=>r.url().endsWith(endpoint));await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const calibrated=await (await pending).json();expect(calibrated.eligible_matches).toBe(200);expect(calibrated.cases.filter((c:{status:string})=>c.status==='eligible').every((c:{edition:number})=>c.edition>2007)).toBe(true);
});

// Keep responsive checks separate from the edition/model replay contract budget.
test('research tables preserve numeric lines and keyboard scrolling at all three widths',async({page})=>{
 await page.goto('/analytics');
 await page.getByRole('combobox',{name:'Evaluation dataset',exact:true}).selectOption(fullDatasetId);
 await page.getByRole('combobox',{name:'Evaluation model',exact:true}).selectOption('odf-cross-goal-rate-research-v1');
 await page.getByRole('combobox',{name:'Evaluation mode',exact:true}).selectOption('retrospective_replay');
 const pending=page.waitForResponse(r=>r.url().endsWith(endpoint));
 await page.getByRole('button',{name:'Run evaluation',exact:true}).click();
 const response=await pending;expect(response.status()).toBe(200);
 await expect(page.getByRole('table',{name:/Confusion matrix/})).toBeVisible();
 for(const width of [375,768,1440]) {
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const region of await page.locator('.evaluation-table-scroll').all()) {
   await region.focus();await expect(region).toBeFocused();
   const geometry=await region.evaluate(el=>{
    const cells=Array.from(el.querySelectorAll('td')).filter(td=>el.getAttribute('data-numeric')==='true'||td.classList.contains('evaluation-number'));
    return {overflow:el.scrollWidth>el.clientWidth, intact:cells.every(td=>{const range=document.createRange();range.selectNodeContents(td);return new Set(Array.from(range.getClientRects()).map(rect=>rect.top)).size<=1 && getComputedStyle(td).whiteSpace==='nowrap';})};
   });
   expect(geometry.intact).toBe(true);
   if(geometry.overflow){await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);}
  }
 }

});

// Each edition retains every replay assertion with an independent bounded timeout.
for(const [year,count] of Object.entries(editionCounts)) {
 test(`three-input research replay preserves the ${year} cohort and eligible horizon`,async({request})=>{
  const r=await request.post(endpoint,{data:{dataset_id:fullDatasetId,mode:'retrospective_replay',offset:0,limit:348,assumption_package_id:null,assumptions:[],prediction_model_version:'odf-cross-goal-rate-research-v1',recovery_package_id:'international-results-recovery-v1',edition:Number(year)}});
  expect(r.status()).toBe(200);const d=await r.json();expect(d.cases).toHaveLength(count);
  expect(d.eligible_matches).toBe(year==='1991'?0:year==='1999'?30:count);
  expect(d.cases.every((c:{regulation_minutes:number;status:string})=>c.status!=='eligible'||c.regulation_minutes===90)).toBe(true);
 });
}
