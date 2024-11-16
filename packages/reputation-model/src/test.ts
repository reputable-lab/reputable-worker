import {
  COMMIT_RANGE_0_10,
  COMMIT_RANGE_10_30,
  COMMIT_RANGE_30_PLUS,
  CONTRIBUTORS_WEIGHT_MATRIX,
} from './config/config';

const commitsCount = 5;
const commitProportion = 66;
const normalizedNumberOfContributors = 1000;
const contributionRecency = 1000;
const normalizedTx = 0;
const normalizedUniqueFrom = 0;
const normalizedTve = 0;

const main = () => {
  // Determine the commit range for the contributor
  let commitRange;
  if (commitsCount <= 10) {
    commitRange = COMMIT_RANGE_0_10;
  } else if (commitsCount <= 30) {
    commitRange = COMMIT_RANGE_10_30;
  } else {
    commitRange = COMMIT_RANGE_30_PLUS;
  }

  // Retrieve the weights for the specific commit range
  const {
    COMMIT_WEIGHT,
    NB_OF_CONTRIBUTOR_WEIGHT,
    CONTRIBUTION_RECENCY,
    TX_WEIGHT,
    UNIQUE_FROM_WEIGHT,
    TVE_WEIGHT,
  } = CONTRIBUTORS_WEIGHT_MATRIX[commitRange];

  // Ensure the total sum of weights does not exceed 100
  if (
    COMMIT_WEIGHT +
      NB_OF_CONTRIBUTOR_WEIGHT +
      CONTRIBUTION_RECENCY +
      TX_WEIGHT +
      UNIQUE_FROM_WEIGHT +
      TVE_WEIGHT >
    100
  ) {
    throw new Error('The total sum of the weights exceeds 100.');
  }

  const test = Math.round(
    commitProportion * COMMIT_WEIGHT +
      normalizedNumberOfContributors * NB_OF_CONTRIBUTOR_WEIGHT +
      contributionRecency +
      normalizedTx * TX_WEIGHT +
      normalizedUniqueFrom * UNIQUE_FROM_WEIGHT +
      normalizedTve * TVE_WEIGHT
  );
  console.log('🚀 ~ main ~ test:', test);
};

main();
