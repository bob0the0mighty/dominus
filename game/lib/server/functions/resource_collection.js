gather_resources_new = function() {
	clear_cached_user_update()
	var start_time = new Date()

	// buy resources in the market with the collected taxes
	// this is to keep the market from going down
	var tax = Settings.findOne({name:'taxesCollected'})
	if (tax && tax.value) {
		var taxPerResource = tax.value / s.resource.types.length
		check(taxPerResource, validNumber)

		_.each(s.resource.types, function(type) {
			var price = Market.findOne({type: type}, {fields: {price:1}}).price
			var amount = max_buy_withoutRounding(taxPerResource, price)
			update_market_price(type, amount, true)
		})
	}

	// reset taxes
	Settings.update({name:'taxesCollected'}, {$set:{value:0}})

	// only receive income if email is verified
	Meteor.users.find({}, {fields:{emails:1}}).forEach(function(user) {
		if (user && user.emails[0].verified) {

			receive_income_id(
				user._id,
				20,
				s.castle.income.grain,
				s.castle.income.lumber,
				s.castle.income.ore,
				s.castle.income.wool,
				s.castle.income.clay,
				s.castle.income.glass
			)
		}
	})


	Villages.find({under_construction:false}, {fields: {user_id:1, x:1, y:1, level:1}}).forEach(function(res) {

		// only receive income if email is verified
		var user = Meteor.users.findOne(res.user_id, {fields:{emails:1}})
		if (user && user.emails[0].verified) {

			var income = resourcesFromSurroundingHexes(res.x, res.y, s.resource.num_rings_village)

			income.gold = s.resource.gold_gained_at_village

			// add production bonus for level 2 and 3 villages
			var multiplier = s.village.productionBonus['level'+res.level]

			_.each(s.resource.types, function(type) {
				income[type] = income[type] * multiplier
			})

			receive_income_id(res.user_id, income.gold, income.grain, income.lumber, income.ore, income.wool, income.clay, income.glass)

			// find worth for rankings and right panel
			// TODO: could this be made asynchronous? // it slows down this function
			income.worth = s.resource.gold_gained_at_village
			income.worth += resources_to_gold(income.grain, income.lumber, income.ore, income.wool, income.clay, income.glass)
			Villages.update(res._id, {$set: {income:income}})

		}
	})

	run_cached_user_update()
	record_job_stat('gather_resources_new', new Date() - start_time)
}
