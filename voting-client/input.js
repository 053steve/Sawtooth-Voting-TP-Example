const input = {
  
  payloadIsValid: (payload) => {    
    if(actionIsValid(payload.Action) && (payload.Action === 'show_candidates' || payload.Action === 'show_voters')) {      
      if (actionIsValid(payload.Action)) return true
    } else if (actionIsValid(payload.Action) && payload.Action === 'nominate') {
      if (nameIsValid(payload.Nominee) && actionIsValid(payload.Action) && nameIsValid(payload.Voter)) return true
    } else {
      return false
    }        
  },

  submitPayload: async (payload, transactor) => {
    try {
      // Format the Sawtooth transaction
      const txn = payload
      console.log(`Submitting transaction to Sawtooth REST API`)
      // Wait for the response from the validator receiving the transaction
      const txnRes = await transactor.post(txn)
      // Log only a few key items from the response, because it's a lot of info
      console.log({
        status: txnRes.status,
        statusText: txnRes.statusText
      })
      return txnRes
    } catch (err) {
      console.log('Error submitting transaction to Sawtooth REST API: ', err)
      console.log('Transaction: ', txn)
    }
  }
}

const actionIsValid = (verb) => {
  const trimmed = verb.trim()
  if (trimmed === 'nominate' || trimmed === 'show_candidates' || trimmed === 'show_voters') return true
  else return false
}

const nameIsValid = (name) => {
  if (name.toString().length <= 20) return true
  else return false
}

module.exports = input
