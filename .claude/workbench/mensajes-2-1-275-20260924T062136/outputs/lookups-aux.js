==== Epe (42)
function Epe(e){return iKe(e)==="refusal"}

==== HW (470)
function HW(e){switch(e.type){case"attachment":if(qpn(e)||Xar(e))return e.attachment.toolUseID;return null;case"assistant":if(e.message.content[0]?.type!=="tool_use")return null;return e.message.content[0].id;case"user":if(e.sourceToolUseID)return e.sourceToolUseID;if(e.message.content[0]?.type!=="tool_result")return null;return e.message.content[0].tool_use_id;case"progress":return e.toolUseID;case"system":return e.subtype==="informational"?e.toolUseID??null:null}}
