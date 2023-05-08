require('dotenv').config();
const { MongoClient, ObjectId } = require("mongodb");
const User = require("./user");

MongoClient.connect(
    // "mongodb+srv://chiam:chiam@cluster0.an2vt5v.mongodb.net/weposeAPI",
	process.env.MONGO_URI,
	{ useNewUrlParser: true },
).catch(err => {
	console.error(err.stack)
	process.exit(1)
}).then(async client => {
	console.log('Connected to MongoDB');
	User.injectDB(client);
})

const express = require('express')
const app = express()
const port = process.env.PORT || 3000

const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')
const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'WePOSE API',
			version: '1.0.0',
		},
		basePath: "/",
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				}
			}
		},
		security: [{
			bearerAuth: []
		}]
	},
	apis: ['./main.js'],
}
const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.json())
app.use(express.urlencoded({ extended: false }))


/***************************************  USER FUNCTION  ***************************************/
//         Register, Login, Update (Visitor and Admin), Delete, View Reservation Info              //
//                  Register, Login, Manage Admin collections, View Visitor Info                   //

app.post('/registerUser', async (req, res) => {
	console.log("User registeration:")
	console.log(req.body);
	schemaUser = {
		UserName: req.body.UserName,
		UserPassword: req.body.UserPassword,
		UserConfirmPassword: req.body.UserConfirmPassword,
		UserEmail: req.body.UserEmail
	}
	const user = await User.register(schemaUser);
	if (user.msg == "Email exists") {
		return res.status(404).json({
			success: false,
			msg: "The email already exists!"
		})
	}
	if (user.msg == "Passwords do not match") {
		return res.status(404).json({
			success: false,
			msg: "Passwords do NOT match!"
		})
	}
	if (user.status == true) {
		return res.status(200).json({
			success: true,
			msg: "User Registeration Success"
		})
	}    
})

app.post('/loginUser', async (req, res) => {
	console.log("User login:")
	console.log(req.body);
	const user = await User.login(req.body.UserName, req.body.UserPassword);

	if (user.status == "Invalid password" || user.status == "Invalid username" ) {
		return res.status(404).json({
			success: false,
			msg: "Login failed"})
	}

	res.status(200).json({
		success: true,
		UserName: user.UserName,
		UserEmail: user.UserEmail,
		role: user.role,
		token: generateAccessToken({
			UserEmail: user.UserEmail,
			role: user.role
		})
	})
})

app.patch('/UserProfile/UpdateUserName', verifyToken, async (req, res) => {
	if (req.user.role == 'user') {
		console.log("Update Username:")
		console.log(req.body);
		schemaUser = {
			UserEmail: req.body.UserEmail,
			UserName: req.body.UserName
		}
		const user = await User.updateUserName(schemaUser);
		if (user.status == false) {
			return res.status(404).json({
				success: false,
				msg: "Update failed"})
		} 
		
		return res.status(200).json({
			success: true,
			msg: "Username updated!",
			UserName: user.UserName,
			UserEmail: user.UserEmail,
			role: user.role,
	})			
		
	} else {
		return res.status(403).json({
			success: false,
			msg: 'Unauthorized'})
	}	
})

app.patch('/UserProfile/UpdateUserPassword', verifyToken, async (req, res) => {
	if (req.user.role == 'user') {
		console.log("Update User Password:")
		console.log(req.body);
		schemaUser = {
			UserEmail: req.body.UserEmail,
			UserOldPassword: req.body.UserOldPassword,
			UserNewPassword: req.body.UserNewPassword,
			UserNewConfirmPassword: req.body.UserNewConfirmPassword
		}
		const user = await User.updateUserPassword(schemaUser);
		if (user.msg == "New password and confirm password do not match") {
			return res.status(404).json({
				success: false,
				msg: "New password and confirm password do not match!"})
		} 
		if (user.msg == "Incorrect old password") {
			return res.status(404).json({
				success: false,
				msg: "Incorrect old password!"})
		} 
		if (user.msg == "Email is not exits") {
			return res.status(404).json({
				success: false,
				msg: "Email is not exits!"})
		} 
		if (user.status == true) {
			return res.status(200).json({
				success: true,
				msg: "Password updated!"
			})
		} 		
	} else {
		return res.status(403).json({
			success: false,
			msg: 'Unauthorized'})
	}	
})

app.delete('/UserProfile/DeleteAccount/:UserEmail', verifyToken, async (req, res) => {
	if (req.user.role == 'user') {
		console.log("Delete Account:")
		console.log(req.body);
		const user = await User.delete(req.params.UserEmail);
		if (user.status == false) {
			return res.status(404).json({
				success: false,
				msg: "Email is not exits!"})
		}
		if (user.status == true ) {
			return res.status(200).json({
				success: true,
				msg: "The account is deleted!"})
		}
	} else {
		return res.status(403).json({
			success: false,
			msg: 'Unauthorized'})
	}
})

app.get('/WEPOSE/SendDataIMU'), async (req, res) => {
	if (req.user.role == 'user') {
		console.log("Delete Account:")
		console.log(req.body);
		const user = await User.delete(req.params.UserEmail);
		if (user.status == false) {
			return res.status(404).json({
				success: false,
				msg: "Email is not exits!"})
		}
		if (user.status == true ) {
			return res.status(200).json({
				success: true,
				msg: "The account is deleted!"})
		}
	} else {
		return res.status(403).json({
			success: false,
			msg: 'Unauthorized'})
	}
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})

const jwt = require('jsonwebtoken');
function generateAccessToken(payload) {
	return jwt.sign(payload, "my-super-secret", { expiresIn: '1h' });
}

function verifyToken(req, res, next) {
	const authHeader = req.headers['authorization']
	const token = authHeader && authHeader.split(' ')[1]

	if (token == null) {
		return res.sendStatus(401)
	}

	jwt.verify(token, "my-super-secret", (err, user) => {
		console.log(err)

		if (err) {
			return res.sendStatus(403)
		}
		req.user = user
		next()
	})
}

