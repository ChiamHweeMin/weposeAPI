let date;

class Date {
	static async injectDB(conn) {
		date = await conn.db("weposeAPI").collection("DateUsage")
	}

	/**
	 * @remarks
	 * This method is not implemented yet. To register a new user, you need to call this method.
	 * 
	 * @param {*} email
	 */

	static async updateDateUsage(email, sample) {
		const isExists = await date.findOne({ UserEmail: email })
		if (isExists) { 
            const isMatch = await date.findOne({'DateUsage.date': sample.date})
            // if the date is exists, perform addition
            if (isMatch) {
                await date.updateOne(
                    { 'DateUsage.date': sample.date },
                    {
                        $inc: {
                            'DateUsage.$.ElapsedTime': sample.ElapsedTime,      //milliseconds
                            'DateUsage.$.SlouchCount': sample.SlouchCount
                        }
                    }
                ,{ upsert: true }).then (result => {
                    console.log(result)
                }).catch((err) => {
                        console.log('Error: ' + err);
                })
                return {status: 1}
            }

            // if the date is a new date, append the array
            else {
                await date.updateOne(
                    { UserEmail: email },
                    { $push: { DateUsage: sample } }
                );
                return { status: 2 };
            }
            
        // if the email is not exist in the collection, create a new one    
        } else {
            await date.insertOne({
                UserEmail: email,
                DateUsage: [sample]
            });
            return { status: 3 };
        }		
	}

	static async getDateUsage(email) {
		const isExists = await date.findOne({ UserEmail: email })
		if (isExists) {
			return isExists.DateUsage
		} else {
			return { status: false }
		}
	}
}

module.exports = Date;


