async function CreateCustomer(customerData, forceNew = false) {
    let leads =[]
    // console.log("customerData", customerData);
    let lId = 0;
    if (!forceNew) {
        // propsalId = proposalId
        if(lId == 0){
            let fields={
                cxFields:[
                    {
                        fieldName:"proposalId",
                        split:false
                    }
                ],
                cxDataFields:[
                    {
                        fieldName:"proposalId",
                        split:false
                    }
                ]
            }
            lId = matchCustomer(leads,customerData,fields," ",1)
        }
        //firstName, lastName = customer_name
        if(lId == 0){
            let fields={
                cxFields:[
                    {
                        fieldName:"firstName",
                        split:false
                    },
                    {
                        fieldName:"lastName",
                        split:false
                    }
                ],
                cxDataFields:[
                    {
                        fieldName:"customer_name",
                        split:0
                    },
                    {
                        fieldName:"customer_name",
                        split:1
                    }
                ]
            }
            lId = matchCustomer(leads,customerData,fields," ", 2)
        }
        
    }
    if(lId == 0){
        db.collection("Customers").add(customerData);
    }
    else{
        db.collection("Customers").doc(lId).set(customerData, { merge: true });
    }
}   
async function matchCustomer(leads,customerData,fields,delimeter, propNo){
    if(leads.length == 0){
        await db
        .collection("Leads")
        .where("firstName", "==", customerData["customerame"].split(delimeter)[0])
        .where("lastName", "==", customerData.customerName.split(delimeter)[1])
        .get().then((query)=>{
            query.forEach((doc)=>{
                let data = doc.data()
                data.id = doc.id
                leads.push(data)
            })
        })
        if (leads.length == 1) {
            lId = leads[0].id;
        }
    }
    else{
        for(let i=0; i< leads.length; i++){
            // let mathch = true
                        //for loop cxfield 
                        //noman firstName customerData customerFiled
            //cxfield 
            if(leads[i].firstName == customerData.customerName.split(delimeter)[0] && leads[i].lastName == customerData.customerName.split(delimeter)[1] ){
                // match=true
                leads[i].points += 1/propNo //point will giv in parameter
            }
        }
        let maxPoints = 0
        let maxCount =0
        let maxLead;
        for(let i=0; i< leads.length; i++){
            if(leads[i].points >maxPoints ){
                maxPoints = leads[i].points
                maxCount =0
                maxLead= leads[i]
            }
            if(leads[i].points == maxPoints){
                maxCount++
            }
        }
        if(maxCount ==1){
            lId = maxLead.id
        }
    }
}
async function CreateCustomer(customerData, forceNew = false) {
    let lId = 0;
    if (!forceNew) {
    //findMatch //
        let leads = await db.collection("Leads").where("proposalId" == customerData.proposalId).get();
        if (leads.length == 1) {
            lId = leads[0].id;
        }
        // matchCustomer(customerData, "firstName", "fName", 1)
        // matchCustomer(customerData, "email", "email", 1/2)
        if(lId == 0){
            if(leads.length == 0){
                leads = await db
                .collection("Customer")
                .where("firstName", "==", customerData.customerName.split(" ")[0])
                .where("lastName", "==", customerData.customerName.split(" ")[1])
                .get()
                
                if (leads.length == 1) {
                    lId = leads[0].id;
                }
            }
            else{
                for(let i=0; i< leads.length; i++){
                    if(leads[i].firstName == customerData.customerName.split(" ")[0] && leads[i].lastName == customerData.customerName.split(" ")[1] ){
                        leads[i].points += 1/1 //point will giv in parameter
                    }
                }
                let maxPoints = 0
                let maxCount =0
                let maxLead;
                for(let i=0; i< leads.length; i++){
                    if(leads[i].points >maxPoints ){
                        maxPoints = leads[i].points
                        maxCount =0
                        maxLead= leads[i]
                    }
                    if(leads[i].points == maxPoints){
                        maxCount++
                    }
                }
                if(maxCount ==1){
                    lId = maxLead.id
                }
            }
            //consideration
            // 1: when we have 2 equal possible matches , how to tie breaking
            //2: priorities 
        
            
        }
        

    }
    if(lId == 0){
        db.collection("Customers").add(customerData);
    }
    else{
        db.collection("Customers").doc(lId).set(customerData, { merge: true });
    }    
}

    


// if(customerData.state!== undefined){
//     await db
//     .collection("Leads")
//     .where(`street`, "==", customerData.street )
//     .where("city", "==", customerData.city)
//     .get().then((query)=>{
//         query.forEach((doc)=>{
//             let data = doc.data()
//             data.id = doc.id
//             if(data.zip == customerData.zip && data.state == customerData.state){
//                 newLead.push(data)
//             }
//         })
//     })
// }




// if(customerData.state!== undefined){
//     for(let i=0; i< leads.length; i++){
//         if(leads[i].state == customerData.state
//             && leads[i].city == customerData.city
//             && leads[i].street == customerData.street
//             && leads[i].zip == customerData.zip ){
//             leads[i].points += points //point will giv in parameter
//         }
//     }
//     let maxPoints = 0
//     let maxCount =0
//     let maxLead;
//     for(let i=0; i< leads.length; i++){
//         if(leads[i].points >maxPoints ){
//             maxPoints = leads[i].points
//             maxCount =0
//             maxLead= leads[i]
//         }
//         if(leads[i].points == maxPoints){
//             maxCount++
//         }
//     }
//     if(maxCount ==1){
//         lId = maxLead.id
//     }
// }