import {expect, test, type Page, type APIRequestContext} from '@playwright/test';
import {readFileSync, writeFileSync, openSync, closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import fixtures from '../../src/lib/fixtures/backend-v2-predictions.json';
import {strengthFields} from '../../src/lib/football';

test.setTimeout(60_000);
let owned: {session:string;database:string;teams:Record<string,number>;mixed_scenario_id:number;legacy_prediction_id:number};
test.beforeAll(async ({browser})=>{
 owned=JSON.parse(readFileSync('/tmp/goalstats-normalized.json','utf8'));
 expect(owned.session).toBe(process.env.NORMALIZED_SESSION);
 expect(owned.database).toBe(`goalstats_test_${owned.session}`);
 expect(process.versions.node).toBe('24.22.3');
 writeFileSync('/artifacts/browser-version.txt',`${browser.version()}\nNode ${process.version}\n`);
});
async function api(request:APIRequestContext,path:string){
 const response=await request.get(`/api/football/${path}`);expect(response.ok()).toBeTruthy();return response.json();
}
async function selectTeams(page:Page,first='United States',second='Germany'){
 // Wait for the selected comparison's response, not an unrelated initial request.
 const comparison = new URL(page.url()).pathname === '/teams';
 if(comparison)await expect(page.getByRole('combobox',{name:'Team 1',exact:true}).locator('option')).toHaveCount(44);
 const changed = comparison && (
  await page.getByRole('combobox',{name:'Team 1',exact:true}).inputValue() !== String(owned.teams[first]) ||
  await page.getByRole('combobox',{name:'Team 2',exact:true}).inputValue() !== String(owned.teams[second]));
 const response = changed ? page.waitForResponse(r=>{
  const url=new URL(r.url());
  return url.pathname==='/api/football/catalog/matches/insights' &&
   url.searchParams.get('team1_id')===String(owned.teams[first]) &&
   url.searchParams.get('team2_id')===String(owned.teams[second]) && url.searchParams.get('offset')==='0';
 }) : undefined;
 // Playwright emits change even for an already-selected option; a user does not.
 for(const [name,label] of [['Team 1',first],['Team 2',second]]){
  const select=page.getByRole('combobox',{name,exact:true});
  if(await select.locator('option:checked').textContent()!==label)await select.selectOption({label});
 }
 if(response){const loaded=await response;expect(loaded.status()).toBe(200);await loaded.finished();}
}
async function preview(page:Page,fixture=fixtures[0]){
 await page.goto('/matches');
 await expect(page.getByRole('combobox',{name:'Team 1',exact:true}).locator('option')).toHaveCount(45);
 await selectTeams(page,'China','Norway');
 for(const side of [1,2] as const)for(const field of strengthFields){
  await page.getByRole('spinbutton',{name:`Team ${side} ${field.replace('_',' ')}`,exact:true}).fill(String(fixture.request[`team${side}_${field}`]));
 }
 await page.getByRole('spinbutton',{name:'Minute',exact:true}).fill(String(fixture.minute));
 await page.getByRole('spinbutton',{name:'China Score',exact:true}).fill(String(fixture.request.team1_goals));
 await page.getByRole('spinbutton',{name:'Norway Score',exact:true}).fill(String(fixture.request.team2_goals));
 await page.getByRole('spinbutton',{name:'China Total Shots',exact:true}).fill('4');
 await page.getByRole('spinbutton',{name:'China Shots on Target',exact:true}).fill('4');
 const result=page.waitForResponse(r=>r.url().endsWith('/api/football/predictions/preview')&&r.request().method()==='POST');
 const navigation=page.waitForURL(/\/predictions$/);
 await page.getByRole('button',{name:'Generate Preview →'}).click();
 const response=await result;expect(response.status()).toBe(200);
 const sent=response.request().postDataJSON();expect(sent.team1_shots).toBe(4);expect(sent.team1_shots_on_target).toBe(4);
 await navigation;
 await expect(page).toHaveURL(/\/predictions$/);
 return response.json();
}

test('Teams shows all accepted totals, selection changes and real history pagination',async({page,request})=>{
 await page.goto('/teams');await expect(page.getByRole('combobox',{name:'Team 1',exact:true}).locator('option')).toHaveCount(44);
 await selectTeams(page);
 const summary=page.getByRole('region',{name:'United States historical summary'});
 const expected=await api(request,`catalog/teams/${owned.teams['United States']}/summary`);
 expect(expected).toMatchObject({matches_played:54,wins:41,draws:9,losses:4,goals_for:142,goals_against:39,goal_difference:103,tournament_appearances:9});
 for(const [label,value] of Object.entries({'Matches played':54,Wins:41,Draws:9,Losses:4,'Goals scored':142,'Goals conceded':39,'Goal difference':103,'World Cup appearances':9})){
  await expect(summary.locator('dl > div').filter({has:page.getByText(label,{exact:true})}).getByRole('definition')).toHaveText(String(value));
 }
 await expect(page.getByRole('button',{name:'Next history page'})).toBeEnabled();
 const next=page.waitForResponse(r=>r.url().includes('/matches/insights?')&&r.url().includes('offset=50'));
 await page.getByRole('button',{name:'Next history page'}).click();expect((await (await next).json()).team1_history).toHaveLength(4);
 await expect(page.getByRole('button',{name:'Next history page'})).toBeDisabled();await expect(summary.getByText('54',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Previous history page'}).click();await expect(page.getByRole('button',{name:'Next history page'})).toBeEnabled();
 await page.getByRole('button',{name:'Next history page'}).click();await expect(page.getByText(/History page 2/)).toBeVisible();
 await page.getByRole('combobox',{name:'Team 1',exact:true}).selectOption({label:'Spain'});
 await expect(page.getByText(/History page 1/)).toBeVisible();
 await expect(page.getByRole('region',{name:'Spain historical summary'}).getByText('14',{exact:true})).toBeVisible();
});

test('Teams distinguishes delayed, empty and failed catalog responses',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/football/catalog/teams',async route=>{await gate;await route.fulfill({json:[]});});
 await page.goto('/teams');await expect(page.getByText('Loading teams...')).toBeVisible();release();
 await expect(page.getByText('No teams are available. Comparison requires at least two teams.')).toBeVisible();
 await page.unrouteAll({behavior:'wait'});
 await page.route('**/api/football/catalog/teams',route=>route.fulfill({status:503,json:{detail:'Injected catalog failure'}}));
 await page.reload();await expect(page.getByRole('main').getByText('Injected catalog failure',{exact:true})).toBeVisible();await expect(page.getByText(/No teams are available/)).toHaveCount(0);
});

test('Teams ignores a delayed old page after selection and labels an empty later page',async({page})=>{
 await page.goto('/teams');await selectTeams(page);await expect(page.getByRole('button',{name:'Next history page'})).toBeEnabled();
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let started!:()=>void;const received=new Promise<void>(resolve=>{started=resolve;});
 await page.route('**/api/football/catalog/matches/insights?**',async route=>{
  if(new URL(route.request().url()).searchParams.get('offset')!=='50')return route.continue();
  const response=await route.fetch();started();await gate;await route.fulfill({response});
 });
 await page.getByRole('button',{name:'Next history page'}).click();await received;
 await page.getByRole('combobox',{name:'Team 1',exact:true}).selectOption({label:'Spain'});release();
 await expect(page.getByText(/History page 1/)).toBeVisible();await expect(page.getByRole('region',{name:'Spain historical summary'}).getByText('14',{exact:true})).toBeVisible();
 await page.unrouteAll({behavior:'wait'});
 await selectTeams(page);await expect(page.getByRole('button',{name:'Next history page'})).toBeEnabled();
 await page.route('**/api/football/catalog/matches/insights?**',async route=>{
  const response=await route.fetch();const body=await response.json();
  await route.fulfill({response,json:body.offset===50?{...body,head_to_head:[],team1_history:[],team2_history:[]}:body});
 });
 await page.getByRole('button',{name:'Next history page'}).click();await expect(page.getByText('No matches on this page. Use Previous history page to see earlier records.')).toHaveCount(2);
 await expect(page.getByRole('button',{name:'Previous history page'})).toBeEnabled();
});

test('Matches filters real editions/teams and follows limit/offset through empty and failed pages',async({page})=>{
 await page.goto('/matches');const section=page.getByRole('region',{name:'Historical matches'});
 await expect(section.locator('li')).toHaveCount(50);
 const next=page.waitForResponse(r=>r.url().includes('/catalog/matches?')&&r.url().includes('offset=50'));
 await page.getByRole('button',{name:'Next page',exact:true}).click();expect((await next).url()).toContain('limit=50');await expect(section.locator('li')).toHaveCount(50);
 await page.getByRole('button',{name:'Previous page',exact:true}).click();await expect(page.getByText('Page 1',{exact:true})).toBeVisible();
 const edition=page.getByRole('combobox',{name:'Competition edition'});await edition.selectOption({label:"FIFA Women's World Cup · 2023"});
 await page.getByRole('combobox',{name:'Historical team'}).selectOption({label:'Spain'});await expect(section.locator('li')).toHaveCount(7);
 await edition.selectOption({label:"FIFA Women's World Cup · 1991"});await expect(page.getByText(/No historical matches on this page/)).toBeVisible();
 await page.route('**/api/football/catalog/matches?**',route=>route.fulfill({status:503,json:{detail:'Injected match failure'}}));
 await edition.selectOption({label:"FIFA Women's World Cup · 1995"});await expect(page.getByText('Injected match failure')).toBeVisible();await expect(page.getByText(/No historical matches on this page/)).toHaveCount(0);
});

for(const fixture of fixtures)test(`v2 minute ${fixture.minute} preview uses actual backend math and does not persist`,async({page,request})=>{
 const before=await api(request,'scenarios?limit=200');
 const result=await preview(page,fixture);expect(result).toEqual(fixture.output);
 for(const value of Object.values(result.probabilities) as number[])await expect(page.getByText(`${(value*100).toFixed(1)}%`,{exact:true}).first()).toBeVisible();
 await expect(page.getByText(`${result.confidence.percent.toFixed(1)}%`,{exact:true}).first()).toBeVisible();
 await expect(page.getByText(/Confidence is a heuristic/)).toBeVisible();
 await expect(page.getByText(fixture.minute>=90?/summarizes the supplied current score/:/nominal 90-minute horizon/)).toBeVisible();
 expect(await api(request,'scenarios?limit=200')).toEqual(before);
});

test('save, durable reopen, PATCH and regenerate preserve immutable prior prediction',async({page,request})=>{
 await preview(page);
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(new URL(r.url()).pathname);});
 const generated=page.waitForResponse(r=>/\/scenarios\/\d+\/predictions$/.test(r.url())&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Save new scenario and prediction'}).click();const response=await generated;
 expect(response.status()).toBe(201);expect(response.request().postData()).toBeNull();const saved=await response.json();
 expect(posts).toEqual(['/api/football/scenarios',`/api/football/scenarios/${saved.scenario_id}/predictions`]);
 await expect(page).toHaveURL(new RegExp(`prediction_id=${saved.prediction_id}$`));await page.reload();await expect(page.getByText(`Saved prediction #${saved.prediction_id}`,{exact:false})).toBeVisible();
 const originalScenario=await api(request,`scenarios/${saved.scenario_id}`);expect(originalScenario.team1_shots).toBe(4);expect(saved.input_snapshot.team1_shots).toBe(4);
 await page.goto(`/matches?scenario_id=${saved.scenario_id}`);await expect(page.getByText(`Editing scenario #${saved.scenario_id}.`,{exact:false})).toBeVisible();
 await page.getByRole('spinbutton',{name:'Minute',exact:true}).fill('90');const patched=page.waitForResponse(r=>r.request().method()==='PATCH');
 await page.getByRole('button',{name:'Save scenario changes'}).click();const patch=await patched;expect(patch.request().postDataJSON()).toEqual({match_minute:90});expect(patch.status()).toBe(200);
 expect(await api(request,`scenarios/${saved.scenario_id}`)).toEqual({...originalScenario,match_minute:90});
 expect(await api(request,`scenarios/${saved.scenario_id}/predictions`)).toEqual([saved]);
 expect(await api(request,`predictions/${saved.prediction_id}`)).toEqual(saved);
 await page.goto(`/predictions?prediction_id=${saved.prediction_id}`);await expect(page.getByText('Minute 89',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Generate another saved prediction'}).click();await expect(page.getByText(/Prediction #\d+ saved for scenario/)).toBeVisible();
 expect(await api(request,`scenarios/${saved.scenario_id}/predictions`)).toHaveLength(2);expect(await api(request,`predictions/${saved.prediction_id}`)).toEqual(saved);
});

test('mixed v1/v2 history paginates to empty and restores both Predictions and Analytics',async({page,request})=>{
 const records=await api(request,`scenarios/${owned.mixed_scenario_id}/predictions?limit=50&offset=0`);
 expect(records).toHaveLength(50);expect(new Set(records.map((r:{model_version:string})=>r.model_version)).size).toBe(2);
 await page.goto(`/predictions?scenario_id=${owned.mixed_scenario_id}`);await expect(page.getByRole('button',{name:/Open prediction #/})).toHaveCount(50);
 await page.getByRole('button',{name:'Next predictions'}).click();await expect(page.getByText(/No predictions on this page/)).toBeVisible();
 await page.getByRole('button',{name:'Previous predictions'}).click();await expect(page.getByRole('button',{name:/Open prediction #/})).toHaveCount(50);
 await page.getByRole('button',{name:new RegExp(`Open prediction #${owned.legacy_prediction_id} ·`)}).click();await expect(page.getByText(/road-to-the-final-heuristic-v1/)).toBeVisible();
 expect(await api(request,`scenarios/${owned.mixed_scenario_id}/predictions?limit=50&offset=0`)).toEqual(records);
 await page.goto(`/analytics?prediction_id=${records[0].prediction_id}`);await expect(page.getByRole('button',{name:'Next predictions'})).toBeEnabled();
 await page.getByRole('button',{name:'Next predictions'}).click();await expect(page.getByText(/No predictions on this page/)).toBeVisible();
 await page.getByRole('button',{name:'Previous predictions'}).click();await expect(page.getByRole('button',{name:'Next predictions'})).toBeEnabled();
});

test('rejected creation and lost generation response preserve retry safeguards',async({page,request})=>{
 await preview(page);
 await page.route('**/api/football/scenarios',route=>route.fulfill({status:400,json:{detail:'Injected rejected save'}}));
 await page.getByRole('button',{name:'Save new scenario and prediction'}).click();await expect(page.getByText(/Injected rejected save.*preview is preserved/)).toBeVisible();
 await page.unrouteAll({behavior:'wait'});
 let generated=0;let scenarioId=0;
 await page.route(/\/api\/football\/scenarios\/\d+\/predictions$/,async route=>{
  if(route.request().method()!=='POST')return route.continue();
  generated++;scenarioId=Number(new URL(route.request().url()).pathname.split('/')[4]);
  const response=await route.fetch();expect(response.status()).toBe(201);await route.abort('failed');
 });
 await page.getByRole('button',{name:'Save new scenario and prediction'}).click();await expect(page.getByText(/Generation outcome is uncertain/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Generate another saved prediction'})).toBeDisabled();expect(generated).toBe(1);
 await page.reload();await expect(page.getByText(/A prediction generation may have completed/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Generate saved prediction',exact:true})).toBeDisabled();
 expect(await api(request,`scenarios/${scenarioId}/predictions`)).toHaveLength(1);expect(generated).toBe(1);
});

test('backend outage recovers without empty-data claims; invalid inputs are rejected',async({page,request})=>{
 // This PID belongs to the server spawned in this isolated runner, never a host process.
 const pid=Number(readFileSync('/tmp/normalized-flask.pid','utf8'));process.kill(pid,'SIGTERM');
 try{
  await page.goto('/teams');await expect(page.getByRole('main').getByText(/Football service is unavailable/)).toBeVisible();await expect(page.getByText(/No teams are available/)).toHaveCount(0);
 }finally{
  const fd=openSync('/artifacts/flask-recovery.log','a');
  const child=spawn('python',['-m','gunicorn','--chdir','/service','--bind','127.0.0.1:5100','--workers','1','main:create_app()'],{env:process.env,stdio:['ignore',fd,fd]});closeSync(fd);
  expect(child.pid).toBeDefined();writeFileSync('/tmp/normalized-flask.pid',String(child.pid));
  await expect.poll(async()=>{try{return (await request.get('http://127.0.0.1:5100/ready')).status();}catch{return 0;}},{timeout:15000}).toBe(200);
 }
 await page.reload();await expect(page.getByRole('combobox',{name:'Team 1',exact:true}).locator('option')).toHaveCount(44);
 const response=await request.post('/api/football/predictions/preview',{data:{...fixtures[0].request,team1_id:owned.teams.China,team2_id:owned.teams.Norway,match_minute:121}});
 expect(response.status()).toBe(400);
});

test('an owned scenario with no predictions has a truthful initial empty history',async({page,request})=>{
 const {extra_minute,status,...input}={...fixtures[0].request,team1_shots:4};void extra_minute;void status;
 const response=await request.post('/api/football/scenarios',{data:{...input,team1_id:owned.teams.China,team2_id:owned.teams.Norway}});
 expect(response.status()).toBe(201);const scenario=await response.json();
 await page.goto(`/predictions?scenario_id=${scenario.scenario_id}`);
 await expect(page.getByText(`No saved predictions exist for scenario #${scenario.scenario_id} yet.`)).toBeVisible();
 await expect(page.getByRole('button',{name:'Previous predictions'})).toBeDisabled();
 expect(await api(request,`scenarios/${scenario.scenario_id}/predictions`)).toEqual([]);
 await page.goto(`/analytics?scenario_id=${scenario.scenario_id}`);await expect(page.getByText(/no saved predictions yet/)).toBeVisible();
});

test('invalid browser minute cannot submit a preview',async({page})=>{
 await page.goto('/matches');await selectTeams(page,'China','Norway');
 for(const side of [1,2])for(const field of strengthFields)await page.getByRole('spinbutton',{name:`Team ${side} ${field.replace('_',' ')}`,exact:true}).fill('70');
 await page.getByRole('spinbutton',{name:'Minute',exact:true}).fill('121');
 const posts:string[]=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 await page.getByRole('button',{name:'Generate Preview →'}).click();
 expect(await page.getByRole('spinbutton',{name:'Minute',exact:true}).evaluate((element:HTMLInputElement)=>element.validity.rangeOverflow)).toBe(true);
 expect(posts).toEqual([]);await expect(page).toHaveURL(/\/matches$/);
});

test('shared pink actions meet normal-text contrast in every enabled state',async({page})=>{
 for(const width of [375,1440]) {
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/project','/matches','/predictions','/analytics']) {
   await page.goto(route);
   for(const action of await page.locator('.goalstats-primary:visible').all()) {
    if(await action.isDisabled()) continue; // Inactive controls are exempt; existing disabled opacity is intentional.
    const check=async()=>{
     await expect.poll(()=>action.evaluate(el=>{
      const s=getComputedStyle(el);const luminance=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
      const a=luminance(s.color),b=luminance(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
     })).toBeGreaterThanOrEqual(4.5);
    };
    await page.mouse.move(0,0);await check();
    await action.hover();await check();
    await page.mouse.down();try{await check();}finally{await page.mouse.move(0,0);await page.mouse.up();}
    await action.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(action).toBeFocused();await check();
    expect(await action.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
   }
  }
 }
});
