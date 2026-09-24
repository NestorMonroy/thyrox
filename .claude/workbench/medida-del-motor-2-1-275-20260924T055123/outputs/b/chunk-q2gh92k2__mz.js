function mz(e,n){return{behavior:"deny",message:`Only the auto-mode classifier can allow ${e.name}: ${n}`,decisionReason:{type:"other",reason:`classifierOnly: ${n}`}}}
