# CS244b Final Project
## Jacob Chudnovsky, Henry Friedlander, Ajay Vasisht, Federico Zalcberg

### Summary
Darkpools are exchanges, in which prior to matching, a counterparty does not need to publicly broadcast their trading intentions. This is useful for traders wishing to dump a large amount of an asset quickly. Centralized darkpools have been demonstrated to not be equitable for the trades since the darkpool operators place priority on their own trades rather than external trades. In this paper, we introduce the FRED system architecture to ensure that the darkpool mechanism treats trades according to equitable matching rules. We achieve this by publishing a BFT public ledger of hashed transactions.

## Important Files To Look at

### client/client.js
This is the code that each client (that is, user of a darkpool/hotstuff) uses. It has the logic for submitting orders to both the darkpool and distributed ledger. It also has the logic that checks for frontrunning asynchrounously.

### server/server.js
This is the code that runs the simplified darkpool. It accepts orders from clients and matches them, uploading "settlement" matches to an aws file. Note that in order to make this repo public for the course, we redacted the aws secrets. This server can be hit via various HTTP endpoints to modify it's behavior (for frontrunning purposes) — see server/README.md for details.

### hotstuff/
This is our modified hotstuff implementation for this project. More information can be found at hotstuff/README.md