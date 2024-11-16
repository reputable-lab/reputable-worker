import { createReadStream } from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import PQueue from 'p-queue';
import { DatabaseService } from '../database/DatabaseService.js';
import { Metric } from '../metric/MetricService.js';
import { checkGitHubEntities } from '../utils/checkGitHubEntities.js';
import { getCreationBlockNumber } from '../utils/getCreationBlock.js';
import logger from '../utils/logger.js';
import { parseRepoLink } from '../utils/parseRepoLink.js';

export class ParserService extends DatabaseService {
  #queue: PQueue;

  #filePath: string;

  public metric: Metric;

  constructor({ filePath }: { filePath: string }) {
    const nodeEnv = process.env.NODE_ENV == 'prod' ? 'prod' : 'dev';
    logger.info(`Initialize ParserService for ${nodeEnv}`);
    const dbPath = path.join(
      './src/database/sqlite',
      `localState.internalDatabase-${nodeEnv}`
    );
    super(dbPath);

    this.#filePath = filePath;
    this.#queue = new PQueue();
    this.metric = new Metric();
  }

  processCSVRow(row) {
    const repoLink = row['Repo Link'];
    let smartContractAddress = row['Smart Contract Address'].trim();
    smartContractAddress = smartContractAddress.replace(
      /[\u200B-\u200D\uFEFF]/g,
      ''
    ); // remove unicode zero-width characters

    if (!repoLink) {
      this.metric.updateParserStateOnErrorForRepoLink({ row });
      return;
    }
    if (!smartContractAddress) {
      this.metric.updateParserStateOnErrorForSmartContractAddress({ row });
      return;
    }

    smartContractAddress = smartContractAddress.toLowerCase(); // normalize smart contract address

    const { owner, name } = parseRepoLink(repoLink);
    const tags = row.Category
      ? row.Category.split(/[;,/]/)
          .map((tag) => tag.trim())
          .filter((tag) => tag !== '')
      : [];

    const insert = this.internalDatabase.prepare(`
      INSERT INTO records (repoLink, smartContractAddress, category, owner, name, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      repoLink,
      smartContractAddress,
      row.Category,
      owner,
      name,
      tags.join(',')
    );
  }

  async checkSQLiteDataValidity() {
    logger.info('⏳ Checking SQLite data validity');
    const select = this.internalDatabase.prepare('SELECT * FROM records');
    const rows = select.all();

    for (const row of rows) {
      await this.#queue.add(async () => {
        try {
          const { organizationName, repoOwner, repoName } =
            await checkGitHubEntities({
              repoOwner: row.owner,
              repoName: row.name,
            });

          const creationBlockNumber = await getCreationBlockNumber(
            row.smartContractAddress
          );

          if (!creationBlockNumber) {
            this.metric.updateParserStateOnErrorForCreationBlockNumber({ row });
            this.removeRecord(row.id); // remove the record if there is no creationBlockNumber
            return;
          }

          this.updateRecord({
            id: row.id,
            organizationName,
            repoOwner,
            repoName,
            creationBlockNumber,
          });
        } catch (error) {
          //if checkGitHubEntities throw an error it means org is not valid
          this.metric.updateParserStateOnErrorForGithubEntity({ row });
          // remove the record from SQLite when checkGitHubEntities throw an issue in order to not keep the
          logger.error(
            `[processSQLiteData] Error processing ${row.repoLink}: ${error}`
          );
          this.removeRecord(row.id);
        }
      });
    }
    // Ensure all tasks in the #queue are completed before proceeding
    await this.#queue.onIdle();
  }

  async parseCsv() {
    return new Promise((resolve, reject) => {
      createReadStream(this.#filePath)
        .pipe(csvParser())
        .on('data', (row) => {
          this.processCSVRow(row); // we use better-sqlite3 that enable synchronous save for better performance
        })
        .on('end', async () => {
          try {
            logger.info('CSV Parsed entirely ✅');
            await this.checkSQLiteDataValidity();
            resolve(undefined);
          } catch (error) {
            reject(new Error(error));
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async start() {
    try {
      logger.info('ParserService started');
      await this.parseCsv();
      const duplicatedAddress = this.findDuplicateAddresses();
      console.log(
        '🚀 ~ ParserService ~ start ~ duplicatedAddress:',
        duplicatedAddress
      );
      await this.saveToPrisma();
      logger.info('CSV data parsed and stored successfully');
    } catch (error) {
      logger.error(`[parseCsv] Error parsing CSV file: ${error}`);
    }
  }
}
