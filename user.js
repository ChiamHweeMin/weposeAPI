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
			return { data, status: true }
		}
		else {
			console.log("Email not match")
			return { status: false }
		}
	}

	static async delete(email, name) {
		const isExists = await visitors.findOne({ UserEmail: email, UserName: name })
		if (isExists) {
			await user.deleteOne({ UserEmail: email, UserName: name }).then (result => {
                console.log(result.deletedCount)
            })
            return { status: true, msg: "Deleted" }
		}
		return { status: false, msg: "Not Found" }
	}

	static async updateGeneralUser(sample) {
		// Check if user exists
		const isExists = await user.findOne({ UserName: sample.UserName })
		if (isExists) {
			// Update the fields except for UserName and UserPassword
			await user.updateOne({
            	UserName: sample.UserName
            }, { 
				$set: {
					UserEmail: sample.UserEmail
				} 
			}).then (result => {
                console.log(result)
            })
			return await user.findOne({ UserName: sample.UserName })
		}
		else {
			return { status: false }
		}
	}


}

module.exports = User;


