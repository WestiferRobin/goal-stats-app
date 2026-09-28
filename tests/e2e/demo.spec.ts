import { expect, test } from "@playwright/test";

test("demo maps inputs, renders live/cache states and saves without full-page navigation", async ({ page }) => {
  const state = { team1: "Spain", team2: "England", minute: 65, extra_minute: 0, status: "2H",
    team1_stats: {goals:1,possession:60,shots:8,shots_on_target:4,big_chances:0,defender_blocks:0,goalkeeper_saves:0,corners:0,yellow_cards:0,red_cards:0},
    team2_stats: {goals:0,possession:40,shots:5,shots_on_target:2,big_chances:0,defender_blocks:0,goalkeeper_saves:0,corners:0,yellow_cards:0,red_cards:0} };
  const prediction = {team1:"Spain",team2:"England",minute:65,status:"2H",probabilities:{team1:.65,draw:.2,team2:.15},advancement:{team1:.75,team2:.25},expected_goals_remaining:{team1:.8,team2:.4},momentum_percent:{team1:60,team2:40},most_likely_score:[2,0],top_scorelines:[{team1_goals:2,team2_goals:0,probability:.25}],confidence:{percent:56.25,label:"Medium"},reasoning:["Example reason"],model:"test"};
  const record = {id:"11111111-1111-4111-8111-111111111111",state,prediction,created_at:"2026-09-28T10:00:00Z"};
  let saved=false;
  let unavailable=false;
  let posted: typeof state | undefined;
  const errors: string[]=[];
  page.on("pageerror", error=>errors.push(error.message));
  await page.route("**/api/football/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    let data: unknown;
    let status=200;
    if(path.endsWith("/teams")) data=[{name:"Spain",fifa_rank:1},{name:"England",fifa_rank:2}];
    else if(path.endsWith("/predictions")) {posted=route.request().postDataJSON();data=prediction;}
    else if(path.endsWith("/insights")) data={note:"CSV order, not recent form",head_to_head:[],team1_history:[],team2_history:[]};
    else if(path.endsWith("/snapshots")) {
      if(route.request().method()==="POST") {saved=true;data=record;status=201;} else data=saved?[record]:[];
    } else if(path.endsWith("/live/refresh")) {
      data=unavailable?{detail:"No live or cached match data is available."}:{...record,source:"cached",observed_at:record.created_at};
      status=unavailable?503:200;
    } else throw new Error(`Unexpected demo call: ${path}`);
    await route.fulfill({status,json:data});
  });
  await page.goto("/demo");
  await expect(page.getByRole("button",{name:"Update Prediction",exact:true})).toBeEnabled();
  await expect(page.locator(".probability-summary strong").first()).toHaveText("65.0%");
  await page.locator("#team1_total_shots").fill("8");
  await page.locator("#team1_shots").fill("4");
  await page.locator("#team1_possession").fill("60");
  await page.getByRole("button",{name:"Update Prediction",exact:true}).click();
  await expect(page.locator("#demo-status")).toContainText("Manual model prediction");
  expect(posted?.team1_stats.shots).toBe(8);
  expect(posted?.team1_stats.shots_on_target).toBe(4);
  expect(posted?.team2_stats.possession).toBe(40);
  await page.getByRole("button",{name:"Update From Live Feed"}).click();
  await expect(page.locator("#demo-status")).toContainText("Cached provider update");
  await expect(page.locator("#match_minute")).toHaveValue("65");
  await page.getByRole("button",{name:"Save Snapshot",exact:true}).click();
  await expect(page.getByRole("button",{name:"Load snapshot"})).toBeVisible();
  await expect(page.locator("#match-charts svg")).toHaveCount(2);
  await page.getByRole("button",{name:"Reset Current Inputs"}).click();
  await expect(page.locator("#match_minute")).toHaveValue("0");
  await page.getByRole("button",{name:"Load snapshot"}).click();
  await expect(page.locator("#match_minute")).toHaveValue("65");
  unavailable=true;
  await page.getByRole("button",{name:"Update From Live Feed"}).click();
  await expect(page.locator("#demo-status")).toContainText("No live or cached");
  await expect(page.getByRole("button",{name:"Update Prediction",exact:true})).toBeEnabled();
  expect(errors).toEqual([]);
});

test("unconfigured backend keeps an explicitly labeled static preview",async({page})=>{
  await page.route("**/api/football/**",route=>route.fulfill({status:503,json:{detail:"Football service is not configured."}}));
  await page.goto("/demo");
  await expect(page.locator("#demo-status")).toContainText("static preview");
  await expect(page.getByRole("button",{name:"Update Prediction",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Reconnect to football service"})).toBeEnabled();
});
