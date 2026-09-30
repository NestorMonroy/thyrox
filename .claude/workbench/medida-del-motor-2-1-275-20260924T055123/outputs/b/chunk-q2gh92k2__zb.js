function zb(e,n=()=>!0){if(!e)return;if(e.type==="safetyCheck")return n(e)?e:void 0;if(e.type==="subcommandResults")for(let r of e.reasons.values()){let s=zb(r.decisionReason,n);if(s)return s}return}
