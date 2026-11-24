/* FEH 資料匯出：在 https://feheroes.fandom.com/wiki/Special:CargoTables 的 console 執行，約 30 秒後下載 feh_raw.json，
 * 再跑：python tools/build.py feh_raw.json data（產生 data/list.js、data/skills.js）。
 * 用 Special:CargoExport（api.php 的 cargoquery 很容易被 rate limit）。 */
(async () => {
  const X = async (t, f, off) => JSON.parse(await (await fetch('/wiki/Special:CargoExport?tables=' + t + '&fields=' + encodeURIComponent(f) + '&format=json&limit=5000&offset=' + off)).text());
  const all = async (t, f) => { let o = 0, out = []; for (;;){ const d = await X(t, f, o); out.push(...d); if (d.length < 5000) break; o += 5000; await new Promise(r => setTimeout(r, 1500)); } return out; };
  const T = {
    Units: 'WikiName,Name,Title,Person,Origin,Gender,WeaponType,MoveType,Properties,ReleaseDate,TagID,IntID,Artist,ActorEN,ActorJP,Description,GrowthMod',
    UnitStats: 'WikiName,Lv1HP5,Lv1Atk5,Lv1Spd5,Lv1Def5,Lv1Res5,HPGR3,AtkGR3,SpdGR3,DefGR3,ResGR3',
    UnitSkills: 'WikiName,skill,skillPos,defaultRarity,unlockRarity',
    Skills: '_pageName=pg,Name,WikiName,GroupName,Scategory,Description,Might,SP,Cooldown,UseRange,Exclusive,RefinePath,Required,Next,StatModifiers,Properties,Icon',
    Languages: '_pageName=pg,Type,English,ChineseTW'
  };
  const F = {};
  for (const [t, f] of Object.entries(T)){ F[t] = await all(t, f); console.log(t, F[t].length); await new Promise(r => setTimeout(r, 1500)); }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(F)], {type:'application/json'})); a.download = 'feh_raw.json'; a.click();
})();
