const { EnclaveFactory } = require('./enclave')
const { SawtoothClientFactory } = require('./sawtooth-client')
const argv = require('yargs')
  .usage('Usage: node $0 --action [nominate, show_candidates, show_voters] --voter [string]  --nominee [string]')
  .choices('action', ['nominate', 'show_candidates', 'show_voters'])  
  .string(['action', 'voter', 'nominee'])
  .describe('action', 'action to take on the entry')
  .describe('voter', 'unique identifier for the entry')  
  .describe('nominee', 'name to pass to the entry')
  .example('node index.js --action nominate --voter foo --nominee steve', 'If `foo` is undefined, create it and noinate `steve` 1 vote')
  .example('node index.js --action show_candidates', 'Show all candidates voting status')
  .example('node index.js --action show_voters', 'Show all voters and their status')
  .wrap(null)
  .demandOption(['action'])
  .help('h')
  .alias('h', 'help')
  .argv

const env = require('./env')
const input = require('./input')

const enclave = EnclaveFactory(Buffer.from(env.privateKey, 'hex'))

const votingClient = SawtoothClientFactory({
  enclave: enclave,
  restApiUrl: env.restApiUrl
})

const votingTransactor = votingClient.newTransactor({
  familyName: env.familyName,
  familyVersion: env.familyVersion
})

const newPayload = {
  Action: argv.action,
  Voter: argv.voter,
  Nominee: argv.nominee
}

if (input.payloadIsValid(newPayload)) {  
  console.log(newPayload)
  input.submitPayload(newPayload, votingTransactor)
} else {
  console.log(`Oops! Your payload failed validation and was not submitted.`)
}
