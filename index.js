// this script searches for duplicate deals from hubspot in the closed won and closed lost stages of the 
// sales pipeline, and deletes them. 

const hubspot = require('@hubspot/api-client')
const hubspotClient = new hubspot.Client({ apiKey: "HUBSPOT KEY" })

async function queryHubspotAssociationsWithDealId(dealId) {
    var count = 0
    const contact = await hubspotClient.crm.associations.batchApi.read("deals", "contact", { inputs: [{ id: dealId }] })
    if (contact.body.errors == undefined && contact.body.status == 'COMPLETE') {
        if (contact.body.results.length >= 1 && contact.body.results[0].to.length >= 1) {
            count = count + contact.body.results.length
        }
    } else {
        
    }

    const company = await hubspotClient.crm.associations.batchApi.read("deals", "company", { inputs: [{ id: dealId }] })
    if (company.body.errors == undefined && company.body.status == 'COMPLETE') {
        if (company.body.results.length >= 1 && company.body.results[0].to.length >= 1) {
            count = count + company.body.results.length
        }
    } else {
        
    }
    return count
}

async function loadData(after) {
    const filterPopeLine = { propertyName: 'pipeline', operator: "EQ", value: "default"}
    const filterClosedWon = { propertyName: 'dealstage', operator: "EQ", value: "closedwon"}
    const filterClosedLost = { propertyName: 'dealstage', operator: "EQ", value: "closedlost"}

    const filterGroup1 = {filters: [filterClosedLost, filterPopeLine]}
    const filterGroup2 = {filters: [filterClosedWon, filterPopeLine]}

    const sort = { propertyName: 'dealname', direction: 'DESCENDING' }

    const query = ''
    const properties = ['dealname', 'amount', 'createdate', 'dealstage', 'pipeline']
    const limit = 100

    const ObjectsearchRequest = {
        filterGroups: [filterGroup1, filterGroup2],
        sorts: [sort],
        properties: properties,
        limit: limit,
        after: after,
    }
    let results = await hubspotClient.crm.deals.searchApi.doSearch(ObjectsearchRequest)
    return results
}

async function collectDuplicates() {
    let totalCount = await loadData(0)
    //let totalNumber = 200
    let totalNumber = totalCount.body.total
    
    var currentCount = 0

    var idsToDelete = []
    
    while (currentCount < totalNumber) {
        console.log("Loading data " + currentCount)
        let results = await loadData(currentCount)
        var amount = undefined
        var dealName = undefined
        results.body.results.forEach(element => {
            if (amount === element.properties.amount && dealName === element.properties.dealname) {
                // same as previous
                idsToDelete.push(element.id)
            } else {
                // not the same as previous
                amount = element.properties.amount
                dealName = element.properties.dealname
            }
            currentCount = currentCount + 1
        });
    }
    
    return idsToDelete
}
let dealIds = collectDuplicates()

var deleteCount = 0

dealIds.then((dealIds) => {
    dealIds.forEach( dealId => {
        console.log(deleteCount + " Deleting - " + dealId)
        //delete
        deleteCount += 1
        hubspotClient.crm.deals.basicApi.archive(dealId).then((result) => {
            console.log(deleteCount + " Deleted - " + dealId)
        })
    })
})


