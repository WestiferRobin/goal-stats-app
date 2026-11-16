import { expect, test, type Page } from '@playwright/test';
import { readFileSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { strengthFields, type Team } from '../../src/lib/football';

test.setTimeout(90_000);
const endpoint = '/api/football/competitions/simulate';
let catalog: Team[];
test.beforeAll(async ({ request }) => {
  const owned = JSON.parse(readFileSync('/tmp/goalstats-normalized.json', 'utf8'));
  expect(owned.session).toBe(process.env.NORMALIZED_SESSION);
  expect(owned.database).toBe(`goalstats_test_${owned.session}`);
  const response = await request.get('/api/football/catalog/teams'); expect(response.status()).toBe(200);
  catalog = await response.json(); expect(catalog).toHaveLength(44);
});
const chosenNames = ['United States', 'Germany', 'Spain', 'Equatorial Guinea'];
async function setup(page: Page, size = 4) {
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Monte Carlo Tournament Simulation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select United States', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Tournament size', exact: true }).selectOption(String(size));
  const selected = size === 4 ? chosenNames : catalog.slice(0, size).map(t => t.name);
  for (const name of selected) await page.getByRole('button', { name: `Select ${name}`, exact: true }).click();
  return selected;
}
async function ratings(page: Page, names = chosenNames) {
  for (const name of names) for (const field of strengthFields) {
    const label = field === 'star_power' ? 'Star Power' : field[0].toUpperCase() + field.slice(1);
    await page.getByLabel(`${name} ${label}`, { exact: true }).fill(field === 'star_power' ? '0' : '65.5');
  }
}
async function run(page: Page) {
  const response = page.waitForResponse(r => r.url().endsWith(endpoint) && r.request().method() === 'POST');
  await page.getByRole('button', { name: /^(Run|Retry) simulation$/ }).click();
  const received = await response; expect(received.status()).toBe(200);
  const data = await received.json();
  await expect(page.getByText(`Random seed used: ${data.seed}`, { exact: false })).toBeVisible();
  return { data, payload: received.request().postDataJSON() };
}
async function invalid(page: Page, message: RegExp) {
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(message);
}
function payload(size = 4) {
  return { teams: catalog.slice(0, size).map(t => ({ team_id: t.team_id, offense: 65.5, defense: 65.5, form: 65.5, star_power: 0, clutch: 65.5, fifa_rank: t.fifa_rank })), simulations: 1000, seed: 0 };
}
function invariants(data: {results: {team_id:number;semifinal_probability:number;final_probability:number;champion_probability:number}[]}, ids: number[]) {
  expect(data.results.map(r => r.team_id).sort((a,b) => a-b)).toEqual([...ids].sort((a,b) => a-b));
  const sum = (key: 'champion_probability' | 'final_probability' | 'semifinal_probability') => data.results.reduce((n,r) => n+r[key], 0);
  expect(Math.abs(sum('champion_probability') - 100)).toBeLessThanOrEqual(ids.length * .005 + .001);
  expect(Math.abs(sum('final_probability') - 200)).toBeLessThanOrEqual(ids.length * .005 + .001);
  expect(Math.abs(sum('semifinal_probability') - 400)).toBeLessThanOrEqual(ids.length * .005 + .001);
  for (const row of data.results) { expect(row.champion_probability).toBeGreaterThanOrEqual(0); expect(row.champion_probability).toBeLessThanOrEqual(row.final_probability); expect(row.final_probability).toBeLessThanOrEqual(row.semifinal_probability); expect(row.semifinal_probability).toBeLessThanOrEqual(100); }
}

