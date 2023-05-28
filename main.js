require('dotenv').config();
const { MongoClient, ObjectId } = require("mongodb");
const User = require("./user");
const axios = require('axios');

MongoClient.connect(
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
const sensorDataUrl = process.env.SENSOR_DATA_URL;

let data = []; // store the received data
let pitch = 0.0;
let roll = 0.0;
let j = 0;

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

function updateSensorData(newPitch, newRoll) {
	pitch = newPitch;
	roll = newRoll;
}

// async function getSensorData() {
//     try {
//         const response = await axios.post(sensorDataUrl);
//         console.log(response.data);
// 		const curPitch = parseFloat(response.data.pitch)
// 		const curRoll = parseFloat(response.data.roll)
// 		updateSensorData(curPitch, curRoll)
//     } catch (error) {
//         console.log(error);
//     }
// }

/***************************************  USER FUNCTION  ***************************************/
app.get('/', async (req, res) => {
	console.log("HELLO")
	return res.status(200).json({msg: "Hello World"})
})

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

// define POST route to receive data from arduino
app.post('/WEPOSE/sensorDataIMU', async (req, res) => {
	let isDataReceived = false;
	if (!isDataReceived) {
		console.log("Receiving IMU data from sensor....");
		const curPitch = parseFloat(req.body.pitch)
		const curRoll = parseFloat(req.body.roll)
		updateSensorData(curPitch, curRoll)
		console.log("pitch: ", curPitch)
		console.log("roll:", curRoll )
		isDataReceived = true
	}
	
	res.status(200).json({msg:"Data received!"});
});

// Initialization step : Collect correct data for user for further classification
app.get('/WEPOSE/initSitPosture', async (req, res) => {
	try {
		console.log("Initialization:")

		// loop for take 30 datasets
		for (j = 0; j < 30; j++) {
			await axios.get('https://web-production-23955.up.railway.app/WEPOSE/sensorDataIMU');
			data.push([pitch, roll])
			console.log("pitch: ", pitch)
			console.log("roll:", roll )	
	
			await new Promise(resolve => setTimeout(resolve, 1000)); // Sleep for 1 second before collecting the next data point
		}
		const meanNormal = data.reduce((acc, curr) => {
			return acc.map((sum, index) => sum + curr[index]);
		}, new Array(data[0].length).fill(0)).map(sum => sum / data.length);
		
		const stdNormal = data.reduce((acc, curr) => {
			return acc.map((sum, index) => sum + Math.pow(curr[index] - meanNormal[index], 2));
		}, new Array(data[0].length).fill(0)).map(sum => Math.sqrt(sum / data.length));	

		
		sample = {
			meanNormal: meanNormal,
			stdNormal: stdNormal
		}

		await User.updateUserInitSitData("test@example.com", sample)

		data = []; // after the model successfully stored, delete the data received from sensor for the next user

		console.log("SUCCESS store model into database")
		
		return res.status(200).json({msg: "Success"});
	} catch (error) {
		console.error('An error occurred:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	  }

})

// Initialization step : Collect correct data for user for further classification
app.get('/WEPOSE/predictSitPosture', async (req, res) => {
	try {
		console.log("Prediction Test:")

		// get the store data from database for prediction
		const modelData = await User.getUserInitSitData("test@example.com");
		await axios.post('/WEPOSE/sensorDataIMU');
		// get the current pitch and roll angle
		const newSample = [[pitch, roll]];
		console.log("Predict data:", newSample)
		
		const threshold = 10;

		const diff = newSample[0].map((val, index) => Math.abs(val - modelData.meanNormal[index]));
		console.log(diff)

		var classify = ""
		let result = -1
		
		// Perform prediction based on difference with the mean value
		if (diff.some(val => val > threshold))  {
			classify = "Abnormal"
			result = 0
		} else {
			classify = "Normal"
			result = 1
		}

		return res.status(200).json({
			success: true, 
			cValue: newSample, 
			dff: diff,
			pitch: newSample[0][0], 
			roll: newSample[0][1],
			prediction: result
		});
	} catch (error) {
		console.error('An error occurred:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	  }

})

// /test require <apt-get update && apt-get install -y python3 python3-pip && pip3 install scikit-learn> put in the build command of railway
// const { spawn } = require('child_process');
app.get('/test', async (req, res) => {
	console.log("Testing...");
	const pythonScript = spawn('python3', ['./script.py']);
	let data1;
	// process output from python script
	pythonScript.stdout.on('data', function(data) {
		data1 = data.toString();
	});

	// 监听 Python 脚本的退出事件
	pythonScript.on('close', (code) => {
		console.log('Python 脚本退出，退出码:', code);
		res.send(data1);
	});
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

