Template.rp_info_army.helpers({
	infoLoaded: function() {
		return Session.get('rightPanelInfoLoaded')
	},

	battleInfoReady: function() {
		return Template.instance().battleInfoReady.get()
	},

	battle: function() {
		if (this) {
			return Battles.findOne({x:this.x, y:this.y})
		}
	},

	moves: function() {
		return Template.instance().moves.get()
	},

	is_moving: function() {
		return (Template.instance().moves.get().length > 0)
	},

	total_distance: function() {
		return Template.instance().totalDistance.get()
	},

	total_duration: function() {
		return ms_to_short_time_string(Template.instance().totalDuration.get())
	},

	has_enough_to_split: function() {
		if (this) {
			var self = this

			var count = 0
			_.each(s.army.types, function(type) {
				count += self[type]
			})

			return (count > 1)
		}
	},

	is_owner: function() {
		if (this && this.user_id == Meteor.userId()) {
			return true
		}
	},

	next_move_at: function() {
		Session.get('refresh_time_field')
		var move = Template.instance().moves.get()[0]
		if (move) {
			var army_speed = Template.instance().speed.get()
			var move_time = moment(new Date(move.last_move_at)).add(army_speed, 'minutes')
			if (move_time < moment()) {
				return 'soon'
			} else {
				return move_time.fromNow()
			}
		}
	},

	reach_destination_at: function() {
		if (this) {
			var self = this
			Session.get('refresh_time_field')
			var moves = Template.instance().moves.get()

			if (moves.length == 0) {
				return 0
			}

			var distance = 0
			var last_move_at
			moves.forEach(function(move) {
				if (move.index == 0) {
					var d = Hx.hexDistance(self.x, self.y, move.to_x, move.to_y)
					last_move_at = move.last_move_at
				} else {
					var d = Hx.hexDistance(move.from_x, move.from_y, move.to_x, move.to_y)
				}
				distance += d
			})

			var army_speed = Template.instance().speed.get()
			var move_time = moment(new Date(last_move_at)).add(distance * army_speed, 'minutes')
			if (move_time < moment()) {
				return 'soon'
			} else {
				return move_time.fromNow()
			}
		}
	},

	is_another_army_here: function() {
		if (this) {
			if (Armies.find({user_id: Meteor.userId(), x: this.x, y: this.y}).count() > 1) {
				return true
			}
		}
	},


	is_on_grain_hex: function() {
		var hex = Hexes.findOne({x:this.x, y:this.y}, {fields: {type:1}})
		if (hex && hex.type == 'grain') {
			if (Castles.find({x:this.x, y:this.y}, {reactive:false}).count() == 0) {
				if (Villages.find({x:this.x, y:this.y}, {reactive:false}).count() == 0) {
					return true
				}
			}
		}
	},

	is_on_village: function() {
		var num_villages = Villages.find({x:this.x, y:this.y}).count()
		if (num_villages && num_villages > 0) {
			return true
		}
	},

	has_enough_grain: function() {
		var user = Template.instance().userData.get()
		if (user && user.grain >= s.village.cost.grain) {
			return true
		}
	},

	has_enough_lumber: function() {
		var user = Template.instance().userData.get()
		if (user && user.lumber >= s.village.cost.lumber) {
			return true
		}
	},

	has_enough_ore: function() {
		var user = Template.instance().userData.get()
		if (user && user.ore >= s.village.cost.ore) {
			return true
		}
	},

	has_enough_wool: function() {
		var user = Template.instance().userData.get()
		if (user && user.wool >= s.village.cost.wool) {
			return true
		}
	},

	has_enough_clay: function() {
		var user = Template.instance().userData.get()
		if (user && user.clay >= s.village.cost.clay) {
			return true
		}
	},

	has_enough_glass: function() {
		var user = Template.instance().userData.get()
		if (user && user.glass >= s.village.cost.glass) {
			return true
		}
	},

	how_many_villages_can_i_build: function() {
		return s.village.max_can_have - Session.get('num_villages')
	},

	has_less_than_max_villages: function() {
		return (Session.get('num_villages') < s.village.max_can_have)
	},

	villageWorth: function() {
		return Template.instance().villageWorth.get()
	},


})



