// setup Express
var express = require('express');
var app = express();

// setup body parser
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
})); 

// setup Sequelize
var Sequelize = require('sequelize');
var sequelize = new Sequelize('list',null,null, {
	dialect: 'sqlite',
	storage: './list.db'
});
sequelize.sync();

// setup bcrypt
var bcrypt = require('bcrypt');
var SALT = bcrypt.genSaltSync();

// setup json web token
var jwt = require('jsonwebtoken');
var SECRET = '\x1f\x1e1\x8a\x8djO\x9e\xe4\xcb\x9d`\x13\x02\xfb+\xbb\x89q"F\x8a\xe0a';

// setup static directory
app.use(express.static('public'));

//
// API
//

// register a user
app.post('/api/users/register', function (req, res) {
	// find or create the user with the given username
	User.findOrCreate({where: {username: req.body.username}}).spread(function(user,created) {
		if (created) {
			// if this username is not taken, then create a user record
			user.name = req.body.name;
			user.password_hash = req.body.password;
			user.save().then(function(user) {
     			// create a token
     			var token = jwt.sign({ id: user.id }, SECRET);
     			// return value is JSON containing the user's name and token
     			res.json({name: user.name, token: token});
     		});
		} else {
			// return an error if the username is taken
			res.sendStatus("403");
		}
	});
});

// login a user
app.post('/api/users/login', function (req, res) {
	// find the user with the given username
	User.find({where: {username: req.body.username}}).then(function(user) {
		// validate the user exists and the password is correct
		if (user && user.checkPassword(req.body.password)) {
			// create a token
			var token = jwt.sign({ id: user.id }, SECRET);
			// return value is JSON containing user's name and token
			res.json({name: user.name, token: token});
		} else {
			res.sendStatus(403);
		}
	});
});

// get all items for the user
app.get('/api/items', function (req,res) {
	// validate the supplied token
	user = User.verifyToken(req.headers.authorization, function(user) {
		if (user) {
			// if the token is valid, find all the user's items and return them
			user.getItems().then(function(items) {
				// return value is the list of items as JSON
				res.json({items: items});
			});
		} else {
			res.sendStatus(403);
		}
	});
});

// add an item
app.post('/api/items', function (req,res) {
	// validate the supplied token
	user = User.verifyToken(req.headers.authorization, function(user) {
		if (user) {
			// if the token is valid, create the item for the user
			Item.create({title:req.body.item.title,completed:false,UserId:user.id}).then(function(item) {
				// return value is the item as JSON
				res.json({item:item.get()});
			});
		} else {
			res.sendStatus(403);
		}
	});
});

// get an item
app.get('/api/items/:item_id', function (req,res) {
	// validate the supplied token
	user = User.verifyToken(req.headers.authorization, function(user) {
		if (user) {
			// if the token is valid, then find the requested item
			Item.find(req.params.item_id).then(function(item) {
				// get the item if it belongs to the user, otherwise return an error
				if (item.UserId != user.id) {
					res.sendStatus(403);
				}
				// return value is the item as JSON
				res.json({item:item.get()});
			});
		} else {
			res.sendStatus(403);
		}
	});
});

// update an item
app.put('/api/items/:item_id', function (req,res) {
	// validate the supplied token
	user = User.verifyToken(req.headers.authorization, function(user) {
		if (user) {
			// if the token is valid, then find the requested item
			Item.find(req.params.item_id).then(function(item) {
				// update the item if it belongs to the user, otherwise return an error
				if (item.UserId != user.id) {
					res.sendStatus(403);
				}
				item.title = req.body.item.title;
				item.completed = req.body.item.completed;
				item.save().then(function() {
					// return value is the item as JSON
					res.json({item:item.get()});
				});
			});
		} else {
			res.sendStatus(403);
		}
	});
});

// delete an item
app.delete('/api/items/:item_id', function (req,res) {
	// validate the supplied token
	user = User.verifyToken(req.headers.authorization, function(user) {
		if (user) {
			// if the token is valid, then find the requested item
			Item.find(req.params.item_id).then(function(item) {
				// delete the item if it belongs to this user, otherwise return an error
				if (item.UserId != user.id) {
					res.sendStatus(403);
				}
				item.destroy().then(function() {
					// return value is 200
					res.sendStatus(200);
				});
			});
		} else {
			res.sendStatus(403);
		}
	});
});

//
// Models
//

// A user has a name, username, password, and list of items
var User = sequelize.define('User', {
	name: Sequelize.STRING,
	username: {type: Sequelize.STRING, unique: true},
	password_hash: Sequelize.STRING,
},{
	indexes: [
	{
		unique: true,
		fields: ['username']
	}
	],
	setterMethods: {
		// convert the password into a hash
		password_hash: function(password) {
			this.setDataValue('password_hash',bcrypt.hashSync(password, SALT));
		}
	},
	instanceMethods: {
		// check that the password hash matches
		checkPassword: function(password) {
			return bcrypt.compareSync(password,this.password_hash);
		}
	},
	classMethods: {
		// verify the token is valid
		verifyToken: function(token,cb) {
			if (!token) {
				cb(null);
				return;
			}
			// decrypt the token and verify that the encoded user id is valid
			jwt.verify(token, SECRET, function(err, decoded) {
				if (!decoded) {
					cb(null);
					return;
				}
				User.find({where: {id: decoded.id}}).then(function(user) {
					cb(user);
				});
			});

		}
	}
});

// an item has a title, created date, due date, and completed flag
var Item = sequelize.define('Item', {
	title: Sequelize.STRING,
	created: Sequelize.DATE,
	due: Sequelize.DATE,
	completed: Sequelize.BOOLEAN,
},
{
	classMethods: {
	}
}
);

// a user has many items
User.hasMany(Item);

// start the server
var server = app.listen(3000, function () {

	var host = server.address().address;
	var port = server.address().port;


});
