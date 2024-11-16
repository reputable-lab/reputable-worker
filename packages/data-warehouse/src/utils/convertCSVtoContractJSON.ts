import * as fs from 'fs';
import csvParser from 'csv-parser';

interface ContractData {
  Protocol: string;
  SmartContractName: string;
  RepoLink: string;
  Category: string;
  SmartContractAddress: string;
}

interface OutputJSON {
  contracts: string[];
}

const inputFilePath = './src/csvFile/newRepo.csv'; // Replace with the path to your CSV file
const outputFilePath = 'contracts.json';

const addresses: string[] = [];

fs.createReadStream(inputFilePath)
  .pipe(csvParser())
  .on('data', (row: ContractData) => {
    let smartContractAddress = row['Smart Contract Address'].trim();
    smartContractAddress = smartContractAddress.replace(
      /[\u200B-\u200D\uFEFF]/g,
      ''
    ); // remove unicode zero-width characters
    if (smartContractAddress) {
      addresses.push(smartContractAddress.toLowerCase());
    }
  })
  .on('end', () => {
    const output: OutputJSON = {
      contracts: addresses,
    };

    fs.writeFileSync(outputFilePath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`JSON file has been created at ${outputFilePath}`);
  })
  .on('error', (error) => {
    console.error('Error while processing the CSV file:', error);
  });
