import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { PrismaClient } from '../client.js';
import logger from '../utils/logger.js';

export class DatabaseService {
  protected internalDatabase: Database.Database;

  private prisma: PrismaClient;

  private prismaCheckpoint: number = 500;

  constructor(dbPath: string) {
    // Ensure the directory exists
    const dbDirectory = path.dirname(dbPath);
    if (!fs.existsSync(dbDirectory)) {
      fs.mkdirSync(dbDirectory, { recursive: true });
    }

    this.internalDatabase = new Database(dbPath);
    this.internalDatabase.pragma('journal_mode = WAL');
    this.prisma = new PrismaClient();
    this.dropExistingTable(); // ⚠️ When this service is running it removes all the existing SQLite cache content before doing something
    this.initializeDatabase();
  }

  dropExistingTable() {
    logger.warn('SQLite cache content removed 🗑️');
    this.internalDatabase.exec(`
      DROP TABLE IF EXISTS records;
    `);
  }

  initializeDatabase() {
    this.internalDatabase.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repoLink TEXT,
        smartContractAddress TEXT,
        category TEXT,
        owner TEXT,
        name TEXT,
        tags TEXT,
        organizationName TEXT,
        repoOwner TEXT,
        repoName TEXT,
        creationBlockNumber TEXT
      );
    `);
  }

  updateRecord({
    id,
    organizationName,
    repoOwner,
    repoName,
    creationBlockNumber,
  }: {
    id: number;
    organizationName: string;
    repoOwner: string;
    repoName: string;
    creationBlockNumber: number;
  }) {
    const update = this.internalDatabase.prepare(`
      UPDATE records SET
        organizationName = ?,
        repoOwner = ?,
        repoName = ?,
        creationBlockNumber = ?
      WHERE id = ?
    `);
    update.run(organizationName, repoOwner, repoName, creationBlockNumber, id);
  }

  removeRecord(id) {
    const remove = this.internalDatabase.prepare(
      'DELETE FROM records WHERE id = ?'
    );
    remove.run(id);
  }

  /**
   * Finds and returns all duplicated smartContractAddress values.
   * @returns A list of duplicated smartContractAddress values.
   */
  findDuplicateAddresses() {
    const findDuplicates = this.internalDatabase.prepare(`
        SELECT LOWER(smartContractAddress) AS normalizedAddress
        FROM records
        GROUP BY normalizedAddress
        HAVING COUNT(normalizedAddress) > 1;
      `);

    const duplicates = findDuplicates.all();

    return duplicates.map((row) => row.normalizedAddress);
  }

  async saveToPrisma() {
    logger.info('Saving SQLite state into Prisma');

    const rows = this.internalDatabase.prepare('SELECT * FROM records').all();

    let prismaOperations = [];

    for (const row of rows) {
      const tags = row.tags.split(',');

      if (row.organizationName) {
        prismaOperations.push(
          this.prisma.organization.upsert({
            where: { organizationName: row.organizationName },
            update: {
              repositories: {
                upsert: {
                  where: {
                    owner_name: { owner: row.repoOwner, name: row.repoName },
                  },
                  update: {
                    tags: { set: tags },
                    contracts: {
                      upsert: {
                        where: { address: row.smartContractAddress },
                        update: {
                          creationBlockNumber: Number(row.creationBlockNumber),
                        },
                        create: {
                          address: row.smartContractAddress,
                          creationBlockNumber: Number(row.creationBlockNumber),
                        },
                      },
                    },
                  },
                  create: {
                    name: row.repoName,
                    owner: row.repoOwner,
                    tags: tags,
                    contracts: {
                      create: {
                        address: row.smartContractAddress,
                        creationBlockNumber: Number(row.creationBlockNumber),
                      },
                    },
                  },
                },
              },
            },
            create: {
              organizationName: row.organizationName,
              repositories: {
                create: {
                  name: row.repoName,
                  owner: row.repoOwner,
                  tags: tags,
                  contracts: {
                    create: {
                      address: row.smartContractAddress,
                      creationBlockNumber: Number(row.creationBlockNumber),
                    },
                  },
                },
              },
            },
          })
        );
      } else {
        prismaOperations.push(
          this.prisma.repository.upsert({
            where: { owner_name: { owner: row.repoOwner, name: row.repoName } },
            update: {
              tags: { set: tags },
              contracts: {
                upsert: {
                  where: { address: row.smartContractAddress },
                  update: {
                    creationBlockNumber: Number(row.creationBlockNumber),
                  },
                  create: {
                    address: row.smartContractAddress,
                    creationBlockNumber: Number(row.creationBlockNumber),
                  },
                },
              },
            },
            create: {
              name: row.repoName,
              owner: row.repoOwner,
              tags: tags,
              contracts: {
                create: {
                  address: row.smartContractAddress,
                  creationBlockNumber: Number(row.creationBlockNumber),
                },
              },
            },
          })
        );
      }

      // When the number of operations reaches this.prismaCheckpoint, execute the transaction
      if (prismaOperations.length === this.prismaCheckpoint) {
        await this.prisma.$transaction(prismaOperations);
        logger.info(
          `Prisma Checkpoint reached: Executed transaction for ${this.prismaCheckpoint} operations`
        );
        prismaOperations = []; // Clear the operations array
      }
    }

    // Execute any remaining operations that didn't reach the checkpoint threshold
    if (prismaOperations.length > 0) {
      await this.prisma.$transaction(prismaOperations);
      logger.info(
        `Final checkpoint: Executed transaction for remaining ${prismaOperations.length} operations`
      );
    }
  }
}
