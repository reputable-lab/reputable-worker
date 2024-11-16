/**
 * The script will reach the latest block of the ethereum blockchain,it should
 * start again when a new block is minted. This is the goal of this function.
 *
 * @param provider - The blockchain provider used to interact with the Ethereum network.
 */
// export const listenForNewBlocks = async () => {
//   client.watchBlocks({
//     onBlock: async (block) => {
//       logger.info(`New block received: ${block.number}`);
//       inspectBlockTransactions(block);
//     },
//     emitMissed: true,
//     onError: (error) =>
//       logger.error(`[listenForNewBlocks] error occurred: ${error}`),
//   });
// };