Template.rp_info_army.events({
	'click #join_village_button': function(event, template) {
		Meteor.call('army_join_building', this._id)
	},

	'click #disband_army_button': function(event, template) {
		Session.set('rp_template', 'rp_disband_army_confirm')
	},

	'click #move_army_button': function(event, template) {
		Session.set('rp_template', 'rp_move_unit')
	},

	'click #return_to_castle_button': function(event, template) {
		var castle = Castles.findOne({user_id: Meteor.userId()})
		if (castle) {
			if (this.x == castle.x && this.y == castle.y) {
				Meteor.call('army_join_building', this._id)
			} else {
				var moves = [{
					from_x:this.x,
					from_y:this.y,
					to_x:castle.x,
					to_y:castle.y
				}]
				Meteor.call('create_moves', this._id, moves)
			}
		}
	},

	'click #stop_movement_button': function(event, template) {
		Meteor.call('remove_all_moves', this._id)
	},

	'click #combine_armies_button': function(event, template) {
		Meteor.call('combine_armies', this._id)
	},

	'click #split_armies_button': function(event, template) {
		Session.set('rp_template', 'rp_split_armies')
	},

	'click #build_village_button': function(event, template) {
		var alert = template.find('#build_village_error_alert')
		var button = template.find('#build_village_button')

		$(alert).hide()

		var button_html = $(button).html()
		$(button).attr('disabled', true)
		$(button).html('Please Wait')

		Meteor.call('build_village', this.x, this.y, function(error, result) {
			if (error) {
				$(alert).show()
				$(alert).html('Error when building village.')
				$(button).attr('disabled', false)
				$(button).html(button_html)
			} else {
				if (result.result) {
					Session.set('selected_type', 'village')
					Session.set('selected_id', result.id)
				} else {
					$(alert).show()
					$(alert).html(result.msg)
					$(button).attr('disabled', false)
					$(button).html(button_html)
				}
			}
		})
	},

	'click .remove_move_button': function(event, template) {
		Meteor.call('remove_move', this._id, this.index)
	}
})



Template.rp_info_army.created = function() {
	var self = this


	self.speed = new ReactiveVar(0)
	self.autorun(function() {
		if (Template.currentData() && Template.currentData().footmen) {
			self.speed.set(speed_of_army(Template.currentData()))
		}
	})


	self.userData = new ReactiveVar(null)
	this.autorun(function() {
		var fields = {}
		_.each(s.resource.types, function(type) {
			fields[type] = 1
		})
		var user = Meteor.users.findOne(Meteor.userId(), {fields: fields})
		if (user) {
			self.userData.set(user)
		}
	})


	self.moves = new ReactiveVar(null)
	self.totalDistance = new ReactiveVar(0)
	self.totalDuration = new ReactiveVar(0)
	self.autorun(function() {
		if (Template.currentData()) {
			var moves = Moves.find({army_id:Template.currentData()._id})
			var index = 0
			var totalDistance = 0
			var totalDuration = 0
			moves = moves.map(function(move) {
				move.distance = Hx.hexDistance(move.from_x, move.from_y, move.to_x, move.to_y)
				totalDistance += move.distance
				var dur = self.speed.get() * move.distance * 1000 * 60
				move.duration = ms_to_short_time_string(dur)
				totalDuration += dur
				move.index = index
				move.num = index+1
				index++
				return move
			})
			self.moves.set(moves)
			self.totalDistance.set(totalDistance)
			self.totalDuration.set(totalDuration)
		}
	})


	self.battleInfoReady = new ReactiveVar(false)
	self.autorun(function() {
		if (Template.currentData()) {
			var handle = Meteor.subscribe('battle_notifications_at_hex', Template.currentData().x, Template.currentData().y)
			self.battleInfoReady.set(handle.ready())
		}
	})


	self.autorun(function() {
		if (Template.currentData()) {
			Meteor.subscribe('army_moves', Template.currentData()._id)

			Session.set('mouse_mode', 'default')
			Session.set('update_highlight', Random.fraction())

			Session.get('update_highlight')
			if (Session.get('mouse_mode') != 'finding_path') {
				if (Session.get('selected_type') == 'army') {
					var selected_id = Session.get('selected_id')
					remove_all_highlights()
					draw_army_highlight(selected_id)
					var moves = Moves.find({army_id:selected_id})
					if (moves && moves.count() > 0) {
						moves.forEach(function(move) {
							highlight_hex_path(move.from_x, move.from_y, move.to_x, move.to_y)
						})
					}
				}
			} else {
				// if army dies remove highlights
				remove_all_highlights()
			}
		}
	})


	self.villageWorth = new ReactiveVar(null)
	self.autorun(function() {
		if (Template.currentData()) {
			var res = {
				gold:s.resource.gold_gained_at_village,
				grain:0,
				lumber:0,
				ore:0,
				wool:0,
				clay:0,
				glass:0
			}

			var hexes = Hx.getSurroundingHexes(Template.currentData().x, Template.currentData().y, s.resource.num_rings_village)
			_.each(hexes, function(hex) {
				var h = Hexes.findOne({x:hex.x, y:hex.y}, {fields:{type:1, large:1}, reactive:false})
				if (h) {
					if (h.large) {
						res[h.type] += s.resource.gained_at_hex * s.resource.large_resource_multiplier
					} else {
						res[h.type] += s.resource.gained_at_hex
					}
				}
			})

			var gold = s.resource.gold_gained_at_village
			gold += resources_to_gold(res.grain, res.lumber, res.ore, res.wool, res.clay, res.glass)
			self.villageWorth.set(gold)
		}
	})

}