var fields = {x:1,y:1,castle_id:1,income:1, "net.total":1, username:1}

var findVassals = function(user_id) {
    var vassals = []
    Meteor.users.find({lord:user_id}, {fields:fields}).forEach(function(user) {
        user.vassals = findVassals(user._id)
        vassals.push(user)
    })
    return vassals
}


Cue.addJob('generateTree', {retryOnError:false, maxMs:1000*60*5}, function(task, done) {
    generateTree()
    done()
})


generateTree = function() {
    var tree = []

    Meteor.users.find({lord:null}, {fields:fields}).forEach(function(king) {
        king.vassals = findVassals(king._id)
        tree.push(king)
    })

    Settings.upsert({name: 'tree'}, {$set: {name:'tree', value:tree}})
}
