
const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const { InvalidTransaction, InternalError } = require('sawtooth-sdk/processor/exceptions')
const cbor = require('cbor')
const crypto = require('crypto')

const _hash = (x) =>
  crypto.createHash('sha512').update(x).digest('hex').toLowerCase()

// Constants defined in intkey specification
const MAX_NAME_LENGTH = 20
const TP_FAMILY = 'sawtooth_voting'
const TP_NAMESPACE = _hash(TP_FAMILY).substring(0, 6)
const TP_VERSION = '1.0'

const _decodeCbor = (buffer) =>
  new Promise((resolve, reject) =>
    cbor.decodeFirst(buffer, (err, obj) => (err ? reject(err) : resolve(obj)))
  )

const _toInternalError = (err) => {
  let message = (err.message) ? err.message : err
  throw new InternalError(message)
}

const _setEntry = (context, address, stateValue) => {
  let entries = {
    [address]: cbor.encode(stateValue)
  }
  return context.setState(entries)
}


const _applyShowAllVoters = (context, address, voter, nominee) => (possibleAddressValues) => {
  let stateValueRep = possibleAddressValues[address]
  let stateValue

  if (stateValueRep && stateValueRep.length > 0) {
    stateValue = cbor.decodeFirstSync(stateValueRep)    
    if(stateValue.voters) {
      let allVoters = stateValue.voters
      console.log(allVoters)         
    } else {
      throw new InvalidTransaction('There are no voters, please create one first')
    }
    
  } else {
    throw new InvalidTransaction('Didnt get any state, please create one first')        
  } 
}

const _applyShowAllCandidates = (context, address, voter, nominee) => (possibleAddressValues) => {
  let stateValueRep = possibleAddressValues[address]
  let stateValue   

  if (stateValueRep && stateValueRep.length > 0) {
    stateValue = cbor.decodeFirstSync(stateValueRep)
    if(stateValue.candidates) {
      let allCandidates = stateValue.candidates
      console.log(allCandidates)              
    } else {
      throw new InvalidTransaction('There are no voters, please create one first')
    }
    
  } else {
    throw new InvalidTransaction('Didnt get any state, please create one first')               
  }
}

const _applyNominate = (context, address, voter, nominee) => (possibleAddressValues) => {

  
  let stateValueRep = possibleAddressValues[address]
  let stateValue

  if (stateValueRep && stateValueRep.length > 0) {
    stateValue = cbor.decodeFirstSync(stateValueRep)    

    let existingVoter = stateValue.voters.includes(voter)
    if(existingVoter) {
      throw new InvalidTransaction('This guy already voted!')
    }
    stateValue.voters.push(voter)  
    stateValue.candidates[nominee] = (stateValue.candidates[nominee]) ? stateValue.candidates[nominee] + 1 : 1;
  } else {
    if (!stateValue) {
      stateValue = {
        candidates: {},
        voters: []
      }
    }  
    stateValue.voters.push(voter)  
    stateValue.candidates[nominee] = 1      
  }

  return _setEntry(context, address, stateValue)
}

// const _applyInc = _applyOperator('inc', (x, y) => x + y)
// const _applyDec = _applyOperator('dec', (x, y) => x - y)

class VotingHandler extends TransactionHandler {
  constructor() {
    super(TP_FAMILY, [TP_VERSION], [TP_NAMESPACE])
  }

  apply(transactionProcessRequest, context) {
    return _decodeCbor(transactionProcessRequest.payload)
      .catch(_toInternalError)
      .then((update) => {
        //
        // Validate the update                        )
        let action, voter, nominee        
        

        action = update.Action
        if (!action) {
          throw new InvalidTransaction('Action is required')
        }

        if (action == 'nominate') {
          voter = update.Voter
          if (!voter) {
            throw new InvalidTransaction('Voter is required')
          }

          if (voter.length > MAX_NAME_LENGTH) {
            throw new InvalidTransaction(
              `Voter must be a string of no more than ${MAX_NAME_LENGTH} characters`
            )
          }

          nominee = update.Nominee
          if (!nominee) {
            throw new InvalidTransaction('Nominee is required')
          }

          if (nominee.length > MAX_NAME_LENGTH) {
            throw new InvalidTransaction(
              `Nominee must be a string of no more than ${MAX_NAME_LENGTH} characters`
            )
          }
        }

        let address = TP_NAMESPACE + _hash('6969').slice(-64)

        // Get the current state, for the key's address:
        let getPromise = context.getState([address])

        let actionFn
        if (action === 'nominate') {
          // actionFn = _applyNominate
          let actionPromise = getPromise.then(
            _applyNominate(context, address, voter, nominee)
          )
          return actionPromise.then(addresses => {
            if (addresses.length === 0) {
              throw new InternalError('State error!')
            }
            console.log(`Action: ${action}\nVoter: ${voter}\nValue: ${nominee}`)
          })
        } else if (action === 'show_candidates') {          
          return getPromise.then(_applyShowAllCandidates(context, address, voter, nominee))
        } else if (action === 'show_voters') {          
          return getPromise.then(_applyShowAllVoters(context, address, voter, nominee))          
        } else {
          throw new InvalidTransaction(`Didn't recognize Action "${action}".\nMust be "nominate", "show_candidates"`)
        }

      })
  }
}

module.exports = VotingHandler

