const bcrypt = require("bcryptjs")

let user;

class User {
	static async injectDB(conn) {
		user = await conn.db("weposeAPI").collection("UserCredentials")
	}
	
	static async register(sample) {
		// Check if user's name exists
        const isExists = await user.findOne({ UserEmail: sample.UserEmail })
		if (isExists) {
			return { status: false, msg: "Email exists" }
		} else {
			// Hash the password
			const passwordHash = bcrypt.hashSync(sample.UserPassword, 10);
			// Confirm the password is correct
			const isMatch = await bcrypt.compare(sample.UserConfirmPassword, passwordHash)
			if (isMatch) {
				// Store the user info into database	
				await user.insertOne({
					UserName: sample.UserName,
					UserPassword: passwordHash,
					UserEmail: sample.UserEmail,
					role: "user"
				}).then (result => {
					console.log(result)
				})
				return { status: true, msg: "Success" }
			} else {
				return { status: false, msg: "Passwords do not match" }
			}	
		}
	}

	static async login(name, password) {
		// Check if user name exists
		const isExists = await user.findOne({ UserName: name })
		if (isExists) {
			// Compare the password while login
			const verified = await bcrypt.compare(password, isExists.UserPassword)
			if (verified) {
				return isExists
			}
			else {
				return { status: "Invalid password" }
			}
		}
		else {
			return { status: "Invalid username" }
		}
	}

	static async updateUserName(sample) {
		// Check if user exists
		const isExists = await user.findOne({ UserEmail: sample.UserEmail })
		if (isExists) {
			// Update the fields UserName
			console.log("Email match")
			await user.updateOne({
            	UserEmail: sample.UserEmail
            }, { 
				$set: {
					UserName: sample.UserName
				} 
			}).then (result => {
                console.log(result)
            }).catch((err) => {
                    console.log('Error: ' + err);
            })
			const data = await user.findOne({ UserEmail: sample.UserEmail })
			return data
		}
		else {
			console.log("Email not match")
			return { status: false }
		}
	}

	static async updateUserPassword(sample) {
		// Check if user exists
		const isExists = await user.findOne({ UserEmail: sample.UserEmail })
		if (isExists) {
			// Check if the old password is matched with the one saved in database
			const isOldPasswordMatch = await bcrypt.compare(sample.UserOldPassword, isExists.UserPassword)
			if (isOldPasswordMatch) {
				// Hash the new password
				const passwordHash = bcrypt.hashSync(sample.UserNewPassword, 10);
				// Check if the new password is matched with the confirm password
				const isNewPasswordMatch = await bcrypt.compare(sample.UserNewConfirmPassword, passwordHash) 
				if (isNewPasswordMatch) {
					await user.updateOne({
						UserEmail: sample.UserEmail
					}, { 
						$set: {
							UserPassword: passwordHash
						} 
					}).then (result => {
						console.log(result)
					}).catch((err) => {
							console.log('Error: ' + err);
						})
					return { status: true, msg: "Success" }

				} else {
					return { status: false, msg: "New password and confirm password do not match"}
				}
			} else {
				return { status: false, msg: "Incorrect old password" }
			}
		} else {
			return { status: false, msg: "Email is not exits" }
		}
	}

	static async delete(email) {
		const isExists = await user.findOne({ UserEmail: email })
		if (isExists) {
			await user.deleteOne({ UserEmail: email }).then (result => {
                console.log(result.deletedCount)
            })
            return { status: true, msg: "Deleted" }
		}
		return { status: false, msg: "Email is not exits" }
	}

	static async updateUserInitSitData(email, sample) {
		// Check if user exists
		const isExists = await user.findOne({ UserEmail: email })
		if (isExists) {
			// Update the field Init Sit Data
			console.log("Email match")
			await user.updateOne({
            	UserEmail: email
            }, { 
				$set: {
					InitSitData: sample
				} 
			}, { upsert: true }).then (result => {
                console.log(result)
            }).catch((err) => {
                    console.log('Error: ' + err);
            })
			const data = await user.findOne({ UserEmail: sample.UserEmail })
			return data
		}
		else {
			console.log("Email not match")
			return { status: false }
		}
	}

	static async updateUserMinMaxInitSitData(email, sample) {
		// Check if user exists
		const isExists = await user.findOne({ UserEmail: email })
		if (isExists) {
			// Update the field Init Sit Data
			console.log("Email match")
			await user.updateOne({
            	UserEmail: email
            }, { 
				$set: {
					meanNormal: sample.meanNormal,
					stdNormal: sample.stdNormal
					// min_valueP: sample.min_valueP,
					// max_valueP: sample.max_valueP,
					// min_valueR: sample.min_valueR,
					// max_valueR: sample.max_valueR
				} 
			}, { upsert: true }).then (result => {
                console.log(result)
            }).catch((err) => {
                    console.log('Error: ' + err);
            })
			const data = await user.findOne({ UserEmail: sample.UserEmail })
			return data
		}
		else {
			console.log("Email not match")
			return { status: false }
		}
	}

	static async getUserInitSitData(email) {
		// Check if user exists
		const isExists = await user.findOne({ UserEmail: email })
		if (isExists) {
			console.log("Email match")
			// const data = isExists.InitSitData
			// console.log(data)
			return isExists
		}
		else {
			console.log("Email not match")
			return { status: false }
		}
	}



}

module.exports = User;


