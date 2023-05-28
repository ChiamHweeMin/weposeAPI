const { spawn } = require('child_process');
require('dotenv').config();
const { MongoClient, ObjectId } = require("mongodb");
const User = require("./user");
const { IsolationForest } = require('isolation-forest');

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

let data = []; // store the received data
let i = 0;
let min_valueP = Infinity; 
let max_valueP = -Infinity; 
let min_valueR = Infinity; 
let max_valueR = -Infinity; 
let nPitch = 0.0;
let nRoll = 0.0;
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

// // Function to communicate with the Python process
// const performOneClassClassification = (data) => {
// 	return new Promise((resolve, reject) => {
// 	  // Spawn a Python process
// 	  const pythonProcess = spawn('python', ['path/to/your/script.py']);
  
// 	  // Send data to the Python process
// 	  pythonProcess.stdin.write(JSON.stringify(data));
// 	  pythonProcess.stdin.end(); // End the input stream
  
// 	  // Receive data from the Python process
// 	  let output = '';
// 	  pythonProcess.stdout.on('data', (data) => {
// 		output += data.toString();
// 	  });
  
// 	  // Handle process termination
// 	  pythonProcess.on('close', (code) => {
// 		if (code === 0) {
// 		  // Resolve with the output from the Python process
// 		  resolve(output);
// 		} else {
// 		  // Reject with an error message
// 		  reject(new Error(`Python process exited with code ${code}`));
// 		}
// 	  });
  
// 	  // Handle process errors
// 	  pythonProcess.on('error', (err) => {
// 		reject(err);
// 	  });
// 	});
//   };

/***************************************  USER FUNCTION  ***************************************/
//         Register, Login, Update (Visitor and Admin), Delete, View Reservation Info              //
//                  Register, Login, Manage Admin collections, View Visitor Info                   //
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
	console.log("Receiving IMU data from sensor....");
	pitch = parseFloat(req.body.pitch)
	roll = parseFloat(req.body.roll)
	console.log("pitch: ", pitch)
	console.log("roll:", roll )
	res.status(200).json({msg:"Data received!"});
});

// app.get('/WEPOSE/SendDataIMU', async (req, res) => {
// 	if (dataIMU != null) {
// 	  console.log("Receiving IMU data.....");
// 	//   console.log(dataIMU);
// 	  return res.status(200).json({
// 		"success": true,
// 		"pitch": dataIMU.pitch,
// 		"roll": dataIMU.roll
// 	  })	
// 	} else {
// 	  res.status(404).json({msg: "The data has not been sent."});
// 	}
// });

