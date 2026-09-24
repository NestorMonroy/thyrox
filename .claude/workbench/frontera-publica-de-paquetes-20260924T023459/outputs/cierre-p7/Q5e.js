function Q5e(e,n){if(n.activityObservation===void 0?kt(e,{hostInjectedLane:n.hostInjected===!0,descendantLane:n.lineage==="descendant"}):_t(e))return e;if(n.activityObservation!==void 0)return`${n.midTurn?De:Ne}
${e}

${Fe}`;let s=n.midTurn?me:ge,r=n.hostInjected?n.midTurn?Oe:Ce:n.midTurn?K:"",i=n.lineage==="descendant"?pe:D;return`${s}
${e}

${i}${r}`}