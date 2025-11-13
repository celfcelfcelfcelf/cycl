import * as GL from '../src/game/gameLogic.js';
import ridersData from '../src/data/ridersCsv.js';

function buildCards(numberOfTeams=3, ridersPerTeam=3, track='111111FFFFFFFFFF'){
  const total = numberOfTeams * ridersPerTeam;
  const selected = ridersData.slice(0, total);
  const teamList = ['Me'];
  for (let i=1;i<numberOfTeams;i++) teamList.push(`Comp${i}`);
  const cardsObj = {};
  for (let idx=0; idx<selected.length; idx++){
    const rider = selected[idx];
    const team = teamList[Math.floor(idx / ridersPerTeam)];
    const isBreak = false;
    cardsObj[rider.NAVN] = {
      position: 0,
      cards: GL.generateCards(rider, isBreak, Math.random),
      discarded: [],
      group: 2,
      prel_time: 10000,
      time_after_winner: 10000,
      result: 1000,
      sprint: rider.SPRINT,
      bjerg: Number(rider.BJERG)||0,
      flad: Number(rider.FLAD)||0,
      mentalitet: Number(rider.MENTALITET)||4,
      team,
      fatigue: 0,
      penalty: 0,
      favorit: idx+1,
      e_moves_left: 12,
      favorit_points: 1,
      win_chance: 10,
      win_chance_wo_sprint: 10,
      sprint_chance: 10,
      takes_lead: 0,
      attacking_status: 'no',
      selected_value: -1
    };
  }
  GL.computeInitialStats(cardsObj, track, 0, numberOfTeams);
  return cardsObj;
}

// replicate autoPlayTeam logic minimally
function autoPlayTeamSim(cards, groupNum, teamName, numberOfTeams=3, track='111111FFFFFFFFFF', teamPaces = {}){
  const teamRiders = Object.entries(cards).filter(([,r]) => r.group===groupNum && r.team===teamName && !r.finished).map(([n])=>n);
  let pace=0;
  const updatedCards = JSON.parse(JSON.stringify(cards));
  const teamPaceMap = {...teamPaces};
  // incorporate selected_value already present
  Object.entries(updatedCards).forEach(([,r])=>{
    if (r.finished) return;
    if (r.group !== groupNum) return;
    if (typeof r.selected_value === 'number' && r.selected_value>0 && r.attacking_status !== 'attacker'){
      teamPaceMap[r.team] = Math.max(teamPaceMap[r.team]||0, Math.round(r.selected_value));
    }
  });
  const pacesForCall = Object.values(teamPaceMap).map(v=>Number(v)||0);

  const teamAttackDeclared = {};
  for (const name of teamRiders){
    const takes = GL.takesLeadFC(name, updatedCards, track, numberOfTeams, false, false, [], console.log);
    updatedCards[name].takes_lead = takes;
    if (takes===2){
      if (teamAttackDeclared[updatedCards[name].team]){
        updatedCards[name].takes_lead = 0;
      } else {
        teamAttackDeclared[updatedCards[name].team]=true;
        updatedCards[name].attacking_status='attacker';
        for (const otherName of Object.keys(updatedCards)){
          const or = updatedCards[otherName];
          if (or.team===updatedCards[name].team && or.group===groupNum && otherName!==name){
            updatedCards[otherName].takes_lead=0; updatedCards[otherName].selected_value=0;
          }
        }
      }
    }

    if (updatedCards[name].takes_lead>0){
      const pacesForCall2 = Object.values(teamPaceMap).map(v=>Number(v)||0);
      let selected = 0;
      if (updatedCards[name].takes_lead===2){
        const top4 = (updatedCards[name].cards||[]).slice(0,4).filter(c=>c&&c.id);
        let chosenCard=null; let bestNum=Infinity;
        for (const c of top4){
          if (!c||!c.id) continue;
          if ((String(c.id).startsWith('TK-1'))||String(c.id).startsWith('99')) continue;
          const cardNum = parseInt(String(c.id).match(/\d+/)?.[0]||'99');
          if (cardNum<bestNum){bestNum=cardNum; chosenCard=c}
        }
        if(!chosenCard){
          for (const c of top4){ if (!c||!c.id) continue; const cardNum=parseInt(String(c.id).match(/\d+/)?.[0]||'99'); if (cardNum<bestNum){bestNum=cardNum; chosenCard=c} }
        }
        if (chosenCard){ const sv = GL.getSlipstreamValue(updatedCards[name].position, updatedCards[name].position + chosenCard.flat, track); selected = sv===3 ? chosenCard.flat : chosenCard.uphill; updatedCards[name].planned_card_id = chosenCard.id; }
        else selected = GL.pickValue(name, updatedCards, track, pacesForCall2, numberOfTeams, console.log);
      } else {
        selected = GL.pickValue(name, updatedCards, track, pacesForCall2, numberOfTeams, console.log);
      }
      updatedCards[name].selected_value = updatedCards[name].takes_lead * selected;
      if (updatedCards[name].selected_value>0 && updatedCards[name].takes_lead===2 && !updatedCards[name].planned_card_id){
        const sv = GL.getSlipstreamValue(updatedCards[name].position, updatedCards[name].position + Math.floor(updatedCards[name].selected_value), track);
        const targetNumeric = Math.round(updatedCards[name].selected_value);
        const top4 = updatedCards[name].cards.slice(0,4);
        const localPenalty = top4.some(c=>c&&c.id&&String(c.id).startsWith('TK-1'))?1:0;
        let planned=null; let bestNum=Infinity;
        for (const c of top4){ if(!c||!c.id) continue; if (String(c.id).startsWith('TK-1')) continue; const cardNum=parseInt(String(c.id).match(/\d+/)?.[0]||'15'); const cardValue = sv>2?c.flat:c.uphill; if ((cardValue-localPenalty) >= targetNumeric){ if (cardNum<bestNum){planned=c.id;bestNum=cardNum}} }
        if (!planned){ const nonTKExists = top4.some(c=>c&&c.id&&!String(c.id).startsWith('TK-1')); if (!nonTKExists){ for(const c of top4){ if(!c||!c.id) continue; const cardNum=parseInt(String(c.id).match(/\d+/)?.[0]||'15'); const cardValue = sv>2?c.flat:c.uphill; if (cardValue===targetNumeric){ if (cardNum<bestNum){planned=c.id;bestNum=cardNum}} } } }
        if(!planned && top4.length>0){ for(const c of top4){ if(!c||!c.id) continue; const cardNum=parseInt(String(c.id).match(/\d+/)?.[0]||'15'); if (!String(c.id).startsWith('TK-1')){ if (cardNum<bestNum){planned=c.id;bestNum=cardNum}} } if(!planned){ for(const c of top4){ if(!c||!c.id) continue; const cardNum=parseInt(String(c.id).match(/\d+/)?.[0]||'15'); if (cardNum<bestNum){planned=c.id;bestNum=cardNum}} }
        }
        updatedCards[name].planned_card_id = planned;
      }
      if (updatedCards[name].selected_value>0){ pace = Math.max(pace, updatedCards[name].selected_value); if (updatedCards[name].attacking_status !== 'attacker'){ teamPaceMap[updatedCards[name].team] = Math.max(teamPaceMap[updatedCards[name].team]||0, Math.round(updatedCards[name].selected_value)); } }
    } else {
      updatedCards[name].selected_value = 0;
    }
  }

  // Determine final pace from non-attacker values recorded in teamPaceMap
  const teamDeclaredPace = Math.round(teamPaceMap[teamName] || 0);
  const otherPaces = Object.entries(teamPaceMap).filter(([k]) => k !== teamName).map(([, v]) => Number(v) || 0);
  const otherMax = otherPaces.length > 0 ? Math.max(...otherPaces) : 0;
  let finalPace = teamDeclaredPace;
  if (!finalPace || finalPace <= otherMax) finalPace = 0;
  if (finalPace === 0) finalPace = Math.floor(Math.random() * 3) + 2;
  if (finalPace <= otherMax) finalPace = 0;
  pace = Math.max(2, Math.round(finalPace || 0));
  return { pace, updatedCards };
}

