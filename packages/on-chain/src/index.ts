console.log('TODO : May be an express JS server');

// The Goal of the on-chain worker is to twofold :
// - listen each new block => check if the block contain tx that interact with verified contracts
//          - if it the case update the metric of the verified contract in the DB : TVL, TVE, nb Tx, ...
// - the on-chain worker should also be able to process in parallel the blocks passed since the genesis.
