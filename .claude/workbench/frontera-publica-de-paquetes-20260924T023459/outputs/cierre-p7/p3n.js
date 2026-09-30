function p3n(e,n,r){let s=$fe(n);if(!r.midTurn)return`The ${s} plugin sent a message:
${e}

This is how Claude Code surfaces a prompt a plugin submits between `+"turns \u2014 it starts this turn in the user's place. Address the message above.";return`The ${s} plugin sent a message while you were working:
${e}

This is how Claude Code surfaces prompts a plugin submits mid-turn `+"\u2014 within the running turn, often alongside the next tool result. "+"Address the message above as you continue this turn."}