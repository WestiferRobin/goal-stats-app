import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fixture, request as syntheticRequest } from '../../src/features/analytics/domain/backtesting.fixtures';
import type { BacktestRequest } from '../../src/features/analytics/domain/backtesting';
const endpoint = '/api/football/evaluations/backtests';
test.setTimeout(90_000);
test.beforeAll(() => {
 const owned=JSON.parse(readFileSync('/tmp/goalstats-normalized.json','utf8'));
 expect(owned.session).toBe(process.env.NORMALIZED_SESSION);expect(owned.database).toBe(`goalstats_test_${owned.session}`);
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