async function runSim(){
  console.log('--- Simulation start ---');
  const track = '111111FFFFFFFFFF';
  const cards = buildCards(3,3,track);
  console.log('Built cards for 3 teams x3');

  // Scenario 1: early game
  const res1 = autoPlayTeamSim(cards, 2, 'Comp1', 3, track, {});
  console.log('\nScenario: early game (positions 0)');
  console.log('AI pace returned:', res1.pace);
  const nonAtt = Object.entries(res1.updatedCards).filter(([,r])=>r.team==='Comp1' && r.attacking_status!=='attacker').map(([n,r])=>({name:n,selected:Math.round(r.selected_value||0), takes_lead:r.takes_lead, planned:r.planned_card_id}));
  console.log('Comp1 non-attacker selected_values:', nonAtt);

  // Scenario 2: late game - push positions near finish
  const finishPos = track.indexOf('F');
  const cardsLate = JSON.parse(JSON.stringify(cards));
  for (const n of Object.keys(cardsLate)){
    cardsLate[n].position = finishPos - 2; // near finish
  }
  GL.computeInitialStats(cardsLate, track, 0, 3);
  const res2 = autoPlayTeamSim(cardsLate, 2, 'Comp1', 3, track, {});
  console.log('\nScenario: late game (positions near finish)');
  console.log('AI pace returned:', res2.pace);
  const nonAtt2 = Object.entries(res2.updatedCards).filter(([,r])=>r.team==='Comp1' && r.attacking_status!=='attacker').map(([n,r])=>({name:n,selected:Math.round(r.selected_value||0), takes_lead:r.takes_lead, planned:r.planned_card_id}));
  console.log('Comp1 non-attacker selected_values:', nonAtt2);

  // Compare pace to max of selected_values
  const maxSel1 = nonAtt.length>0?Math.max(...nonAtt.map(x=>x.selected)):0;
  const maxSel2 = nonAtt2.length>0?Math.max(...nonAtt2.map(x=>x.selected)):0;
  console.log('\nChecks:');
  console.log('Scenario1: pace vs max selected_value ->', res1.pace, 'vs', maxSel1);
  console.log('Scenario2: pace vs max selected_value ->', res2.pace, 'vs', maxSel2);
}

runSim().catch(e=>{ console.error('Error in simulation', e); process.exit(1); });