test('direct navigation, selection, sizes, explicit prefill and manual missing ratings', async ({ page }) => {
  await setup(page); await expect(page.getByRole('heading', { name: 'No Match Loaded' })).toBeVisible();
  await expect(page.getByText(/Selected 4 of 4 teams/)).toBeVisible();
  for (const size of [8,16,32,4]) { await page.getByRole('combobox', { name: 'Tournament size', exact: true }).selectOption(String(size)); await expect(page.getByText(`Selected 4 of ${size} teams.`, { exact:false })).toBeVisible(); }
  await page.getByRole('button', { name:'Select United States', exact:true }).click();
  await expect(page.getByText(/Selected 3 of 4 teams/)).toBeVisible(); await invalid(page, /exactly 4/);
  await page.getByRole('button', { name:'Select United States', exact:true }).click();
  await expect(page.getByLabel('United States Offense', {exact:true})).toHaveValue('');
  await page.getByRole('button', { name:'Prefill experimental ratings for United States', exact:true }).click();
  const us = catalog.find(t => t.name === 'United States')!;
  await expect(page.getByLabel('United States Offense', {exact:true})).toHaveValue(String(us.offense));
  await expect(page.getByLabel('United States Star Power', {exact:true})).toHaveValue('');
  await expect(page.getByLabel('United States Clutch', {exact:true})).toHaveValue('');
  const participant = page.locator('li').filter({has:page.getByLabel('United States Offense', {exact:true})});
  await participant.locator('summary').click(); await expect(participant.getByText(/Cutoff: 2026-06-10/)).toBeVisible();
  await page.getByLabel('United States Offense', {exact:true}).fill('0');
  await page.getByRole('button', { name:'Prefill experimental ratings for United States', exact:true }).click();
  await expect(page.getByLabel('United States Offense', {exact:true})).toHaveValue('0');
  await page.getByRole('button', {name:'Cancel replacement'}).click();
  await page.getByRole('button', { name:'Prefill experimental ratings for United States', exact:true }).click();
  await page.getByRole('button', {name:'Confirm replacement'}).click();
  await expect(page.getByLabel('United States Offense', {exact:true})).toHaveValue(String(us.offense));
  await expect(page.getByRole('button', {name:'Prefill experimental ratings for Equatorial Guinea'})).toBeDisabled();
  await expect(page.getByLabel('Equatorial Guinea Offense', {exact:true})).toHaveValue('');
  await page.getByLabel('Equatorial Guinea Offense', {exact:true}).fill('0');
  await page.getByRole('button', {name:'Clear',exact:true}).click(); await expect(page.getByText(/Selected 0 of 4 teams/)).toBeVisible();
  await page.getByRole('button', {name:'Select Top Ranked'}).click(); await expect(page.getByText(/Selected 4 of 4 teams/)).toBeVisible();
  const first = [...catalog].sort((a,b)=>a.fifa_rank!-b.fifa_rank!)[0];
  await expect(page.getByText(`Slot 1: ${first.name} — paired with Slot 2`)).toBeVisible();
  for (const name of ['Teams','Matches','Predictions','Analytics']) { await page.getByRole('navigation', {name:'Product views'}).getByRole('link',{name,exact:true}).click(); await expect(page).toHaveURL(new RegExp(`/${name.toLowerCase()}$`)); }
  await expect(page.getByRole('button',{name:'Run simulation',exact:true})).toBeVisible();
});

test('invalid ratings, counts and seeds never submit; zero and decimals remain valid inputs', async ({ page }) => {
  await setup(page); const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
  await invalid(page,/United States: Offense/); await ratings(page);
  for (const value of ['', '-1', '101']) { await page.getByLabel('United States Offense',{exact:true}).fill(value); await invalid(page,/Offense/); }
  await page.getByLabel('United States Offense',{exact:true}).fill('');
  await page.getByLabel('United States Offense',{exact:true}).pressSequentially('abc');
  await invalid(page,/Offense/); await page.getByLabel('United States Offense',{exact:true}).fill('0');
  for(const value of ['999','2001','1000.5']) { await page.getByLabel('Simulation count',{exact:true}).fill(value); await invalid(page,/Simulation count/); }
  await page.getByLabel('Simulation count',{exact:true}).fill('1000');
  for(const value of ['-1','4294967296','1.5']) { await page.getByLabel('Random seed (optional)',{exact:true}).fill(value); await invalid(page,/Random seed/); }
  expect(posts).toEqual([]);
});

