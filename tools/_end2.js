var path=require("path"); global.window=global;
global.localStorage={_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;},removeItem:function(k){delete this._d[k];}};
["roster","quiz","story_prologue","story_a","story_b","summon","barks","map","exam","npc_events","codex","endings","endings_extra","endings_more","bonds","bonds_extra","bonds_more","flags","night","common","expand"].forEach(function(f){require(path.join(__dirname,"..","js","data",f+".js"));});
require(path.join(__dirname,"..","js","engine.js"));
var G=window.GRAIL,E=G.Engine,NIGHT=window.GRAIL_NIGHT||{actions:[]};
function night(st,day,pick){var a=(NIGHT.actions||[]).filter(function(x){return x.k===pick;})[0]||(NIGHT.actions||[])[0];if(!a)return;
 st.s.flags["night_"+day]=true;st.s.nights=st.s.nights||{};st.s.nights[day]=a.k;if(a.fx)E.apply(a.fx);if(a.cut)st.s.beastCutDay=day;if(a.k==="bond")E.apply({bond:1});}
function play(){var ans={};G.QUIZ.forEach(function(q){var o=q.options[Math.floor(Math.random()*q.options.length)];ans[q.id]=o.key;});
 var st=E.create(ans),guard=0;
 while(st.s.day<=7&&guard++<90){var D=G.STORY[st.s.day];if(!D)break;var slot=D.slots[st.s.slot];
  if(!slot){var p=st.s.day;if(p>=1&&p<7&&!st.s.flags["night_"+p]){night(st,p,["rest","patrol","bond","sleep"][Math.floor(Math.random()*4)]);continue;}
   st.s.day++;st.s.slot=0;if(p>=3&&st.s.beastCutDay!==p)st.s.beast=Math.min(7,st.s.beast+1);continue;}
  var opts=slot.options.filter(function(o){var r=o.req||{};if(r.route&&st.routeId!==r.route)return false;if(r.flag&&!st.s.flags[r.flag])return false;
   if(r.command&&st.s.command<r.command)return false;if(r.allies&&st.s.allies<r.allies)return false;
   if(r.clueCount){var n=0;Object.keys(st.s.clues).forEach(function(k){if(st.s.clues[k]>=3)n++;});if(n<r.clueCount)return false;}return true;});
  if(!opts.length)break;var o=opts[Math.floor(Math.random()*opts.length)],fx;
  if(o.check){var r=E.roll(o.check.skill,o.check.bonus||0);fx=(r.ok?o.ok:o.fail).fx;}else fx=o.fx;
  E.apply(fx);st.s.slot++;
  if(st.s.slot>=D.slots.length){var pd=st.s.day;st.s.day++;st.s.slot=0;if(pd>=3&&st.s.beastCutDay!==pd)st.s.beast=Math.min(7,st.s.beast+1);}
  if(st.s.beast>=7||st.s.exposure>=10)break;}
 if(st.s.day>7){var W=(G.STORY.WISHES||[]);if(W.length){var w=W[Math.floor(Math.random()*W.length)];try{E.apply(w.fx);}catch(e){}}}
 return {id:G.judgeEnding(st),day:st.s.day,beast:st.s.beast};}
var N=900,end={},done7=0;
for(var i=0;i<N;i++){var r=play();end[r.id]=(end[r.id]||0)+1;if(r.day>7)done7++;}
console.log("N="+N+" 走完7天="+(100*done7/N).toFixed(1)+"%");
Object.keys(end).sort().forEach(function(k){console.log("  "+k+"  "+(end[k]/N*100).toFixed(1)+"%");});

