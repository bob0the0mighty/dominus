Meteor.methods({
    forumNewTopic: function(title, tagId, text) {
        var self = this;
        self.unblock();

        if (title.length < 1) {
            throw new Meteor.Error('Title too short.');
        }

        if (text.length < 1) {
            throw new Meteor.Error('Text too short.');
        }

        if (title.length > 100) {
            throw new Meteor.Error('Title too long, 100 characters max.');
        }

        if (text.length > 5000) {
            throw new Meteor.Error('Text too long, 5000 characters max.');
        }

        var fields = {username:1, x:1, y:1, castle_id:1, emails:1};
        var user = Meteor.users.findOne(Meteor.userId(), {fields:fields});

        if (!user) {
            throw new Meteor.Error('Could not find user.');
        }

        if (!landingConnection.status().connected) {
            throw new Meteor.Error('Cannot connect to base.  Try again in a few minutes.');
        }

        if (self.isSimulation) {
            Session.set('forumTemplate', 'forumList');
        } else {

            var topicData = {
                title: title,
                tagId: tagId,
                gameId: process.env.GAME_ID,
            };

            var postData = {
                tagId: tagId,
                userId: user._id,
                username: user.username,
                text: prepareTextForForum(text),
                castleX: user.x,
                castleY: user.y,
                castleId: user.castle_id,
                gameId: process.env.GAME_ID,
                email: user.emails[0].address
            };

            landingConnection.call('forumInsertTopic', process.env.DOMINUS_KEY, topicData, function(error, topicId) {
                if (error) {
                    throw new Meteor.Error('Error inserting topic.');
                } else {

                    postData.topicId = topicId;

                    landingConnection.call('forumInsertPost', process.env.DOMINUS_KEY, postData, function(error, postId) {
                        if (error) {

                            Meteor.defer(function() {
                                landingConnection.call('forumRemoveTopic', process.env.DOMINUS_KEY, topicId);
                            });
                            throw new Meteor.Error('Error inserting post.');

                        } else {

                        }
                    });
                }
            });
        }
    }
});