for (const size of [4,8,16,32]) test(`real ${size}-team browser simulation preserves ordered payload and stage invariants`, async ({ page, request }) => {
  const names = await setup(page,size); await ratings(page,names);
  await page.getByRole('button',{name:`Move ${names[0]} down`,exact:true}).click();
  await expect(page.getByText(`Slot 1: ${names[1]} — paired with Slot 2`)).toBeVisible();
  await page.getByLabel('Random seed (optional)',{exact:true}).fill(size === 32 ? '4294967295' : '0');
  if(size === 4) await page.getByLabel('Simulation count',{exact:true}).fill('2000');
  const result = await run(page);
  const ordered = [names[1],names[0],...names.slice(2)].map(name=>catalog.find(t=>t.name===name)!.team_id);
  expect(result.payload.teams.map((t:{team_id:number})=>t.team_id)).toEqual(ordered);
  expect(result.payload.teams.every((t:{star_power:number;offense:number})=>t.star_power===0&&t.offense===65.5)).toBe(true);
  invariants(result.data,ordered);expect(result.data.seed).toBe(size === 32 ? 4294967295 : 0);expect(result.data.simulations).toBe(size===4?2000:1000);
  await expect(page.getByText(`Executed bracket: Slot 1: ${names[1]} · Slot 2: ${names[0]}`,{exact:false})).toBeVisible();
  await expect(page.getByText(`Most likely champion: ${result.data.predicted_champion}`,{exact:false})).toBeVisible();
  expect(result.data.most_common_final).not.toBeNull();
  const replay=await request.post(endpoint,{data:result.payload});expect(replay.status()).toBe(200);expect(await replay.json()).toEqual(result.data);
  const direct=await request.post('http://127.0.0.1:5100/api/v1/competitions/simulate',{data:result.payload});expect(direct.status()).toBe(200);expect(await direct.json()).toEqual(result.data);
});

test('generated seed replays deterministically and edits invalidate prior results',async({page})=>{
  await setup(page);await ratings(page);const first=await run(page);expect(first.payload).not.toHaveProperty('seed');
  await page.getByLabel('Random seed (optional)',{exact:true}).fill(String(first.data.seed));
  await expect(page.getByRole('heading',{name:'Hypothetical Monte Carlo simulation results'})).toHaveCount(0);
  const replay=await run(page);expect(replay.data).toEqual(first.data);
  for(const action of [
    async()=>page.getByLabel('United States Form',{exact:true}).fill('66'),
    async()=>page.getByRole('button',{name:'Move United States down',exact:true}).click(),
    async()=>page.getByLabel('Simulation count',{exact:true}).fill('1001'),
    async()=>page.getByLabel('Random seed (optional)',{exact:true}).fill(String(first.data.seed===1?2:1)),
  ]) { await action();await expect(page.getByRole('heading',{name:'Hypothetical Monte Carlo simulation results'})).toHaveCount(0);await run(page); }
  await page.getByRole('button',{name:'Remove Germany',exact:true}).click();await expect(page.getByRole('heading',{name:'Hypothetical Monte Carlo simulation results'})).toHaveCount(0);
});

test('real API rejects duplicate participants and invalid input contracts',async({request})=>{
  const valid=payload();
  for(const invalid of [
    {...valid,teams:[valid.teams[0],valid.teams[0],...valid.teams.slice(2)]},
    {...valid,teams:valid.teams.slice(0,3)}, {...valid,simulations:999}, {...valid,simulations:2001}, {...valid,simulations:1000.5},
    {...valid,seed:-1}, {...valid,seed:4294967296}, {...valid,seed:1.5},
    ...[-1,101,'abc',null].map(offense=>({...valid,teams:valid.teams.map((t,i)=>i===0?{...t,offense}:t)})),
  ]) {const response=await request.post(endpoint,{data:invalid});expect(response.status()).toBe(400);}
});

test('loading prevents duplicates; stale completion is ignored and retry uses current inputs',async({page})=>{
  await setup(page);await ratings(page);
  let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let arrived!:()=>void;const started=new Promise<void>(r=>{arrived=r;});let submissions=0;
  await page.route(`**${endpoint}`,async route=>{submissions++;const response=await route.fetch();arrived();await gate;await route.fulfill({response});});
  await page.getByRole('button',{name:'Run simulation',exact:true}).click();await started;
  await expect(page.getByRole('button',{name:'Running simulation...'})).toBeDisabled();expect(submissions).toBe(1);
  await page.getByLabel('Random seed (optional)',{exact:true}).fill('0');release();await page.unrouteAll({behavior:'wait'});
  await expect(page.getByRole('heading',{name:'Hypothetical Monte Carlo simulation results'})).toHaveCount(0);
  const current=await run(page);expect(current.payload.seed).toBe(0);expect(current.data.seed).toBe(0);
});

