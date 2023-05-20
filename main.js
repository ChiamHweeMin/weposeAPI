require('dotenv').config();
const { MongoClient, ObjectId } = require("mongodb");
const User = require("./user");
const tf = require('@tensorflow/tfjs');
const { KNNClassifier } = require('@tensorflow-models/knn-classifier');


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

let dataIMU = {};
let inlierData = [];  // Variable to store the inlier data
let n = 0;
// Create a new KNN classifier
const classifier = new KNNClassifier();

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

// define POST route to receive data from arduino
app.post('/WEPOSE/SendDataIMU', async (req, res) => {
	console.log("Sending IMU data....");
	dataIMU = req.body; // get the data from the request body
	// console.log(dataIMU);
	res.status(200).json({msg:"Data received!"});
});
  
// define GET route to retrieve data
/*
{
    "accel_x": 0.49,
    "accel_y": 0.5,
    "accel_z": 0.52,
    "gyro_x": 0.36,
    "gyro_y": 0.46,
    "gyro_z": 0.5
}
*/
// app.get('/WEPOSE/SendDataIMU', async (req, res) => {
// 	if (dataIMU != null) {
// 	  console.log("Receiving IMU data.....");
// 	//   console.log(dataIMU);
// 	  return res.status(200).json({
// 		"success": true,
// 		"accel_x": dataIMU.accel_x,
// 		"accel_y": dataIMU.accel_y,
// 		"accel_z": dataIMU.accel_z,
// 		"gyro_x": dataIMU.gyro_x,
// 		"gyro_y": dataIMU.gyro_y,
// 		"gyro_z": dataIMU.gyro_z
// 	  })	
// 	} else {
// 	  res.status(404).json({msg: "The data has not been sent."});
// 	}
// });

app.get('/WEPOSE/SendDataIMU', async (req, res) => {
	if (dataIMU != null) {
	  console.log("Receiving IMU data.....");
	//   console.log(dataIMU);
	  return res.status(200).json({
		"success": true,
		"pitch": dataIMU.pitch,
		"roll": dataIMU.roll
	  })	
	} else {
	  res.status(404).json({msg: "The data has not been sent."});
	}
});

// Initialization step : Collect correct data for user for further classification
app.post('/WEPOSE/initSitPosture', async (req, res) => {
	try {
		inlierData = [];  // Clear previous inlier data
		console.log("Initialization:")




		while (n < 20) {
			const { pitch, roll } = req.body; // Get the data from the request body
			const dataPoint = { pitch, roll, label: "proper" }; // Label the data as "proper" posture
			const feature = tf.tensor1d([pitch, roll]);
			classifier.addExample(feature, dataPoint.label);
			n++; // Increment the counter
			await new Promise(resolve => setTimeout(resolve, 3000)); // Sleep for 1 second before collecting the next data point
		}


		// Get the new data point from the request body
		const { pitch, roll } = req.body;
		const feature = tf.tensor1d([pitch, roll]);

		// Perform classification
		if (classifier.getClassExampleCount() === 0) {
			throw new Error('You have not added any examples to the KNN classifier.');
		}
		const result = await classifier.predictClass(feature);

		// Get the predicted label
		const predictedLabel = result.label;

		res.status(200).json({ label: predictedLabel });
	} catch (error) {
		console.error('An error occurred:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	  }

})

// // Initialization step : Collect correct data for user for further classification
// app.post('WEPOSE/:UserEmail/initSitPosture', async (req, res) => {
// 	if (req.user.role == 'user') {
// 		inlierData = [];  // Clear previous inlier data
// 		console.log("Initialization:")
// 		// console.log(req.body);
// 		// dataIMU = req.body; // get the data from the request body
// 		// inlierData.push([dataIMU.accel_x, dataIMU.accel_y, dataIMU.accel_z, dataIMU.gyro_x, dataIMU.gyro_y, dataIMU.gyro_z]);
// 		// Start collecting inlier data for one minute
// 		// const startTime = Date.now();
// 		// while (Date.now() - startTime < 50000) {
// 		// 	const { pitch, roll } = req.body;  // Get the data from the request body
// 		// 	const dataPoint = { pitch, roll }; // Label the data as "proper" posture
// 		// 	inlierData.push(dataPoint);
// 		// 	await new Promise(resolve => setTimeout(resolve, 1000));  // Sleep for 1 second before collecting the next data point
// 		// }


// 		// const features = inlierData.map(data => [data.pitch, data.roll]);


// 		// // Normalize the features
// 		// const scaler = new StandardScaler();
// 		// const normalizedFeatures = scaler.fitTransform(features);

// 		// // Train the OC-SVM model using normalized features
// 		// const model = new OneClassSVM({ nu: 0.1 }); // Adjust nu parameter as needed
// 		// model.fit(normalizedFeatures);
// 		// console.log(model)


// 		// // Serialize the trained model
// 		// const serializedModel = JSON.stringify(model);
// 		// console.log(serializedModel)

// 		// // Create a new model instance
// 		// const modelInstance = new Model({
// 		// 	name: 'Trained Model',
// 		// 	serializedModel: serializedModel
// 		// });

// 		// Create a new KNN classifier
// 		const classifier = knnClassifier.create();

// 		// Collect inlier data for one minute
// 		const startTime = Date.now();
// 		while (Date.now() - startTime < 60000) {
// 			const { pitch, roll } = req.body; // Get the data from the request body
// 			const dataPoint = { pitch, roll, label: "straight" }; // Label the data as "proper" posture
// 			const feature = tf.tensor1d([pitch, roll]);
// 			classifier.addExample(feature, dataPoint.label);
// 			await new Promise(resolve => setTimeout(resolve, 1000)); // Sleep for 1 second before collecting the next data point
// 		}

// 		// Serialize the trained model
// 		const serializedModel = JSON.stringify(classifier);
// 		console.log(serializedModel)

// 		// Create a new model instance
// 		const modelInstance = new Model({
// 			name: 'Trained Model',
// 			serializedModel: serializedModel
// 		});



// 		// Save the trained model
// 		// console.log('Model saved:', modelSaveResult);
// 		const user = await User.updateUserInitSitData(req.params.UserEmail, modelInstance);

// 		res.status(200).json({ msg: "Initialization complete. Model trained." });
// 		// schemaData = {
// 		// 	"accel_x": dataIMU.accel_x,
// 		// 	"accel_y": dataIMU.accel_y,
// 		// 	"accel_z": dataIMU.accel_z,
// 		// 	"gyro_x": dataIMU.gyro_x,
// 		// 	"gyro_y": dataIMU.gyro_y,
// 		// 	"gyro_z": dataIMU.gyro_z
// 		// }

// 		// const user = await User.updateUserInitSitData(req.params.UserEmail, schemaData);
// 		if (user.status == false) {
// 			return res.status(404).json({
// 				success: false,
// 				msg: "Email is not exits!"})
// 		}
// 		if (user.status == true ) {
// 			return res.status(200).json({
// 				success: true,
// 				msg: "The account is deleted!"})
// 		}
// 	} else {
// 		return res.status(403).json({
// 			success: false,
// 			msg: 'Unauthorized'})
// 	}

// })

// // Classification step : User can do classification based on the correct sitting data collected before
// app.post('WEPOSE/:UserEmail/classifySitPosture', async (req, res) => {


// })

app.get('/test', async (req, res) => {
	console.log("Testing...");
	return res.status(200).send("Hello World");
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