// Initialization step : Collect correct data for user for further classification
app.get('/WEPOSE/initSitPosture', async (req, res) => {
	try {
		console.log("Initialization:")
		
		// while (i < 20) {
		// 	if (pitch < min_valueP) {
		// 		min_valueP = pitch;
		// 	}
		// 	if (pitch > max_valueP) {
		// 		max_valueP = pitch;
		// 	}
		// 	if (roll < min_valueR) {
		// 		min_valueR = roll;
		// 	}
		// 	if (roll > max_valueR) {
		// 		max_valueR = roll;
		// 	}
		// 	await new Promise(resolve => setTimeout(resolve, 1000));
		// 	i++;
		// }

		for (j = 0; j < 30; j++) {
			// nPitch = (pitch - min_valueP) / (max_valueP - min_valueP) * (1 - (-1)) + (-1);
			// nRoll = (roll - min_valueR) / (max_valueR - min_valueR) * (1 - (-1)) + (-1);
			data.push([pitch, roll])
			console.log("pitch: ", pitch)
			console.log("roll:", roll )	

			// console.log("pitchN: ", nPitch)
			// console.log("rollN:", nRoll )
	
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

		// sample = {
		// 	meanNormal: meanNormal,
		// 	stdNormal: stdNormal,
		// 	min_valueP: min_valueP,
		// 	max_valueP: max_valueP,
		// 	min_valueR: min_valueR,
		// 	max_valueR: max_valueR
		// }
		await User.updateUserMinMaxInitSitData("test@example.com", sample)

		// let receivedModelData = "";

		// // pass the data to python script for training  // 'D:\Users\\60111\\Documents\\GitHub\\weposeAPI\\ModelTraining.py
		// const pythonScript1 = spawn('python3', ['./ModelTraining.py', JSON.stringify(data)]);
		// console.log("Success send data to python")
		// // allocate data sent from python script to string type
		// pythonScript1.stdout.on('data', (data) => {
		// 	// process the output data from python script
		// 	receivedModelData += data.toString();
		// 	console.log("received data:", receivedModelData)
		// });
		// console.log("check1")

		
		// pythonScript1.stderr.on('data', (data) => {
		// 	console.error('An error occurred:', data.toString());
		// });

		// //  process the receivedModelData to JSON type
		// const closePromise = new Promise(async(resolve) => {
		// 	pythonScript1.on('close', async(code) => {
		// 		if (code == 0) {
		// 			try {
		// 				const model = JSON.parse(receivedModelData)
		// 				await User.updateUserInitSitData("test@example.com", model);
		// 				console.log('model:', model)
		// 				resolve(); // indicate completion of Promise
		// 			} catch (error) {
		// 				console.error('Error parsing model:', error);
		// 			}
		// 		} else {
    	// 			console.error('Python script exited with error code:', code);
  		// 		}
		// 	})
		// })
		  
		// console.log("check2")  
		// await closePromise; // wait for the promise to complete
		// console.log("check3")

		// // error handle  
		// pythonScript1.stderr.on('data', (data) => {
		// 	console.error('An error occurred:', data.toString());
		// });

		data = []; // after the model successfully stored, delete the data received from sensor for the next user
		// i = 0;
		// min_valueP = Infinity; 
		// max_valueP = -Infinity; 
		// min_valueR = Infinity; 
		// max_valueR = -Infinity; 

		console.log("SUCCESS store model into database")
		
		return res.status(200).json({msg: "Success"});

		// res.status(200).json({ label: predictedLabel });
	} catch (error) {
		console.error('An error occurred:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	  }

})

// Initialization step : Collect correct data for user for further classification
app.get('/WEPOSE/predictSitPosture', async (req, res) => {
	try {
		console.log("Prediction Test:")

		// get the store train model from database
		const modelData = await User.getUserInitSitData("test@example.com");
		// get the new data
		// nPitch = (pitch - modelData.min_valueP) / (modelData.max_valueP - modelData.min_valueP) * (1 - (-1)) + (-1);
		// nRoll = (roll - modelData.min_valueR) / (modelData.max_valueR - modelData.min_valueR) * (1 - (-1)) + (-1);
		nPrevPitch = (pitch - modelData.meanNormal[0]) / modelData.stdNormal[0]
		nPrevRoll = (roll - modelData.meanNormal[1]) / modelData.stdNormal[1]

		await new Promise(resolve => setTimeout(resolve, 1000));
		nPitch = (pitch - modelData.meanNormal[0]) / modelData.stdNormal[0]
		nRoll = (roll - modelData.meanNormal[1]) / modelData.stdNormal[1]

		const newSample = [[nPitch, nRoll]];
		console.log("Predict data:", newSample)
		
		const threshold = 0.3;
		
		// const diff = newSample[0].map((val, index) => Math.abs(val - modelData.meanNormal[index]));
		// 计算先前和当前数据的差异
		const diffPitch = Math.abs(nPitch - nPrevPitch);
		const diffRoll = Math.abs(nRoll - nPrevRoll);

		console.log("Diff Pitch:", diffPitch);
		console.log("Diff Roll:", diffRoll);

		// 根据差异进行预测
		if (diffPitch > threshold || diffRoll > threshold) {
			console.log("异常数据");
		} else {
			console.log("正常数据");
		}

		// if(n)
		
		// if (diff.some(val => val > threshold)) {
		// 	console.log("异常数据");
		// } else {
		// 	console.log("正常数据");
		// }


		// await new Promise(resolve => setTimeout(resolve, 2000))
		// const pythonScript2 = spawn('python3', ['./ModelPrediction.py', JSON.stringify(modelData.InitSitData), JSON.stringify(newSample)]);

		// pass the data to python script for prediction
		// const pythonScript2 = await new Promise((resolve, reject) => {
		// 	const process = spawn('python3', ['./ModelPrediction.py', JSON.stringify(modelData), JSON.stringify(newSample)]);

		// 	// Handle process events
		// 	process.on('error', reject);
		// 	process.stdout.on('data', (data) => {
		// 		const predictions = JSON.parse(data)
		// 		// outPrediction += data.toString();
		// 		if (predictions == 1) {
		// 			console.log('Classification: Normal');
		// 		} else {
		// 			console.log('Classification: Abnormal');
		// 		}
		// 	});
		// 	process.on('close', code => {
		// 		if(code == 0) {
		// 			resolve(process);
		// 	 	} else {
		// 			reject(new Error('Python script exited with error'))
		// 		}
		// 	})
		// })
		// const prediction = JSON.parse(pythonScript2);
		// console.log("Prediction value:", prediction);
		// if (prediction == 1) {
		// 	console.log('Classification: Normal');
		// } else {
		// 	console.log('Classification: Abnormal');
		// }
		// pythonScript2.stdout.on('data', (data) => {
		// 	// process the output data from python script
		// 	const predictions = JSON.parse(data);
		// 	console.log("Prediction value:", predictions);
		// 	if (predictions == 1) {
		// 		console.log('Classification: Normal');
		// 	} else {
		// 		console.log('Classification: Abnormal');
		// 	}			
		// });

		// pythonScript2.stderr.on('data', (data) => {
		// 	console.error('An error occurred:', data.toString());
		// });

		nPitch = 0.0;
		nRoll = 0.0;

		return res.status(200).json({msg: "Success"});

		// res.status(200).json({ label: predictedLabel });
	} catch (error) {
		console.error('An error occurred:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	  }

})

app.get('/test', async (req, res) => {
	console.log("Testing...");
	const pythonScript = spawn('python3', ['./script.py']);
	let data1;
	// 处理 Python 脚本的输出
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