test('malformed responses fail safely; nullable final and ranks render; retry preserves inputs',async({page})=>{
  await setup(page);await ratings(page);
  await page.route(`**${endpoint}`,async route=>{const response=await route.fetch();const data=await response.json();data.results[0].team_id=999999;await route.fulfill({response,json:data});});
  await page.getByRole('button',{name:'Run simulation',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('Invalid tournament response');
  await expect(page.getByRole('heading',{name:'Hypothetical Monte Carlo simulation results'})).toHaveCount(0);
  await page.unrouteAll({behavior:'wait'});
  await page.route(`**${endpoint}`,async route=>{const response=await route.fetch();const data=await response.json();data.most_common_final=null;data.results[0].fifa_rank=null;await route.fulfill({response,json:data});});
  await run(page);await expect(page.getByText('Most common final: Unavailable',{exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'Unavailable',exact:true})).toBeVisible();
  await expect(page.getByLabel('United States Offense',{exact:true})).toHaveValue('65.5');
});

test('real proxy timeout is recoverable and keeps current tournament inputs',async({page})=>{
  await setup(page);await ratings(page);
  const master=Number(readFileSync('/tmp/normalized-flask.pid','utf8'));
  const children=readFileSync(`/proc/${master}/task/${master}/children`,'utf8').trim().split(/\s+/).filter(Boolean).map(Number);
  expect(children.length).toBeGreaterThan(0);
  const pids=[master,...children];for(const pid of pids)process.kill(pid,'SIGSTOP');
  try {
    const response=page.waitForResponse(r=>r.url().endsWith(endpoint));
    await page.getByRole('button',{name:'Run simulation',exact:true}).click();
    expect((await response).status()).toBe(504);await expect(page.getByRole('main').getByRole('alert')).toContainText(/timed out/);
  } finally { for(const pid of pids)process.kill(pid,'SIGCONT'); }
  await run(page);await expect(page.getByLabel('United States Offense',{exact:true})).toHaveValue('65.5');
});

test('real backend outage recovers without losing the tournament',async({page,request})=>{
  await setup(page);await ratings(page);
  const pid=Number(readFileSync('/tmp/normalized-flask.pid','utf8'));process.kill(pid,'SIGTERM');
  try {
    await expect.poll(async()=>{try{return (await request.get('http://127.0.0.1:5100/ready',{timeout:1000})).status();}catch{return 0;}}).toBe(0);
    await page.getByRole('button',{name:'Run simulation',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText(/unavailable/);
    await expect(page.getByText(/Selected 4 of 4 teams/)).toBeVisible();
  } finally {
    const fd=openSync('/artifacts/tournament-flask-recovery.log','a');
    const child=spawn('python',['-m','gunicorn','--chdir','/service','--bind','127.0.0.1:5100','--workers','1','main:create_app()'],{env:process.env,stdio:['ignore',fd,fd]});closeSync(fd);
    expect(child.pid).toBeDefined();writeFileSync('/tmp/normalized-flask.pid',String(child.pid));
    await expect.poll(async()=>{try{return (await request.get('http://127.0.0.1:5100/ready')).status();}catch{return 0;}},{timeout:15000}).toBe(200);
  }
  await run(page);
});

test('Teams enrichment and all existing Analytics sections retain real data and placeholders',async({page,request})=>{
  await page.goto('/teams');
  const select=page.getByRole('combobox',{name:'Team 1',exact:true});await expect(select.locator('option')).toHaveCount(44);await select.selectOption({label:'United States'});
  const us=catalog.find(t=>t.name==='United States')!;
  await expect(page.getByText(String(us.fifa_points),{exact:false}).first()).toBeVisible();
  await select.selectOption({label:'Equatorial Guinea'});await expect(page.getByText(/insufficient|unavailable|Unavailable/).first()).toBeVisible();
  const owned=JSON.parse(readFileSync('/tmp/goalstats-normalized.json','utf8'));
  const response=await request.get(`/api/football/scenarios/${owned.mixed_scenario_id}/predictions?limit=1`);const [saved]=await response.json();
  await page.goto(`/analytics?prediction_id=${saved.prediction_id}`);
  for(const name of ['Match Momentum','Probability History','Possession History','Expected Goals Remaining','Saved Match States','Match Statistics']) await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Model Evaluation — Backtesting',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Run evaluation',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Run simulation',exact:true})).toBeVisible();
});
