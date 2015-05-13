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
	User.findOrCreate({where: {username: req.body.username}}).spread(function(user,created) {
		if (created) {
			user.name = req.body.name;
			user.password_hash = req.body.password;
			user.save().then(function(user) {
				console.log("Created User");
     			// send token
     			var token = jwt.sign({ id: user.id }, SECRET);
     			res.json({name: user.name, token: token});
     		});
		} else {
			console.log("User exists");
			res.sendStatus("403");
		}
	});
});

// login a user
app.post('/api/users/login', function (req, res) {
	User.find({where: {username: req.body.username}}).then(function(user) {
		if (user && user.checkPassword(req.body.password)) {
			console.log("OK");
			// need to send token
			var token = jwt.sign({ id: user.id }, SECRET);
			res.json({name: user.name, token: token});
		} else {
			console.log("No User");
			res.sendStatus(403);
		}
	});
});

app.get('/api/items', function (req,res) {
	user = User.verifyToken(req.headers.authorization, function(user) {
		if (user) {
			user.getItems().then(function(items) {
				res.json({items: items});
			});
		} else {
			res.sendStatus(403);
		}
	});
});

app.post('/api/items', function (req,res) {
	console.log(req.body);
	user = User.verifyToken(req.headers.authorization, function(user) {
		if (user) {
			Item.create({title:req.body.item.title,UserId:user.id}).then(function(item) {
				console.log(item.get());
				res.json({item:item.get()});
			});
		} else {
			res.sendStatus(403);
		}
	});
});

app.get('/api/items/<string:id>', function (req,res) {
	res.send('Get an item');
});

app.put('/api/items/<string:id>', function (req,res) {
	res.send('Update an item');
});

app.delete('/api/items/<string:id>', function (req,res) {
	res.send('Delete an item');
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
		password_hash: function(password) {
			this.setDataValue('password_hash',bcrypt.hashSync(password, SALT));
		}
	},
	instanceMethods: {
		checkPassword: function(password) {
			return bcrypt.compareSync(password,this.password_hash);
		}
	},
	classMethods: {
		verifyToken: function(token,cb) {
			jwt.verify(token, SECRET, function(err, decoded) {
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

	console.log('listomatic node server listening at http://%s:%s', host, port);

});
